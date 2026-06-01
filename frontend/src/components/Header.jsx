import React from 'react';
import { Select } from './ui/Select';
import { PROCEDURES } from '../constants/procedures';

const DOWNLOAD_LABEL = {
  en: 'Download Checklist PDF',
  fr: 'Télécharger la liste PDF',
};

export function Header({
  procedure,
  onProcedureChange,
  language,
  onLanguageChange,
  onDownload,
  isDownloading = false,
}) {
  const options = PROCEDURES.map((p) => ({
    value: p.code,
    label: language === 'fr' ? p.fr : p.en,
  }));

  const placeholder =
    language === 'fr' ? '— Choisir une procédure —' : '— Choose a procedure —';

  const selectLabel =
    language === 'fr' ? 'Sélectionner une procédure' : 'Select a procedure';

  const downloadLabel = DOWNLOAD_LABEL[language] ?? DOWNLOAD_LABEL.en;

  return (
    <header
      data-testid="app-header"
      className="flex items-center gap-3 px-3 py-3 bg-wa-dark shadow-md z-10 flex-shrink-0"
    >
      {/* Bot avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
        <span className="text-white text-base" role="img" aria-label="bot">
          🤖
        </span>
      </div>

      {/* Title + procedure selector */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-none mb-1">ProcedureBot CM</p>
        <Select
          label={selectLabel}
          value={procedure}
          onChange={onProcedureChange}
          options={options}
          placeholder={placeholder}
          data-testid="procedure-selector"
        />
      </div>

      {/* PDF download button — only visible when a procedure is selected */}
      {procedure && (
        <button
          onClick={onDownload}
          disabled={isDownloading}
          data-testid="download-pdf-button"
          aria-label={downloadLabel}
          title={downloadLabel}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </button>
      )}

      {/* Language toggle */}
      <button
        onClick={() => onLanguageChange(language === 'en' ? 'fr' : 'en')}
        data-testid="language-toggle"
        aria-label="Toggle language"
        className="flex-shrink-0 px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
      >
        {language === 'en' ? 'FR' : 'EN'}
      </button>
    </header>
  );
}
