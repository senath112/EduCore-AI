
'use server';
/**
 * @fileOverview AI flow to generate flashcards.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';


const GenerateFlashcardsInputSchema = z.object({
  subject: z.enum(SUBJECTS.map(s => s.value) as [Subject, ...Subject[]]).describe('The subject for the flashcards.'),
  language: z.enum(LANGUAGES.map(l => l.value) as [Language, ...Language[]]).describe('The preferred language for the flashcards.'),
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long." }).max(100, { message: "Topic cannot exceed 100 characters." }).describe('The specific topic for which flashcards should be generated.'),
  numberOfFlashcards: z.coerce.number().min(1, { message: "Number of flashcards must be at least 1." }).max(10, { message: "Cannot generate more than 10 flashcards at a time." }).describe('The number of flashcards to generate (1-10).'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  front: z.string().describe("The front side of the flashcard (e.g., a term, concept, or question)."),
  back: z.string().describe("The back side of the flashcard (e.g., a definition, explanation, or answer)."),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of generated flashcard objects, each with a front and back.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(
  input: GenerateFlashcardsInput
): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an expert educator specializing in creating effective study materials for {{{subject}}} in {{{language}}}.
Your task is to generate exactly {{{numberOfFlashcards}}} flashcards for the topic: "{{{topic}}}".

For each flashcard, provide:
1.  "front": A concise term, concept, or question related to the topic. This should be suitable for the front of a flashcard.
2.  "back": A clear definition, explanation, or answer corresponding to the "front". This should be suitable for the back of a flashcard.

Ensure the content is accurate, easy to understand for the target language ({{{language}}}), and directly relevant to the specified topic and subject.
The output must be an array of flashcard objects, where each object has a "front" and a "back" field.

Begin generating the flashcards now.
`,
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.flashcards || output.flashcards.length === 0) {
        console.error("AI failed to generate flashcards or the response was empty/malformed.", output);
        // Return an empty array or a more specific error structure if preferred
        return { flashcards: [] };
    }
    return output;
  }
);

