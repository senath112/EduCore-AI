// This is an AI-powered tutor that provides step-by-step reasoning for GCE Advanced Level students in Biology, Combined Maths, Physics, and Chemistry.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReasonStepByStepInputSchema = z.object({
  question: z.string().describe('The question to be answered or the user input.'),
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
  reasoning: z.array(z.string()).describe("A step-by-step breakdown of the reasoning process. This should be an empty array if the user's input is a greeting or does not require detailed reasoning."),
  answer: z.string().describe("The final answer to the question, or a simple response if the input is a greeting/statement not requiring detailed steps."),
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
You will respond in the language: {{{language}}}.

Analyze the user's input: "{{{question}}}"
{{#if fileDataUri}}
Additional context from the provided file: {{media url=fileDataUri}}
{{/if}}

If the user's input is a question related to the subject "{{{subject}}}" that requires a detailed explanation:
- Populate the 'reasoning' field with a step-by-step breakdown of your thinking process.
- Populate the 'answer' field with the final solution or explanation.

If the user's input is a simple greeting (e.g., "hi", "hello"), a general statement not requiring a subject-specific explanation, a polite phrase (e.g., "thank you"), or something that cannot be meaningfully answered as a subject question:
- The 'reasoning' field MUST be an empty array.
- The 'answer' field should contain a brief, friendly, and appropriate response.

Ensure your response is in {{{language}}}.`,
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

