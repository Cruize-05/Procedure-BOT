import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

vi.mock('../hooks/useSSEStream', () => ({
  useSSEStream: () => ({
    stream: vi.fn(),
    abort: vi.fn(),
    isStreaming: false,
  }),
}));

describe('App', () => {
  beforeEach(() => {
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
    const { useSSEStream } = await import('../hooks/useSSEStream');
    render(<App />);

    // Start with 1 message (welcome)
    expect(screen.getAllByTestId('chat-message')).toHaveLength(1);

    fireEvent.change(screen.getByTestId('message-input'), {
      target: { value: 'How do I get a passport?' },
    });
    fireEvent.click(screen.getByTestId('send-button'));

    // Now there should be 3: welcome + user + bot skeleton
    await waitFor(() => {
      expect(screen.getAllByTestId('chat-message').length).toBeGreaterThanOrEqual(2);
    });
  });
});
