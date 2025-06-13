
'use server';
/**
 * @fileOverview AI flow to generate fill-in-the-blanks puzzles.
 *
 * - generateFillBlanksPuzzle - A function that handles puzzle generation.
 * - GenerateFillBlanksPuzzleInput - The input type.
 * - GenerateFillBlanksPuzzleOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

// Pre-construct the arrays for z.enum
const languageEnumValues = LANGUAGES.map(lang => lang.value) as [Language, ...Language[]];
const subjectEnumValues = SUBJECTS.map(sub => sub.value) as [Subject, ...Subject[]];

const GenerateFillBlanksPuzzleInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters.").max(100, "Topic cannot exceed 100 characters."),
  subject: z.enum(subjectEnumValues).describe('The subject for the puzzle.'),
  language: z.enum(languageEnumValues).describe('The preferred language for the puzzle.'),
});
export type GenerateFillBlanksPuzzleInput = z.infer<typeof GenerateFillBlanksPuzzleInputSchema>;

const FillBlanksPuzzleSchema = z.object({
  puzzleStatement: z.string().describe('The puzzle text containing one or more "____" placeholders for blanks. Ensure each blank is exactly four underscores and that there is at least one blank.'),
  pointsValue: z.number().int().min(5).max(25).describe('Points awarded for solving the puzzle correctly, typically between 5 and 20.'),
});
export type FillBlanksPuzzle = z.infer<typeof FillBlanksPuzzleSchema>;

const GenerateFillBlanksPuzzleOutputSchema = z.object({
  puzzle: FillBlanksPuzzleSchema,
});
export type GenerateFillBlanksPuzzleOutput = z.infer<typeof GenerateFillBlanksPuzzleOutputSchema>;

export async function generateFillBlanksPuzzle(
  input: GenerateFillBlanksPuzzleInput
): Promise<GenerateFillBlanksPuzzleOutput> {
  return generateFillBlanksPuzzleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFillBlanksPuzzlePrompt',
  input: {schema: GenerateFillBlanksPuzzleInputSchema},
  output: {schema: GenerateFillBlanksPuzzleOutputSchema},
  prompt: `
You are an expert in {{subject}} and a skilled puzzle creator.
Your task is to generate a fill-in-the-blanks style puzzle related to the topic: "{{topic}}" in {{language}}.

Instructions for Puzzle Generation:
1.  **Puzzle Statement (\`puzzleStatement\`)**:
    *   Create a sentence or short paragraph that is factually accurate for the given {{subject}} and {{topic}}.
    *   This statement MUST use "____" (exactly four underscores) to indicate each blank where a word or short phrase needs to be filled in.
    *   There MUST be at least one blank. Ensure each blank is clearly distinguishable.
    *   The statement should be educational and contextually relevant.

2.  **Points Value (\`pointsValue\`)**:
    *   Assign an integer value for successfully solving the puzzle, typically between 5 and 20 points. This is the value to be awarded if the user fills in the blanks correctly.

Example for Topic "Photosynthesis" in Subject "Biology":
{
  "puzzle": {
    "puzzleStatement": "Photosynthesis in plants primarily occurs in the ____, using ____ as the primary pigment to capture light energy.",
    "pointsValue": 15
  }
}

Generate the puzzle for the topic "{{topic}}" in {{subject}} ({{language}}) now.
`,
});

const generateFillBlanksPuzzleFlow = ai.defineFlow(
  {
    name: 'generateFillBlanksPuzzleFlow',
    inputSchema: GenerateFillBlanksPuzzleInputSchema,
    outputSchema: GenerateFillBlanksPuzzleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.puzzle || !output.puzzle.puzzleStatement || (output.puzzle.puzzleStatement.match(/____/g) || []).length === 0) {
        console.error("AI failed to generate a valid puzzle, the statement was malformed, or no blanks were found.", output);
        throw new Error("AI failed to generate a valid puzzle with blanks. Please try a different topic.");
    }
    return output;
  }
);
