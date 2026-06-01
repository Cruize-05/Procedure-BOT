import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatWindow } from '../components/ChatWindow';

beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});

const makeMsg = (id, role, text) => ({
  id,
  role,
  text,
  timestamp: Date.now(),
  streaming: false,
});

describe('ChatWindow', () => {
  it('renders without crashing when messages is empty', () => {
    render(<ChatWindow messages={[]} />);
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  it('renders the correct number of message bubbles', () => {
    const messages = [
      makeMsg('1', 'assistant', 'Welcome!'),
      makeMsg('2', 'user', 'Hello'),
      makeMsg('3', 'assistant', 'How can I help?'),
    ];
    render(<ChatWindow messages={messages} />);
    expect(screen.getAllByTestId('chat-message')).toHaveLength(3);
  });

  it('scrolls to bottom when messages array changes', () => {
    const { rerender } = render(<ChatWindow messages={[makeMsg('1', 'assistant', 'Hi')]} />);
    const window = screen.getByTestId('chat-window');
    const spy = vi.spyOn(window, 'scrollTo');

    rerender(
      <ChatWindow
        messages={[makeMsg('1', 'assistant', 'Hi'), makeMsg('2', 'user', 'Hey there')]}
      />
    );

    expect(spy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' });
  });

  it('renders messages in DOM order (oldest first)', () => {
    const messages = [
      makeMsg('1', 'assistant', 'First message'),
      makeMsg('2', 'user', 'Second message'),
    ];
    render(<ChatWindow messages={messages} />);
    const bubbles = screen.getAllByTestId('chat-message');
    expect(bubbles[0]).toHaveAttribute('data-role', 'assistant');
    expect(bubbles[1]).toHaveAttribute('data-role', 'user');
  });
});
