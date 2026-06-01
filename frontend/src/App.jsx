import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { useSSEStream } from './hooks/useSSEStream';
import { WELCOME_MESSAGES } from './constants/procedures';

let _id = 0;
const nextId = () => `msg-${++_id}`;

function makeWelcome(lang) {
  return {
    id: nextId(),
    role: 'assistant',
    text: WELCOME_MESSAGES[lang],
    timestamp: Date.now(),
    streaming: false,
  };
}

export default function App() {
  const [language, setLanguage] = useState('en');
  const [procedure, setProcedure] = useState('');
  const [messages, setMessages] = useState(() => [makeWelcome('en')]);
  const { stream, isStreaming } = useSSEStream();

  function handleLanguageChange(lang) {
    setLanguage(lang);
    setProcedure('');
    setMessages([makeWelcome(lang)]);
  }

  const handleSend = useCallback(
    async (text) => {
      const userMsg = {
        id: nextId(),
        role: 'user',
        text,
        timestamp: Date.now(),
        streaming: false,
      };

      const botId = nextId();
      const botMsg = {
        id: botId,
        role: 'assistant',
        text: '',
        timestamp: Date.now(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);

      await stream({
        procedureCode: procedure,
        language,
        message: text,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: m.text + token } : m))
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
          );
        },
        onError: () => {
          const errText =
            language === 'fr'
              ? "Une erreur s'est produite. Veuillez réessayer."
              : 'An error occurred. Please try again.';
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: errText, streaming: false } : m))
          );
        },
      });
    },
    [procedure, language, stream]
  );

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-wa-bg overflow-hidden">
      <Header
        procedure={procedure}
        onProcedureChange={setProcedure}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
      <ChatWindow messages={messages} />
      <MessageInput onSend={handleSend} isStreaming={isStreaming} language={language} />
    </div>
  );
}
