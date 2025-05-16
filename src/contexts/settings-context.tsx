"use client";

import type { ReactNode } from 'react';
import { createContext, useState } from 'react';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

type SettingsContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  subject: Subject;
  setSubject: (subject: Subject) => void;
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(LANGUAGES[0].value);
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0].value);

  return (
    <SettingsContext.Provider value={{ language, setLanguage, subject, setSubject }}>
      {children}
    </SettingsContext.Provider>
  );
}
