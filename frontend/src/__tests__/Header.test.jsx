import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../components/Header';
import { PROCEDURES } from '../constants/procedures';

const base = {
  procedure: '',
  onProcedureChange: vi.fn(),
  language: 'en',
  onLanguageChange: vi.fn(),
};

describe('Header', () => {
  it('renders all 10 procedure options in English', () => {
    render(<Header {...base} />);
    const select = screen.getByRole('combobox');
    const opts = select.querySelectorAll('option:not([disabled])');
    expect(opts).toHaveLength(PROCEDURES.length);
    expect(opts[0].textContent).toBe('National ID Card');
  });

  it('renders procedure options in French when language is fr', () => {
    render(<Header {...base} language="fr" />);
    const select = screen.getByRole('combobox');
    const opts = select.querySelectorAll('option:not([disabled])');
    expect(opts[0].textContent).toBe("Carte Nationale d'Identité");
  });

  it('calls onProcedureChange with the selected code', () => {
    const onProcedureChange = vi.fn();
    render(<Header {...base} onProcedureChange={onProcedureChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PASSPORT' } });
    expect(onProcedureChange).toHaveBeenCalledWith('PASSPORT');
  });

  it('shows FR toggle label in English mode', () => {
    render(<Header {...base} language="en" />);
    expect(screen.getByTestId('language-toggle')).toHaveTextContent('FR');
  });

  it('shows EN toggle label in French mode', () => {
    render(<Header {...base} language="fr" />);
    expect(screen.getByTestId('language-toggle')).toHaveTextContent('EN');
  });

  it('calls onLanguageChange with fr when toggled from en', () => {
    const onLanguageChange = vi.fn();
    render(<Header {...base} language="en" onLanguageChange={onLanguageChange} />);
    fireEvent.click(screen.getByTestId('language-toggle'));
    expect(onLanguageChange).toHaveBeenCalledWith('fr');
  });

  it('calls onLanguageChange with en when toggled from fr', () => {
    const onLanguageChange = vi.fn();
    render(<Header {...base} language="fr" onLanguageChange={onLanguageChange} />);
    fireEvent.click(screen.getByTestId('language-toggle'));
    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('has an accessible label on the procedure select', () => {
    render(<Header {...base} />);
    expect(screen.getByRole('combobox')).toHaveAccessibleName(/select a procedure/i);
  });
});
