
'use server';

/**
 * @fileOverview AI-powered chat interface for tutoring sessions and concept explanations.
 *
 * - aiTutor - A function that handles the tutoring and explanation process.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';


const AiTutorInputSchema = z.object({
  subject: z.enum(SUBJECTS.map(s => s.value) as [Subject, ...Subject[]]).describe('The subject for the tutoring session.'),
  language: z.enum(LANGUAGES.map(l => l.value) as [Language, ...Language[]]).describe('The preferred language for the tutoring session.'),
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
  prompt: `You are an AI tutor and concept explainer specializing in {{{subject}}}. You are assisting a student in {{{language}}}.

Your primary role is to tutor the student. However, if the student's message is a clear request to explain a specific topic or concept (e.g., "Explain Newton's First Law", "What is photosynthesis?", "Tell me about mitosis"), provide a comprehensive explanation of that concept in {{{language}}}.

For general tutoring questions or ongoing conversation, adapt your responses based on the student's understanding and the chat history, always responding in {{{language}}}.

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
