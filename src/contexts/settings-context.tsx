
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

export type Theme = 'light' | 'dark';

type SettingsContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  subject: Subject;
  setSubject: (subject: Subject) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(LANGUAGES[0].value);
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0].value);
  const [theme, setThemeState] = useState<Theme>('light'); // Default to light

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme) {
      setThemeState(storedTheme);
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (prefersDark) {
        setThemeState('dark');
        document.documentElement.classList.add('dark');
    } else {
        setThemeState('light');
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ language, setLanguage, subject, setSubject, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}
