
export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Sinhala', label: 'සිංහල (Sinhala)' },
] as const;

export type Language = typeof LANGUAGES[number]['value'];

export const SUBJECTS = [
  { value: 'Biology', label: 'Biology', iconName: 'Dna' },
  { value: 'Combined Maths', label: 'Combined Maths', iconName: 'Sigma' },
  { value: 'Physics', label: 'Physics', iconName: 'Atom' },
  { value: 'Chemistry', label: 'Chemistry', iconName: 'FlaskConical' },
] as const;

export type Subject = typeof SUBJECTS[number]['value'];

export type SubjectDetails = typeof SUBJECTS[number];
