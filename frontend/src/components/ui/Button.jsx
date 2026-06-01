import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-wa-green text-white hover:bg-wa-dark active:scale-95',
  ghost:   'bg-transparent text-wa-green hover:bg-wa-green/10 active:scale-95',
  icon:    'p-2 rounded-full bg-transparent hover:bg-white/20 active:scale-95',
};

export function Button({ children, variant = 'primary', className, disabled, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium',
        'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-wa-green',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
