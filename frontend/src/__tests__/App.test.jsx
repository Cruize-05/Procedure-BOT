import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Controllable stream mock — tests can override `streamImpl` per test
let streamImpl = vi.fn();
let abortImpl = vi.fn();

vi.mock('../hooks/useSSEStream', () => ({
  useSSEStream: () => ({
    stream: (...args) => streamImpl(...args),
    abort: (...args) => abortImpl(...args),
    isStreaming: false,
  }),
}));

vi.mock('../hooks/useChecklistDownload', () => ({
  useChecklistDownload: () => ({
    download: vi.fn(),
    isDownloading: false,
  }),
}));

describe('App', () => {
  beforeEach(() => {
    streamImpl = vi.fn();
    abortImpl = vi.fn();
    vi.clearAllMocks();
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('renders header, chat window, and message input', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows English welcome message by default', () => {
    render(<App />);
    expect(screen.getByText(/Hello!.*ProcedureBot CM/)).toBeInTheDocument();
  });

  it('language toggle switches UI to French and resets chat', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('language-toggle'));
    await waitFor(() => {
      expect(screen.getByText(/Bonjour !.*ProcedureBot CM/)).toBeInTheDocument();
    });
  });

  it('language toggle button label flips between FR and EN', () => {
    render(<App />);
    const toggle = screen.getByTestId('language-toggle');
    expect(toggle).toHaveTextContent('FR');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('EN');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('FR');
  });

  it('messages array grows when a user message is sent', async () => {
    render(<App />);

    // Start with 1 message (welcome)
    expect(screen.getAllByTestId('chat-message')).toHaveLength(1);

    fireEvent.change(screen.getByTestId('message-input'), {
      target: { value: 'How do I get a passport?' },
    });
    fireEvent.click(screen.getByTestId('send-button'));

    // Now there should be at least 2: welcome + user + bot skeleton
    await waitFor(() => {
      expect(screen.getAllByTestId('chat-message').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('auto-briefing stream is triggered when a procedure is selected', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NID' } });
    });

    await waitFor(() => {
      expect(streamImpl).toHaveBeenCalledWith(
        expect.objectContaining({
          procedureCode: 'NID',
          language: 'en',
          message: expect.stringMatching(/brief overview|costs|timeline/i),
        })
      );
    });
  });

  it('auto-briefing adds a bot placeholder message immediately', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PASSPORT' } });
    });

    // welcome + bot skeleton = 2 messages
    await waitFor(() => {
      expect(screen.getAllByTestId('chat-message').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('auto-briefing is NOT triggered when procedure is reset to empty', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NID' } });
    });
    const callCount = streamImpl.mock.calls.length;

    // Simulate language toggle which resets procedure to ''
    await act(async () => {
      fireEvent.click(screen.getByTestId('language-toggle'));
    });

    // No additional stream call should be made when procedure becomes ''
    expect(streamImpl.mock.calls.length).toBe(callCount);
  });

  it('error callout (isError) shown when stream returns rate-limit error', async () => {
    streamImpl = vi.fn().mockImplementation(({ onError }) => {
      onError?.({ type: 'rate_limit', status: 429 });
    });

    render(<App />);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NID' } });
    });

    await waitFor(() => {
      expect(
        screen.getAllByTestId('chat-message').some(
          (el) => el.getAttribute('data-role') === 'error'
        )
      ).toBe(true);
    });
  });

  it('error callout text contains bilingual warning for 429', async () => {
    streamImpl = vi.fn().mockImplementation(({ onError }) => {
      onError?.({ type: 'rate_limit', status: 429 });
    });

    render(<App />);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NID' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/request limit/i)).toBeInTheDocument();
    });
  });

  it('French error callout shown when language is FR and rate-limited', async () => {
    streamImpl = vi.fn().mockImplementation(({ onError }) => {
      onError?.({ type: 'rate_limit', status: 429 });
    });

    render(<App />);

    // Switch to French first
    await act(async () => {
      fireEvent.click(screen.getByTestId('language-toggle'));
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NID' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/limite de requêtes/i)).toBeInTheDocument();
    });
  });

  it('send-button sends user message with streaming flag', async () => {
    streamImpl = vi.fn().mockImplementation(({ onToken, onDone }) => {
      onToken('Hello response');
      onDone();
    });

    render(<App />);

    fireEvent.change(screen.getByTestId('message-input'), {
      target: { value: 'What documents?' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('What documents?')).toBeInTheDocument();
      expect(screen.getByText('Hello response')).toBeInTheDocument();
    });
  });
});
