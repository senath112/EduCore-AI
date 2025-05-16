'use server';

/**
 * @fileOverview AI-powered chat interface for tutoring sessions.
 *
 * - aiTutor - A function that handles the tutoring process.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTutorInputSchema = z.object({
  subject: z.enum(['Biology', 'Combined Maths', 'Physics', 'Chemistry']).describe('The subject for the tutoring session.'),
  language: z.enum(['Sinhala', 'English']).describe('The preferred language for the tutoring session.'),
  studentMessage: z.string().describe('The student message to respond to.'),
  chatHistory: z.array(
    z.object({
      role: z.enum(['student', 'tutor']),
      content: z.string(),
    })
  ).optional().describe('The chat history of the tutoring session.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  tutorResponse: z.string().describe('The tutor response to the student message.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  return aiTutorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTutorPrompt',
  input: {schema: AiTutorInputSchema},
  output: {schema: AiTutorOutputSchema},
  prompt: `You are an AI tutor specializing in {{{subject}}}. You are tutoring a student in {{{language}}}.

  Adapt your explanations based on the student's understanding and questions. Consider the chat history to understand the student's current understanding.

  Chat History:
  {{#each chatHistory}}
  {{#ifEquals role 'student'}}
  Student: {{{content}}}
  {{/ifEquals}}
  {{#ifEquals role 'tutor'}}
  Tutor: {{{content}}}
  {{/ifEquals}}
  {{/each}}

  Student: {{{studentMessage}}}
  Tutor:`, // Keep the tutor prompt open ended
  templateHelpers: {
    ifEquals: function (arg1: any, arg2: any, options: any) {
      // @ts-ignore
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  },
});

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
