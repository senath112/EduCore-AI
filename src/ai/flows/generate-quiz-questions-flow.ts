
'use server';
/**
 * @fileOverview AI flow to generate quiz questions.
 *
 * - generateQuizQuestions - A function that handles the quiz question generation process.
 * - GenerateQuizQuestionsInput - The input type for the generateQuizQuestions function.
 * - GenerateQuizQuestionsOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizQuestionsInputSchema = z.object({
  subject: z.string().describe('The subject of the quiz (e.g., Biology, Physics).'),
  quizTitle: z.string().describe('The title of the quiz, for context.'),
  classContext: z.string().describe('A brief description of the target student audience (e.g., "Advanced Level students in Sri Lanka", "High school chemistry students").'),
  topic: z.string().describe('The specific topic for which questions should be generated.'),
  numberOfQuestions: z.coerce.number().min(1).max(10).describe('The number of questions to generate (1-10).'),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const GenerateQuizQuestionsOutputSchema = z.object({
  questionsText: z.string().describe(
    'A single block of text containing all generated questions. Each question must be an MCQ with 5 options (A-E) and a correct answer designation. Format each question block as: Question text (1 line), Option A (1 line), Option B (1 line), Option C (1 line), Option D (1 line), Option E (1 line), ANSWER: <A|B|C|D|E> (1 line). Separate question blocks with one or more blank lines.'
  ),
});
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;

export async function generateQuizQuestions(
  input: GenerateQuizQuestionsInput
): Promise<GenerateQuizQuestionsOutput> {
  return generateQuizQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizQuestionsPrompt',
  input: {schema: GenerateQuizQuestionsInputSchema},
  output: {schema: GenerateQuizQuestionsOutputSchema},
  prompt: `You are an expert educator and quiz designer specializing in {{{subject}}}.
You are creating questions for a quiz titled "{{{quizTitle}}}" for {{{classContext}}}.

Generate exactly {{{numberOfQuestions}}} Multiple Choice Questions (MCQs) related to the topic: "{{{topic}}}".

For each question:
1.  Provide clear and concise question text on a single line.
2.  Provide 5 distinct options, labeled A, B, C, D, and E. Each option should be on its own new line.
3.  Clearly indicate the correct answer on a new line using the format: "ANSWER: X" (where X is the letter of the correct option A, B, C, D, or E).

The entire output must be a single block of text. Separate each complete question block (question text, 5 options, and answer line) from the next question block by one or more blank lines.

Example of ONE question block:
What is the capital of France?
Paris
London
Berlin
Madrid
Rome
ANSWER: A

Begin generating the questions now.
`,
});

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async (input) => {
    // Ensure the number of questions is within a reasonable limit for the model.
    if (input.numberOfQuestions > 10) {
      input.numberOfQuestions = 10; // Cap at 10 for this example
    }
    if (input.numberOfQuestions < 1) {
      input.numberOfQuestions = 1;
    }

    const {output} = await prompt(input);
    if (!output || !output.questionsText) {
        throw new Error("AI failed to generate questions or the response was empty.");
    }
    return output;
  }
);
