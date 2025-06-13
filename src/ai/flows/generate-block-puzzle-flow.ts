
'use server';
/**
 * @fileOverview AI flow to generate block puzzles where users fit words into blanks from a list of options.
 *
 * - generateBlockPuzzle - A function that handles puzzle generation.
 * - GenerateBlockPuzzleInput - The input type.
 * - GenerateBlockPuzzleOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

// Pre-construct the arrays for z.enum
const languageEnumValues = LANGUAGES.map(lang => lang.value) as [Language, ...Language[]];
const subjectEnumValues = SUBJECTS.map(sub => sub.value) as [Subject, ...Subject[]];

const GenerateBlockPuzzleInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters.").max(100, "Topic cannot exceed 100 characters."),
  subject: z.enum(subjectEnumValues).describe('The subject for the puzzle.'),
  language: z.enum(languageEnumValues).describe('The preferred language for the puzzle.'),
  numberOfBlanks: z.coerce.number().min(1, "Must have at least 1 blank.").max(4, "Cannot have more than 4 blanks."),
  numberOfDistractorsPerBlank: z.coerce.number().min(1, "Must have at least 1 distractor per blank.").max(3, "Cannot have more than 3 distractors per blank."),
});
export type GenerateBlockPuzzleInput = z.infer<typeof GenerateBlockPuzzleInputSchema>;

// Schema for the prompt input, including the pre-calculated totalDistractors
const PromptInputSchema = GenerateBlockPuzzleInputSchema.extend({
  totalDistractors: z.number().describe('The total number of distractor answers to generate.'),
});

const GenerateBlockPuzzleOutputSchema = z.object({
  puzzleStatementWithBlanks: z.string().describe('The puzzle text containing "____" placeholders for blanks. Ensure the number of "____" matches the requested numberOfBlanks.'),
  correctAnswersInOrder: z.array(z.string()).describe('An ordered array of the correct words/phrases for the blanks. The length of this array must match the number of "____" in puzzleStatementWithBlanks.'),
  distractorAnswers: z.array(z.string()).describe('An array of plausible but incorrect words/phrases. The total number of distractors should be numberOfBlanks * numberOfDistractorsPerBlank. Ensure these are distinct from correctAnswersInOrder and from each other if possible.'),
  pointsValue: z.number().int().min(5).max(30).describe('Points awarded for solving the puzzle correctly, typically between 5 and 30 based on complexity (number of blanks).'),
});
export type GenerateBlockPuzzleOutput = z.infer<typeof GenerateBlockPuzzleOutputSchema>;

export async function generateBlockPuzzle(
  input: GenerateBlockPuzzleInput
): Promise<GenerateBlockPuzzleOutput> {
  return generateBlockPuzzleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBlockPuzzlePrompt',
  input: {schema: PromptInputSchema}, // Use the extended schema for prompt input
  output: {schema: GenerateBlockPuzzleOutputSchema},
  prompt: `
You are an expert in {{subject}} and a skilled puzzle creator.
Your task is to generate a block-fitting style puzzle related to the topic: "{{topic}}" in {{language}}.
The puzzle will have exactly {{numberOfBlanks}} blanks, indicated by "____".
For each blank, there should be one correct answer.
You also need to generate {{numberOfDistractorsPerBlank}} distractor answers for each blank, totaling {{totalDistractors}} distractors.

Instructions for Puzzle Generation:
1.  **Puzzle Statement (\`puzzleStatementWithBlanks\`)**:
    *   Create a sentence or short paragraph that is factually accurate for the given {{subject}} and {{topic}}.
    *   This statement MUST use "____" (exactly four underscores) to indicate each blank where a word or short phrase needs to be filled in.
    *   The number of "____" instances MUST exactly match the requested \`numberOfBlanks\` (which is {{numberOfBlanks}}).

2.  **Correct Answers (\`correctAnswersInOrder\`)**:
    *   Provide an ordered array of strings containing the single correct word or short phrase for each blank in the \`puzzleStatementWithBlanks\`.
    *   The length of this array MUST exactly match \`numberOfBlanks\`.

3.  **Distractor Answers (\`distractorAnswers\`)**:
    *   Provide an array of strings containing plausible but incorrect words/phrases that could fit into the blanks.
    *   The total number of distractor strings in this array should be exactly (\`numberOfBlanks\` * \`numberOfDistractorsPerBlank\`), which is {{totalDistractors}}.
    *   Distractors should be relevant to the {{topic}} or {{subject}} to make the puzzle challenging but fair.
    *   Ensure distractor answers are distinct from the correct answers and, if possible, distinct from each other.

4.  **Points Value (\`pointsValue\`)**:
    *   Assign an integer value for successfully solving the puzzle, typically between 5 and 30 points. Base this on the \`numberOfBlanks\` (e.g., 5 points for 1 blank, 10 for 2, 15 for 3, 20 for 4).

Example for Topic "Photosynthesis", Subject "Biology", numberOfBlanks: 2, numberOfDistractorsPerBlank: 1:
(Total distractors = 2 * 1 = 2)
{
  "puzzleStatementWithBlanks": "Plants use ____ to convert light energy into chemical energy in the form of ____.",
  "correctAnswersInOrder": ["chlorophyll", "glucose"],
  "distractorAnswers": ["mitochondria", "oxygen"],
  "pointsValue": 10
}

Generate the puzzle for the topic "{{topic}}" in {{subject}} ({{language}}) with {{numberOfBlanks}} blank(s) and {{totalDistractors}} total distractor(s) now.
`,
  // Removed templateHelpers for multiply
});

const generateBlockPuzzleFlow = ai.defineFlow(
  {
    name: 'generateBlockPuzzleFlow',
    inputSchema: GenerateBlockPuzzleInputSchema, // Flow input remains the original schema
    outputSchema: GenerateBlockPuzzleOutputSchema,
  },
  async (input: GenerateBlockPuzzleInput) => {
    const totalDistractors = input.numberOfBlanks * input.numberOfDistractorsPerBlank;
    const promptInput = {
      ...input,
      totalDistractors,
    };

    const {output} = await prompt(promptInput); // Pass the input with pre-calculated totalDistractors

    if (!output || !output.puzzleStatementWithBlanks || !output.correctAnswersInOrder || !output.distractorAnswers) {
        console.error("AI failed to generate a complete block puzzle structure.", output);
        throw new Error("AI failed to generate all required parts of the puzzle. Please try a different topic or parameters.");
    }
    const blanksCount = (output.puzzleStatementWithBlanks.match(/____/g) || []).length;
    if (blanksCount !== input.numberOfBlanks) {
        console.error(`AI generated ${blanksCount} blanks, but ${input.numberOfBlanks} were requested. Statement: "${output.puzzleStatementWithBlanks}"`, output);
        throw new Error(`AI generated a puzzle with an incorrect number of blanks. Expected ${input.numberOfBlanks}, got ${blanksCount}.`);
    }
    if (output.correctAnswersInOrder.length !== input.numberOfBlanks) {
        console.error(`AI generated ${output.correctAnswersInOrder.length} correct answers, but ${input.numberOfBlanks} were expected.`, output);
        throw new Error(`AI provided an incorrect number of correct answers. Expected ${input.numberOfBlanks}, got ${output.correctAnswersInOrder.length}.`);
    }
    
    // Check against the pre-calculated totalDistractors
    if (output.distractorAnswers.length !== totalDistractors) {
        console.error(`AI generated ${output.distractorAnswers.length} distractors, but ${totalDistractors} were expected.`, output);
        throw new Error(`AI provided an incorrect number of distractor answers. Expected ${totalDistractors}, got ${output.distractorAnswers.length}.`);
    }
    if (output.pointsValue < 5 || output.pointsValue > 30) {
        console.warn(`AI generated pointsValue ${output.pointsValue} is outside the typical range (5-30). Using a default of 10.`, output);
        output.pointsValue = 10; // Defaulting for safety, or could throw an error
    }
    return output;
  }
);
