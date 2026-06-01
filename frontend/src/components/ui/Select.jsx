import React from 'react';
import { cn } from '../../lib/utils';

export function Select({ options, value, onChange, placeholder, className, label }) {
  return (
    <div className={cn('relative', className)}>
      {label && <label className="sr-only">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          'w-full appearance-none bg-white/15 text-white text-xs font-medium',
          'rounded-lg px-3 py-1.5 pr-7 border border-white/30',
          'focus:outline-none focus:ring-2 focus:ring-white/50',
          'cursor-pointer truncate'
        )}
      >
        {placeholder && (
          <option value="" disabled className="text-gray-400 bg-white">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900 bg-white">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="h-3 w-3 text-white/80" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}
