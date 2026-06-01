import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../lib/utils';

const PLACEHOLDER = {
  en: 'Type a message…',
  fr: 'Écrire un message…',
};

export function MessageInput({ onSend, isStreaming, language }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-wa-input border-t border-gray-200 flex-shrink-0">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER[language] ?? PLACEHOLDER.en}
        disabled={isStreaming}
        aria-label={PLACEHOLDER[language] ?? PLACEHOLDER.en}
        data-testid="message-input"
        className={cn(
          'flex-1 resize-none rounded-2xl bg-white px-4 py-2.5 text-sm text-gray-900',
          'placeholder:text-gray-400 border border-gray-200',
          'focus:outline-none focus:ring-2 focus:ring-wa-green/40',
          'disabled:opacity-60 max-h-[120px] overflow-y-auto leading-relaxed'
        )}
      />
      <button
        onClick={submit}
        disabled={!text.trim() || isStreaming}
        data-testid="send-button"
        aria-label="Send message"
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          'bg-wa-green text-white shadow-md',
          'transition-all duration-150 active:scale-90',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
