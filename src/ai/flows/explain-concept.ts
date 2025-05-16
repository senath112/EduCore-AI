'use server';
/**
 * @fileOverview AI agent that explains a concept related to Biology, Combined Maths, Physics, or Chemistry.
 *
 * - explainConcept - A function that explains a concept in the chosen language.
 * - ExplainConceptInput - The input type for the explainConcept function.
 * - ExplainConceptOutput - The return type for the explainConcept function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainConceptInputSchema = z.object({
  topic: z.string().describe('The specific question or topic to explain.'),
  subject: z.enum(['Biology', 'Combined Maths', 'Physics', 'Chemistry']).describe('The subject of the topic.'),
  language: z.enum(['Sinhala', 'English']).describe('The preferred language for the explanation.'),
});
export type ExplainConceptInput = z.infer<typeof ExplainConceptInputSchema>;

const ExplainConceptOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation of the concept in the specified language.'),
});
export type ExplainConceptOutput = z.infer<typeof ExplainConceptOutputSchema>;

export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  return explainConceptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainConceptPrompt',
  input: {schema: ExplainConceptInputSchema},
  output: {schema: ExplainConceptOutputSchema},
  prompt: `You are an expert tutor specializing in Biology, Combined Maths, Physics, and Chemistry.

You will provide a detailed explanation of the concept in the student's preferred language.

Subject: {{{subject}}}
Language: {{{language}}}
Topic: {{{topic}}}

Explanation:`, // The actual explanation will be generated here
});

const explainConceptFlow = ai.defineFlow(
  {
    name: 'explainConceptFlow',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
