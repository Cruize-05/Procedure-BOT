import React from 'react';
import { Select } from './ui/Select';
import { PROCEDURES } from '../constants/procedures';

export function Header({ procedure, onProcedureChange, language, onLanguageChange }) {
  const options = PROCEDURES.map((p) => ({
    value: p.code,
    label: language === 'fr' ? p.fr : p.en,
  }));

  const placeholder =
    language === 'fr' ? '— Choisir une procédure —' : '— Choose a procedure —';

  const selectLabel =
    language === 'fr' ? 'Sélectionner une procédure' : 'Select a procedure';

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
