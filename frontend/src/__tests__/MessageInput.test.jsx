import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageInput } from '../components/MessageInput';

describe('MessageInput', () => {
  it('renders textarea and send button', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={false} language="en" />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('shows English placeholder by default', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={false} language="en" />);
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });

  it('shows French placeholder when language is fr', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={false} language="fr" />);
    expect(screen.getByPlaceholderText('Écrire un message…')).toBeInTheDocument();
  });

  it('calls onSend with trimmed text on send button click', () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isStreaming={false} language="en" />);
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: '  Hello  ' } });
    fireEvent.click(screen.getByTestId('send-button'));
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('calls onSend on Enter key (without Shift)', () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isStreaming={false} language="en" />);
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Test message' } });
    fireEvent.keyDown(screen.getByTestId('message-input'), { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does NOT call onSend on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isStreaming={false} language="en" />);
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Multi\nline' } });
    fireEvent.keyDown(screen.getByTestId('message-input'), { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables textarea and send button while streaming', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={true} language="en" />);
    expect(screen.getByTestId('message-input')).toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('clears the input after a successful send', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={false} language="en" />);
    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByTestId('send-button'));
    expect(input.value).toBe('');
  });

  it('does not call onSend when input is whitespace only', () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isStreaming={false} language="en" />);
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('send-button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('send button is disabled when input is empty', () => {
    render(<MessageInput onSend={vi.fn()} isStreaming={false} language="en" />);
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });
});
