/**
 * E2E integration tests — ProcedureBot CM
 *
 * Strategy:
 *  - API endpoints (/api/chat-stream, /api/export-checklist) are intercepted
 *    via page.route() so the tests run without real API keys or a live database.
 *  - The first suite uses CDP to simulate Slow 3G (400ms RTT, 400kbps down)
 *    and asserts that FCP and element visibility stay within budget.
 *  - Streaming is verified by checking that the bouncing-dot indicator appears
 *    and then resolves to text content.
 */

import { test, expect } from '@playwright/test';

// ── Mock payloads ────────────────────────────────────────────────────────────

/** SSE body delivered as a single buffer (Playwright route.fulfill limitation). */
const MOCK_STREAM_EN =
  'data: {"text":"This procedure allows you to obtain a National ID Card."}\n\n' +
  'data: {"text":" Official cost: 2,500 CFA."}\n\n' +
  'data: {"text":" Estimated timeline: 2-4 weeks."}\n\n' +
  'data: [DONE]\n\n';

const MOCK_STREAM_FR =
  'data: {"text":"Cette procédure vous permet d\'obtenir une Carte Nationale d\'Identité."}\n\n' +
  'data: {"text":" Coût officiel : 2 500 FCFA."}\n\n' +
  'data: {"text":" Délai estimé : 2-4 semaines."}\n\n' +
  'data: [DONE]\n\n';

// Minimal valid PDF header bytes
const FAKE_PDF = Buffer.from('%PDF-1.4 1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj');

// ── Shared route helpers ─────────────────────────────────────────────────────

async function mockStreamRoute(page, body = MOCK_STREAM_EN) {
  await page.route('**/api/chat-stream', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body,
    })
  );
}

async function mockPdfRoute(page) {
  await page.route('**/api/export-checklist', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=checklist.pdf',
      },
      body: FAKE_PDF,
    })
  );
}

// ── Suite 1: Slow 3G load performance ────────────────────────────────────────

test.describe('Slow 3G — FCP and initial render budget', () => {
  test('First Contentful Paint is within 12 s on Slow 3G (400 ms RTT, 400 kbps)', async ({
    page,
  }) => {
    await mockStreamRoute(page);
    await mockPdfRoute(page);

    // Apply Slow 3G via Chrome DevTools Protocol
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      // 400 kbps download → 50,000 bytes/s
      downloadThroughput: (400 * 1024) / 8,
      // 100 kbps upload
      uploadThroughput: (100 * 1024) / 8,
      latency: 400, // 400 ms round-trip
    });

    const navStart = Date.now();
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-window"]', { timeout: 20_000 });
    const ttElement = Date.now() - navStart;

    // Time-to-element must be under 12 s even on Slow 3G
    expect(ttElement).toBeLessThan(12_000);

    // Read First Contentful Paint from the browser's Performance API
    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const entry = entries.find((e) => e.name === 'first-contentful-paint');
      return entry ? entry.startTime : null;
    });

    if (fcp !== null) {
      // FCP should be under 12 s on simulated Slow 3G
      expect(fcp).toBeLessThan(12_000);
    }

    // Welcome message must be visible
    await expect(
      page.locator('[data-testid="chat-message"]').first()
    ).toBeVisible();
  });

  test('Welcome message renders without a procedure being selected', async ({ page }) => {
    await mockStreamRoute(page);
    await mockPdfRoute(page);

    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-window"]');

    await expect(
      page.locator('[data-testid="chat-message"]').first()
    ).toContainText('ProcedureBot CM');
  });
});

// ── Suite 2: Procedure selection triggers auto-streaming briefing ─────────────

test.describe('Procedure selection — auto-briefing stream', () => {
  test.beforeEach(async ({ page }) => {
    await mockStreamRoute(page);
    await mockPdfRoute(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-header"]');
  });

  test('selecting a procedure shows the streaming indicator then resolves to text', async ({
    page,
  }) => {
    await page.getByRole('combobox').selectOption('NID');

    // Streaming dot indicator should appear while the SSE response arrives
    await expect(page.getByLabel('loading')).toBeVisible({ timeout: 4_000 });

    // After stream completes, text from the mock SSE payload must be visible
    await expect(
      page.locator('[data-testid="chat-message"]').last()
    ).toContainText('National ID Card', { timeout: 6_000 });
  });

  test('streaming indicator disappears once all tokens are received', async ({ page }) => {
    await page.getByRole('combobox').selectOption('NID');
    await page.waitForSelector('[aria-label="loading"]', { state: 'visible', timeout: 4_000 });
    await page.waitForSelector('[aria-label="loading"]', { state: 'detached', timeout: 8_000 });

    // No loading spinner should remain
    await expect(page.getByLabel('loading')).toHaveCount(0);
  });

  test('multiple text tokens render steadily and accumulate in the bot bubble', async ({
    page,
  }) => {
    await page.getByRole('combobox').selectOption('NID');

    // Wait for complete response
    await page.waitForSelector('[aria-label="loading"]', { state: 'detached', timeout: 8_000 });

    const lastMsg = page.locator('[data-testid="chat-message"]').last();
    // All three token chunks from MOCK_STREAM_EN should be present
    await expect(lastMsg).toContainText('National ID Card');
    await expect(lastMsg).toContainText('2,500 CFA');
    await expect(lastMsg).toContainText('2-4 weeks');
  });

  test('PDF download button appears after a procedure is selected', async ({ page }) => {
    await expect(page.getByTestId('download-pdf-button')).not.toBeVisible();

    await page.getByRole('combobox').selectOption('NID');

    await expect(page.getByTestId('download-pdf-button')).toBeVisible({ timeout: 3_000 });
  });
});

// ── Suite 3: User follow-up messages ─────────────────────────────────────────

test.describe('User follow-up messages after briefing', () => {
  test.beforeEach(async ({ page }) => {
    await mockStreamRoute(page);
    await mockPdfRoute(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-header"]');
    // Select procedure and wait for briefing to finish
    await page.getByRole('combobox').selectOption('NID');
    await page.waitForSelector('[aria-label="loading"]', { state: 'detached', timeout: 8_000 });
  });

  test('user message appears on the right side of the chat', async ({ page }) => {
    await page.getByTestId('message-input').fill('What documents do I need?');
    await page.getByTestId('send-button').click();

    await expect(
      page.locator('[data-testid="chat-message"][data-role="user"]').last()
    ).toContainText('What documents do I need?');
  });

  test('bot responds to a follow-up with streamed text', async ({ page }) => {
    await page.getByTestId('message-input').fill('What is the cost?');
    await page.getByTestId('send-button').click();

    // Streaming indicator for follow-up response
    await expect(page.getByLabel('loading')).toBeVisible({ timeout: 4_000 });
    await page.waitForSelector('[aria-label="loading"]', { state: 'detached', timeout: 8_000 });

    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').last()
    ).toContainText('2,500 CFA');
  });

  test('send button is disabled while the bot is streaming', async ({ page }) => {
    // Temporarily intercept to slow the response
    await page.route('**/api/chat-stream', async (route) => {
      await new Promise((r) => setTimeout(r, 200));
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: MOCK_STREAM_EN,
      });
    });

    await page.getByTestId('message-input').fill('Hello');
    await page.getByTestId('send-button').click();

    await expect(page.getByTestId('send-button')).toBeDisabled();
  });
});

// ── Suite 4: PDF checklist download ──────────────────────────────────────────

test.describe('PDF checklist download', () => {
  test.beforeEach(async ({ page }) => {
    await mockStreamRoute(page);
    await mockPdfRoute(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-header"]');
    await page.getByRole('combobox').selectOption('NID');
    await page.waitForSelector('[data-testid="download-pdf-button"]', { timeout: 4_000 });
  });

  test('clicking the download button triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 6_000 }),
      page.getByTestId('download-pdf-button').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/checklist.*\.pdf$/i);
  });

  test('downloaded file starts with PDF magic bytes', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 6_000 }),
      page.getByTestId('download-pdf-button').click(),
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const firstBytes = Buffer.concat(chunks).slice(0, 4).toString();
    expect(firstBytes).toBe('%PDF');
  });
});

// ── Suite 5: Error handling — bilingual callouts ──────────────────────────────

test.describe('Error handling — bilingual callouts in the message tray', () => {
  test.beforeEach(async ({ page }) => {
    await mockPdfRoute(page);
  });

  test('shows English rate-limit warning (⚠️) when API returns 429', async ({ page }) => {
    await page.route('**/api/chat-stream', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Rate limit exceeded.' }),
      })
    );

    await page.goto('/');
    await page.getByRole('combobox').selectOption('NID');

    await expect(
      page.locator('[data-testid="chat-message"][data-role="error"]')
    ).toContainText('⚠️', { timeout: 5_000 });

    await expect(
      page.locator('[data-testid="chat-message"][data-role="error"]')
    ).toContainText('request limit');
  });

  test('shows French rate-limit warning after language is toggled to FR', async ({ page }) => {
    await page.route('**/api/chat-stream', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Rate limit exceeded.' }),
      })
    );

    await page.goto('/');
    await page.getByTestId('language-toggle').click(); // switch to FR
    await page.getByRole('combobox').selectOption('NID');

    await expect(
      page.locator('[data-testid="chat-message"][data-role="error"]')
    ).toContainText('limite de requêtes', { timeout: 5_000 });
  });

  test('shows AI service error when Gemini returns an error chunk in the SSE stream', async ({
    page,
  }) => {
    const streamWithError =
      'data: {"text":"Partial answer"}\n\n' +
      'data: {"error":"Gemini quota exceeded"}\n\n' +
      'data: [DONE]\n\n';

    await page.route('**/api/chat-stream', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: streamWithError,
      })
    );

    await page.goto('/');
    await page.getByRole('combobox').selectOption('NID');

    await expect(
      page.locator('[data-testid="chat-message"][data-role="error"]')
    ).toContainText('⚠️', { timeout: 5_000 });
  });
});

// ── Suite 6: Language toggle resets conversation ──────────────────────────────

test.describe('Language toggle', () => {
  test.beforeEach(async ({ page }) => {
    await mockStreamRoute(page, MOCK_STREAM_FR);
    await mockPdfRoute(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="language-toggle"]');
  });

  test('toggling to FR shows French welcome message', async ({ page }) => {
    await page.getByTestId('language-toggle').click();

    await expect(
      page.locator('[data-testid="chat-message"]').first()
    ).toContainText('Bonjour');
  });

  test('toggle button label flips between FR and EN', async ({ page }) => {
    expect(await page.getByTestId('language-toggle').textContent()).toBe('FR');
    await page.getByTestId('language-toggle').click();
    expect(await page.getByTestId('language-toggle').textContent()).toBe('EN');
    await page.getByTestId('language-toggle').click();
    expect(await page.getByTestId('language-toggle').textContent()).toBe('FR');
  });

  test('toggling language resets procedure selection and hides download button', async ({
    page,
  }) => {
    // First, set a procedure in English
    await mockStreamRoute(page, MOCK_STREAM_EN);
    await page.getByRole('combobox').selectOption('NID');
    await page.waitForSelector('[data-testid="download-pdf-button"]', { timeout: 4_000 });

    // Toggle to French — conversation resets
    await page.getByTestId('language-toggle').click();

    // Download button should be gone (no procedure selected)
    await expect(page.getByTestId('download-pdf-button')).not.toBeVisible();
  });
});
