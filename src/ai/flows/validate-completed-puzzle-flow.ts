
'use server';
/**
 * @fileOverview AI flow to validate a user's completed fill-in-the-blanks puzzle.
 *
 * - validateCompletedPuzzle - A function that handles puzzle answer validation.
 * - ValidateCompletedPuzzleInput - The input type.
 * - ValidateCompletedPuzzleOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

// Pre-construct the arrays for z.enum
const languageEnumValues = LANGUAGES.map(lang => lang.value) as [Language, ...Language[]];
const subjectEnumValues = SUBJECTS.map(sub => sub.value) as [Subject, ...Subject[]];

const ValidateCompletedPuzzleInputSchema = z.object({
  originalPuzzleStatementWithBlanks: z.string().describe('The original puzzle text with "____" placeholders.'),
  completedPuzzleStatementByUser: z.string().describe("The puzzle statement with the user's answers filled in."),
  subject: z.enum(subjectEnumValues).describe('The subject of the puzzle.'),
  language: z.enum(languageEnumValues).describe('The language of the puzzle.'),
});
export type ValidateCompletedPuzzleInput = z.infer<typeof ValidateCompletedPuzzleInputSchema>;

const ValidateCompletedPuzzleOutputSchema = z.object({
  isCorrect: z.boolean().describe("True if the user's completed statement is factually and contextually correct for the subject, false otherwise."),
  feedback: z.string().describe("Feedback to the user, e.g., 'That's correct!' or 'One or more of your answers are not quite right.'"),
  correctedStatementIfWrong: z.string().optional().describe("If the user's answer was incorrect, this can be the AI's version of the fully correct statement."),
});
export type ValidateCompletedPuzzleOutput = z.infer<typeof ValidateCompletedPuzzleOutputSchema>;

export async function validateCompletedPuzzle(
  input: ValidateCompletedPuzzleInput
): Promise<ValidateCompletedPuzzleOutput> {
  return validateCompletedPuzzleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateCompletedPuzzlePrompt',
  input: {schema: ValidateCompletedPuzzleInputSchema},
  output: {schema: ValidateCompletedPuzzleOutputSchema},
  prompt: `
You are an expert in {{subject}} and a skilled puzzle evaluator.
Your task is to validate a user's attempt at solving a fill-in-the-blanks puzzle.

Original Puzzle Statement (with blanks):
"{{originalPuzzleStatementWithBlanks}}"

User's Completed Puzzle Statement:
"{{completedPuzzleStatementByUser}}"

Instructions for Validation:
1.  **Analyze Correctness**: Carefully compare the "User's Completed Puzzle Statement" with the "Original Puzzle Statement". Determine if the words/phrases filled in by the user are factually accurate and contextually appropriate for the given {{subject}} in {{language}}.
    *   The user's answers should make the completed statement a true and meaningful sentence within the context of the {{subject}}.
    *   Minor grammatical variations that don't change the core meaning or factual accuracy can be considered acceptable, but significant errors should be marked incorrect.
    *   If the user filled a blank with something completely irrelevant or nonsensical for the context, it's incorrect.

2.  **Set \`isCorrect\`**:
    *   If all blanks are filled correctly according to your analysis, set \`isCorrect\` to \`true\`.
    *   Otherwise, set \`isCorrect\` to \`false\`.
    *   **Crucially, if your \`feedback\` message indicates full correctness (e.g., "That's absolutely correct! Well done."), then \`isCorrect\` MUST be set to \`true\`.**

3.  **Provide \`feedback\`**:
    *   If \`isCorrect\` is \`true\`, the feedback should be positive, e.g., "That's absolutely correct! Well done." or "Perfect! All answers are correct."
    *   If \`isCorrect\` is \`false\`, the feedback should be helpful, e.g., "Not quite right. Some of your answers might be incorrect or don't fit the context well." or "Good try, but some parts need correction."

4.  **Provide \`correctedStatementIfWrong\` (Optional)**:
    *   If \`isCorrect\` is \`false\`, you MAY provide a fully correct version of the puzzle statement in \`correctedStatementIfWrong\`. This helps the user learn. If it's hard to determine a single best correction or if the user's input is too far off, you can omit this field.

Example of a correct validation:
Input:
{
  "originalPuzzleStatementWithBlanks": "The capital of France is ____.",
  "completedPuzzleStatementByUser": "The capital of France is Paris.",
  "subject": "Geography",
  "language": "English"
}
Output:
{
  "isCorrect": true,
  "feedback": "That's correct! Paris is indeed the capital of France."
}

Example of an incorrect validation:
Input:
{
  "originalPuzzleStatementWithBlanks": "Water boils at ____ degrees Celsius at sea level.",
  "completedPuzzleStatementByUser": "Water boils at 50 degrees Celsius at sea level.",
  "subject": "Physics",
  "language": "English"
}
Output:
{
  "isCorrect": false,
  "feedback": "That's not quite right. Check the boiling point of water again.",
  "correctedStatementIfWrong": "Water boils at 100 degrees Celsius at sea level."
}

Validate the user's submission now.
`,
});

const validateCompletedPuzzleFlow = ai.defineFlow(
  {
    name: 'validateCompletedPuzzleFlow',
    inputSchema: ValidateCompletedPuzzleInputSchema,
    outputSchema: ValidateCompletedPuzzleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || typeof output.isCorrect !== 'boolean' || !output.feedback) {
        console.error("AI failed to generate a valid puzzle validation response.", output);
        // Consider returning a structured error or a default 'false' validation.
        // For now, throwing an error might be better for debugging.
        throw new Error("AI validation failed. Please try submitting your answer again.");
    }
    return output;
  }
);
