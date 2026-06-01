import React from 'react';
import { useChatScroll } from '../hooks/useChatScroll';
import { ChatMessage } from './ChatMessage';

export function ChatWindow({ messages }) {
  const scrollRef = useChatScroll([messages]);

  return (
    <div
      ref={scrollRef}
      data-testid="chat-window"
      className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b2bec3' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
}
