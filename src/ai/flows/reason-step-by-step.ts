// This is an AI-powered tutor that provides step-by-step reasoning for GCE Advanced Level students in Biology, Combined Maths, Physics, and Chemistry.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReasonStepByStepInputSchema = z.object({
  question: z.string().describe('The question to be answered.'),
  subject: z.enum(['Biology', 'Combined Maths', 'Physics', 'Chemistry']).describe('The subject of the question.'),
  language: z.enum(['Sinhala', 'English']).describe('The language to respond in.'),
  fileDataUri: z
    .string()
    .optional()
    .describe(
      "An optional file to provide more context to the question, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type ReasonStepByStepInput = z.infer<typeof ReasonStepByStepInputSchema>;

const ReasonStepByStepOutputSchema = z.object({
  reasoning: z.array(z.string()).describe('A step-by-step breakdown of the reasoning process.'),
  answer: z.string().describe('The final answer to the question.'),
});

export type ReasonStepByStepOutput = z.infer<typeof ReasonStepByStepOutputSchema>;

export async function reasonStepByStep(input: ReasonStepByStepInput): Promise<ReasonStepByStepOutput> {
  return reasonStepByStepFlow(input);
}

const reasonStepByStepPrompt = ai.definePrompt({
  name: 'reasonStepByStepPrompt',
  input: {schema: ReasonStepByStepInputSchema},
  output: {schema: ReasonStepByStepOutputSchema},
  prompt: `You are an expert tutor for GCE Advanced Level students, skilled in Biology, Combined Maths, Physics, and Chemistry.
You will answer questions in either Sinhala or English, providing a step-by-step breakdown of your reasoning.

Subject: {{{subject}}}
Language: {{{language}}}

Question: {{{question}}}
{{#if fileDataUri}}
File: {{media url=fileDataUri}}
{{/if}}

Reasoning Steps:
{{#each reasoning}}
- {{{this}}}
{{/each}}

Final Answer: {{{answer}}}`,
});

const reasonStepByStepFlow = ai.defineFlow(
  {
    name: 'reasonStepByStepFlow',
    inputSchema: ReasonStepByStepInputSchema,
    outputSchema: ReasonStepByStepOutputSchema,
  },
  async input => {
    const {output} = await reasonStepByStepPrompt(input);
    return output!;
  }
);
