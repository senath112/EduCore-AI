
export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Sinhala', label: 'සිංහල (Sinhala)' },
] as const;

export type Language = typeof LANGUAGES[number]['value'];

export const SUBJECTS = [
  {
    value: 'Biology',
    label: 'Biology',
    iconName: 'Dna',
    tutorPersonality: 'Dr. Mendel',
    imageUrl: 'https://cdn.britannica.com/96/118096-050-BAC1CD4A/Gregor-Mendel-1865.jpg',
  },
  {
    value: 'Combined Maths',
    label: 'Combined Maths',
    iconName: 'Sigma',
    tutorPersonality: 'Professor Pythagoras',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pythagoras_in_Thomas_Stanley_History_of_Philosophy.jpg/800px-Pythagoras_in_Thomas_Stanley_History_of_Philosophy.jpg',
  },
  {
    value: 'Physics',
    label: 'Physics',
    iconName: 'Atom',
    tutorPersonality: 'Sir Isaac Newton',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689.jpg/800px-Portrait_of_Sir_Isaac_Newton%2C_1689.jpg',
  },
  {
    value: 'Chemistry',
    label: 'Chemistry',
    iconName: 'FlaskConical',
    tutorPersonality: 'Madame Curie',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcT6Ew_PgesXXnu5MTM1S0oP6xlIqGas2rrTf7Vu4SyePTfIrPkBlDCm2NjkE3Ymd1QnT3mmpulyQPzADDg',
  },
  {
    value: 'ICT',
    label: 'ICT',
    iconName: 'Laptop',
    tutorPersonality: 'Ada Lovelace',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/800px-Ada_Lovelace_portrait.jpg',
  },
] as const;

export type Subject = typeof SUBJECTS[number]['value'];

// This type will now automatically include 'tutorPersonality' and 'imageUrl'
export type SubjectDetails = typeof SUBJECTS[number];
