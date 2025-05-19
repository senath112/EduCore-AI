
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
  imageDataUri: z.string().optional().describe("An image file provided by the student, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
  chartType: z.enum(["bar", "line", "pie"]).optional().describe("The type of chart to be drawn, if a chart was requested and data is provided."),
  chartData: z.array(
    z.object({
      name: z.string().describe("The label for the data point (e.g., category name on X-axis or pie slice)."),
      value: z.number().describe("The numerical value for this data point (e.g., height of the bar, point on a line, or pie slice value).")
    })
  ).optional().describe("The data points for the chart, if a chart is requested. Each object should have a 'name' (string label) and 'value' (number). If the student asks for a chart, provide this data. Example: [{'name': 'Category A', 'value': 10}, {'name': 'Category B', 'value': 20}]")
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

Your primary role is to tutor the student on topics related to {{{subject}}}.
If the student's message is a clear request to explain a specific concept within {{{subject}}}, provide a comprehensive explanation in {{{language}}}.

CHARTING INSTRUCTIONS:
If the student asks you to "draw a chart", "plot data", "visualize data as a chart", or similar, you should:
1. Identify the type of chart requested (bar, line, pie). If not specified, choose a reasonable default like 'bar' for categorical data or 'line' for time series.
2. Extract the data points (labels and values) from the student's request or the chat history.
3. If you can successfully extract this information, provide it in the 'chartType' and 'chartData' output fields. 'chartData' should be an array of objects, where each object has a "name" (string) and a "value" (number). For example: [{"name": "Apples", "value": 5}, {"name": "Oranges", "value": 10}].
4. Your 'tutorResponse' text should introduce the chart or explain any assumptions made. Example: "Okay, I can help you visualize that. Here's the data for a bar chart:"
5. If you cannot determine the chart type or extract clear data, or if the request is too complex, state this in your 'tutorResponse' and do NOT provide 'chartType' or 'chartData'. Example: "I can help with charts, but I need a bit more clarity on the data you want to plot. Could you provide the data points like 'Category A: 10, Category B: 20'?"

IMPORTANT GENERAL INSTRUCTIONS:
1. You MUST strictly stay on the topic of {{{subject}}}.
2. If the student asks a question that is NOT related to {{{subject}}}, or if the question is inappropriate, offensive, nonsensical, or violates safety guidelines, you MUST politely decline to answer.
3. When declining, use a simple, direct, and neutral message in {{{language}}}. For example: "I can only assist with questions related to {{{subject}}}. Please ask a relevant question." or "I'm designed to help with {{{subject}}}. I am unable to answer that." Do not be preachy, judgmental, or elaborate on why you cannot answer.
4. Always respond in {{{language}}}.

Chat History:
{{#each chatHistory}}
{{#ifEquals role 'student'}}
Student: {{{content}}}
{{/ifEquals}}
{{#ifEquals role 'tutor'}}
Tutor: {{{content}}}
{{/ifEquals}}
{{/each}}

Student's Question: {{{studentMessage}}}
{{#if imageDataUri}}
The student has also provided an image. Refer to this image if relevant to the question.
Image: {{media url=imageDataUri}}
{{/if}}
Tutor:`,
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
    const response = await prompt(input);
    if (!response.output || !response.output.tutorResponse) {
      let failureReason = "AI prompt failed to generate a valid response or the response was empty.";
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason) {
          failureReason += ` Finish Reason: ${candidate.finishReason}.`;
          if (candidate.finishMessage) {
            failureReason += ` Message: ${candidate.finishMessage}.`;
          }
          if (candidate.finishReason === 'SAFETY') {
             failureReason += " The response may have been blocked due to safety settings."
          }
        }
      }
      console.error(failureReason, 'Full AI response:', response);
      // It's important to return an object that matches AiTutorOutputSchema even in error cases
      // or the client might break.
      return { tutorResponse: "I am unable to respond to that request at this time. Please try a different question or check your input." };
    }
    return response.output;
  }
);

