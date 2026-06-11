import { useState, useCallback } from 'react';

export function useChecklistDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async ({ procedureCode, language }) => {
    if (!procedureCode) return;
    setIsDownloading(true);
    try {
      const res = await fetch('/api/export-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedure_code: procedureCode, language }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-${procedureCode.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}
