import React from 'react';
import { cn } from '../lib/utils';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      data-testid="chat-message"
      data-role={message.role}
      className={cn('flex w-full mb-1', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'relative max-w-[75%] rounded-lg px-3 py-2 shadow-sm',
          isUser ? 'bg-wa-bubble-user rounded-tr-none' : 'bg-white rounded-tl-none'
        )}
      >
        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
          {message.text}
          {message.streaming && (
            <span className="inline-flex ml-1 gap-0.5 align-middle" aria-label="loading">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </p>
        <p className="text-[10px] text-gray-400 text-right mt-0.5 select-none">
          {formatTime(message.timestamp)}
          {isUser && <span className="ml-1 text-wa-green">✓✓</span>}
        </p>
      </div>
    </div>
  );
}
