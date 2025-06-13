
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
    imageUrl: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcSYSLAWBiJmsPd9Mx-bxBamGZJLGbVKV92Yof6lWfV6-E6l0Bw67JUE9_2o1XcZBQsK4A7lOaUij0fgDpQls0QkHA',
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
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/500px-Marie_Curie_c._1920s.jpg',
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
