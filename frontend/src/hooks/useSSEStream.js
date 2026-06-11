import { useState, useRef, useCallback } from 'react';

export function useSSEStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const stream = useCallback(async ({ procedureCode, language, message, onToken, onDone, onError }) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedure_code: procedureCode, language, message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let type = 'http';
        if (response.status === 429) type = 'rate_limit';
        else if (response.status === 404) type = 'not_found';
        else if (response.status >= 500) type = 'server';
        onError?.({ type, status: response.status });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamErrored = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.text) onToken(parsed.text);
              else if (parsed.error) {
                streamErrored = true;
                onError?.({ type: 'stream', message: parsed.error });
              }
            } catch {
              // malformed SSE chunk — skip
            }
          }
        }
      }
      if (!streamErrored) onDone?.();
    } catch (err) {
      if (err.name !== 'AbortError') onError?.({ type: 'network', message: err.message });
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { stream, abort, isStreaming };
}
