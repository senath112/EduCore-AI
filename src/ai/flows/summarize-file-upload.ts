// SummarizeFileUpload story implementation.
'use server';
/**
 * @fileOverview Summarizes the key concepts and provides relevant explanations or solutions based on the GCE Advanced Level syllabus.
 *
 * - summarizeFileUpload - A function that handles the file upload and summarization process.
 * - SummarizeFileUploadInput - The input type for the summarizeFileUpload function.
 * - SummarizeFileUploadOutput - The return type for the summarizeFileUpload function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFileUploadInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  subject: z.enum(['Biology', 'Combined Maths', 'Physics', 'Chemistry']).describe('The subject of the uploaded file.'),
  language: z.enum(['Sinhala', 'English']).describe('The language for the summary.'),
});
export type SummarizeFileUploadInput = z.infer<typeof SummarizeFileUploadInputSchema>;

const SummarizeFileUploadOutputSchema = z.object({
  summary: z.string().describe('A summary of the key concepts in the uploaded file.'),
  explanations: z.string().describe('Relevant explanations or solutions based on the GCE Advanced Level syllabus.'),
});
export type SummarizeFileUploadOutput = z.infer<typeof SummarizeFileUploadOutputSchema>;

export async function summarizeFileUpload(input: SummarizeFileUploadInput): Promise<SummarizeFileUploadOutput> {
  return summarizeFileUploadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeFileUploadPrompt',
  input: {schema: SummarizeFileUploadInputSchema},
  output: {schema: SummarizeFileUploadOutputSchema},
  prompt: `You are an expert tutor for GCE Advanced Level students.

You will summarize the key concepts and provide relevant explanations or solutions based on the GCE Advanced Level syllabus for the subject: {{subject}}.

Respond in the language: {{language}}.

Use the following file content as the primary source of information:

{{media url=fileDataUri}}`,
});

const summarizeFileUploadFlow = ai.defineFlow(
  {
    name: 'summarizeFileUploadFlow',
    inputSchema: SummarizeFileUploadInputSchema,
    outputSchema: SummarizeFileUploadOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
