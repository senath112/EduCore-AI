"use client";

import { useSettings } from '@/hooks/use-settings';
import { SUBJECTS, type Subject, type SubjectDetails } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { BookOpen, Dna, Sigma, Atom, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Dna,
  Sigma,
  Atom,
  FlaskConical,
  BookOpen, // Default
};

export default function SubjectSelector() {
  const { subject, setSubject } = useSettings();

  const getIcon = (iconName: string | undefined) => {
    const IconComponent = iconName ? iconMap[iconName] : iconMap['BookOpen'];
    return <IconComponent className="mr-2 h-4 w-4" />;
  };

  return (
    <div className="mb-6">
      <Label htmlFor="subject-select" className="block text-sm font-medium mb-1">
        Select Subject
      </Label>
      <Select
        value={subject}
        onValueChange={(value) => setSubject(value as Subject)}
      >
        <SelectTrigger id="subject-select" className="w-full md:w-[280px]">
           <div className="flex items-center">
            {getIcon(SUBJECTS.find(s => s.value === subject)?.iconName)}
            <SelectValue placeholder="Select subject" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map((subj: SubjectDetails) => (
            <SelectItem key={subj.value} value={subj.value}>
              <div className="flex items-center">
                {getIcon(subj.iconName)}
                {subj.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
