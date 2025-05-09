'use server';

/**
 * @fileOverview A flow that translates a question, answers it, and translates the answer back.
 *
 * - translateQuestionThenAnswer - A function that handles the question translation and answering process.
 * - TranslateQuestionThenAnswerInput - The input type for the translateQuestionThenAnswer function.
 * - TranslateQuestionThenAnswerOutput - The return type for the translateQuestionThenAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateQuestionThenAnswerInputSchema = z.object({
  question: z.string().describe('The question to be answered.'),
  language: z.string().describe('The language of the question and desired answer.'),
  fileDataUri: z
    .string()
    .optional()
    .describe(
      "An optional file attachment that might contain further details about the question, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranslateQuestionThenAnswerInput = z.infer<typeof TranslateQuestionThenAnswerInputSchema>;

const TranslateQuestionThenAnswerOutputSchema = z.object({
  answer: z.string().describe('The answer to the question in the original language.'),
});
export type TranslateQuestionThenAnswerOutput = z.infer<typeof TranslateQuestionThenAnswerOutputSchema>;

export async function translateQuestionThenAnswer(
  input: TranslateQuestionThenAnswerInput
): Promise<TranslateQuestionThenAnswerOutput> {
  return translateQuestionThenAnswerFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: {
    schema: z.object({
      text: z.string(),
      targetLanguage: z.string(),
    }),
  },
  output: {
    schema: z.object({
      translatedText: z.string(),
    }),
  },
  prompt: 'Translate the following text to {{targetLanguage}}: {{text}}',
});

const answerQuestionPrompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The question to be answered.'),
      fileDataUri: z
        .string()
        .optional()
        .describe(
          'An optional file attachment that might contain further details about the question, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Intentionally escaped.
        ),
    }),
  },
  output: {
    schema: z.object({
      answer: z.string().describe('The answer to the question.'),
    }),
  },
  prompt: `You are an AI tutor specializing in the GCE Advanced Level syllabus for Biology, Combined Maths, Physics, and Chemistry.
  Answer the following question accurately and concisely, using information from the attached file if present: {{{question}}} {{#if fileDataUri}}Attachment: {{media url=fileDataUri}}{{/if}}`,
});

const translateQuestionThenAnswerFlow = ai.defineFlow(
  {
    name: 'translateQuestionThenAnswerFlow',
    inputSchema: TranslateQuestionThenAnswerInputSchema,
    outputSchema: TranslateQuestionThenAnswerOutputSchema,
  },
  async input => {
    const {
      question,
      language,
      fileDataUri,
    } = input;

    // Translate the question to English
    const {output: translatedQuestionOutput} = await translatePrompt({
      text: question,
      targetLanguage: 'English',
    });

    // Answer the question in English
    const {output: answerOutput} = await answerQuestionPrompt({
      question: translatedQuestionOutput!.translatedText,
      fileDataUri,
    });

    // Translate the answer back to the original language
    const {output: translatedAnswerOutput} = await translatePrompt({
      text: answerOutput!.answer,
      targetLanguage: language,
    });

    return {answer: translatedAnswerOutput!.translatedText};
  }
);
