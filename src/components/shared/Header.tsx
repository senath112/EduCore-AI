// src/components/shared/Header.tsx
"use client";

import type { ChangeEvent } from "react";
import { GraduationCap, Languages, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Language, Subject } from "@/types";

interface HeaderProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  selectedSubject: Subject;
  onSubjectChange: (subject: Subject) => void;
}

const languages: Language[] = ["English", "Sinhala"];
const subjects: Subject[] = ["Biology", "Combined Maths", "Physics", "Chemistry"];

export function AppHeader({
  selectedLanguage,
  onLanguageChange,
  selectedSubject,
  onSubjectChange,
}: HeaderProps) {
  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-10 w-10 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight">EduCore AI</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedLanguage} onValueChange={(value: Language) => onLanguageChange(value)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedSubject} onValueChange={(value: Subject) => onSubjectChange(value)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
}
