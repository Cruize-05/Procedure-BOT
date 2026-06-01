import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../components/ChatMessage';

const ts = new Date('2024-06-01T10:30:00').getTime();

const userMsg     = { id: '1', role: 'user',      text: 'Hello there',           timestamp: ts, streaming: false };
const botMsg      = { id: '2', role: 'assistant',  text: 'Hello! How can I help?', timestamp: ts, streaming: false };
const streamingMsg = { id: '3', role: 'assistant', text: 'Typing…',               timestamp: ts, streaming: true  };

describe('ChatMessage', () => {
  it('renders user message text', () => {
    render(<ChatMessage message={userMsg} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('renders assistant message text', () => {
    render(<ChatMessage message={botMsg} />);
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    render(<ChatMessage message={userMsg} />);
    expect(screen.getByTestId('chat-message')).toHaveClass('justify-end');
  });

  it('aligns assistant messages to the left', () => {
    render(<ChatMessage message={botMsg} />);
    expect(screen.getByTestId('chat-message')).toHaveClass('justify-start');
  });

  it('sets data-role attribute correctly', () => {
    const { rerender } = render(<ChatMessage message={userMsg} />);
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-role', 'user');
    rerender(<ChatMessage message={botMsg} />);
    expect(screen.getByTestId('chat-message')).toHaveAttribute('data-role', 'assistant');
  });

  it('shows three bouncing dots when streaming', () => {
    const { container } = render(<ChatMessage message={streamingMsg} />);
    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(3);
  });

  it('hides bouncing dots when not streaming', () => {
    const { container } = render(<ChatMessage message={botMsg} />);
    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(0);
  });

  it('applies green bubble style to user messages', () => {
    const { container } = render(<ChatMessage message={userMsg} />);
    expect(container.querySelector('.bg-wa-bubble-user')).toBeInTheDocument();
  });

  it('applies white bubble style to assistant messages', () => {
    const { container } = render(<ChatMessage message={botMsg} />);
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
  });
});
