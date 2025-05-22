
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
import { BookOpen, Dna, Sigma, Atom, FlaskConical, Laptop } from 'lucide-react'; // Added Laptop
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Dna,
  Sigma,
  Atom,
  FlaskConical,
  Laptop, // Added Laptop
  BookOpen, // Default
};

export default function SubjectSelector() {
  const { subject, setSubject } = useSettings();

  const getIconForSelectedSubjectListItem = (iconName: string | undefined) => {
    const IconComponent = iconName && iconMap[iconName] ? iconMap[iconName] : iconMap['BookOpen'];
    return <IconComponent className="mr-2 h-4 w-4" />;
  };

  const selectedSubjectDetails = SUBJECTS.find(s => s.value === subject);
  const SelectedIcon = selectedSubjectDetails?.iconName && iconMap[selectedSubjectDetails.iconName]
    ? iconMap[selectedSubjectDetails.iconName]
    : iconMap['BookOpen'];


  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="subject-select" className="sr-only">
        Select Subject
      </Label>
      {/* Render the icon directly for the trigger based on current selection */}
      <SelectedIcon className="h-5 w-5 text-muted-foreground" />
      <Select
        value={subject}
        onValueChange={(value) => setSubject(value as Subject)}
      >
        <SelectTrigger id="subject-select" className="w-auto min-w-[170px] sm:min-w-[200px] h-9 pl-2">
          {/* Remove icon from here as it's now outside SelectTrigger */}
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map((subj: SubjectDetails) => (
            <SelectItem key={subj.value} value={subj.value}>
              <div className="flex items-center">
                {getIconForSelectedSubjectListItem(subj.iconName)}
                {subj.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
