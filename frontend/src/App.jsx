import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { useSSEStream } from './hooks/useSSEStream';
import { useChecklistDownload } from './hooks/useChecklistDownload';
import { WELCOME_MESSAGES } from './constants/procedures';

let _id = 0;
const nextId = () => `msg-${++_id}`;

const BRIEFING_PROMPT = {
  en: 'Please give me a brief overview of this procedure, including the official costs, estimated timeline, and list of required documents.',
  fr: 'Veuillez me donner un bref aperçu de cette procédure, y compris les coûts officiels, le délai estimé et la liste des documents requis.',
};

const ERROR_MESSAGES = {
  rate_limit: {
    en: '⚠️ You have reached the request limit. Please wait a minute before trying again.',
    fr: '⚠️ Vous avez atteint la limite de requêtes. Veuillez attendre une minute avant de réessayer.',
  },
  not_found: {
    en: '⚠️ Procedure not found. Please select a valid procedure from the dropdown.',
    fr: '⚠️ Procédure introuvable. Veuillez sélectionner une procédure valide dans le menu.',
  },
  server: {
    en: '⚠️ A server error occurred. Please try again shortly.',
    fr: "⚠️ Une erreur serveur s'est produite. Veuillez réessayer dans un moment.",
  },
  stream: {
    en: '⚠️ The AI service encountered an error. Please try again.',
    fr: '⚠️ Le service IA a rencontré une erreur. Veuillez réessayer.',
  },
  network: {
    en: '⚠️ Network connection error. Please check your connection and try again.',
    fr: '⚠️ Erreur de connexion réseau. Vérifiez votre connexion et réessayez.',
  },
  generic: {
    en: '⚠️ An error occurred. Please try again.',
    fr: "⚠️ Une erreur s'est produite. Veuillez réessayer.",
  },
};

function makeWelcome(lang) {
  return {
    id: nextId(),
    role: 'assistant',
    text: WELCOME_MESSAGES[lang],
    timestamp: Date.now(),
    streaming: false,
  };
}

function getErrorText(err, lang) {
  const key = err?.type && ERROR_MESSAGES[err.type] ? err.type : 'generic';
  return ERROR_MESSAGES[key][lang] ?? ERROR_MESSAGES[key].en;
}

export default function App() {
  const [language, setLanguage] = useState('en');
  const [procedure, setProcedure] = useState('');
  const [messages, setMessages] = useState(() => [makeWelcome('en')]);
  const { stream, abort, isStreaming } = useSSEStream();
  const { download, isDownloading } = useChecklistDownload();

  // Track which procedure has already been auto-briefed to prevent double-fire
  const briefedRef = useRef('');
  // Capture latest language in a ref so the auto-brief effect always has the right value
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);

  function handleLanguageChange(lang) {
    setLanguage(lang);
    setProcedure('');
    briefedRef.current = '';
    abort();
    setMessages([makeWelcome(lang)]);
  }

  // Auto-trigger briefing when a procedure is selected
  useEffect(() => {
    if (!procedure || procedure === briefedRef.current) return;
    briefedRef.current = procedure;

    const lang = languageRef.current;
    const introText = BRIEFING_PROMPT[lang] ?? BRIEFING_PROMPT.en;
    const botId = nextId();

    setMessages([
      makeWelcome(lang),
      { id: botId, role: 'assistant', text: '', timestamp: Date.now(), streaming: true },
    ]);

    stream({
      procedureCode: procedure,
      language: lang,
      message: introText,
      onToken: (token) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, text: m.text + token } : m))
        ),
      onDone: () =>
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
        ),
      onError: (err) => {
        const errText = getErrorText(err, lang);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: errText, streaming: false, isError: true } : m
          )
        );
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedure]);

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
        onToken: (token) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: m.text + token } : m))
          ),
        onDone: () =>
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
          ),
        onError: (err) => {
          const errText = getErrorText(err, language);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId ? { ...m, text: errText, streaming: false, isError: true } : m
            )
          );
        },
      });
    },
    [procedure, language, stream]
  );

  function handleDownload() {
    download({ procedureCode: procedure, language });
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-wa-bg overflow-hidden">
      <Header
        procedure={procedure}
        onProcedureChange={setProcedure}
        language={language}
        onLanguageChange={handleLanguageChange}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />
      <ChatWindow messages={messages} />
      <MessageInput onSend={handleSend} isStreaming={isStreaming} language={language} />
    </div>
  );
}
