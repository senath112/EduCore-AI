
"use client";

import { useSettings } from '@/hooks/use-settings';
import { LANGUAGES, type Language } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage } = useSettings();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-select" className="sr-only">Language</Label>
      <Globe className="h-5 w-5 text-muted-foreground" />
      <Select
        value={language}
        onValueChange={(value) => setLanguage(value as Language)}
      >
        <SelectTrigger id="language-select" className="w-auto min-w-[120px] sm:min-w-[140px] h-9">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
