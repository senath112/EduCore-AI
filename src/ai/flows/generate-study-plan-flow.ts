
'use server';
/**
 * @fileOverview AI flow to generate a study plan for a given task.
 *
 * - generateStudyPlan - A function that handles study plan generation.
 * - GenerateStudyPlanInput - The input type.
 * - GenerateStudyPlanOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Language, Subject } from '@/lib/constants';
import { LANGUAGES, SUBJECTS } from '@/lib/constants';

// Pre-construct the arrays for z.enum
const languageEnumValues = LANGUAGES.map(lang => lang.value) as [Language, ...Language[]];
const subjectEnumValues = SUBJECTS.map(sub => sub.value) as [Subject, ...Subject[]];

const GenerateStudyPlanInputSchema = z.object({
  taskDescription: z.string().min(5, "Task description must be at least 5 characters.").max(500, "Task description cannot exceed 500 characters."),
  subject: z.enum(subjectEnumValues).describe('The subject for the study plan.'),
  language: z.enum(languageEnumValues).describe('The preferred language for the study plan.'),
  mainTaskDurationMinutes: z.coerce.number().min(5).max(720).optional().describe('Optional: The total duration in minutes allocated for this main task.'),
});
export type GenerateStudyPlanInput = z.infer<typeof GenerateStudyPlanInputSchema>;

const GenerateStudyPlanOutputSchema = z.object({
  planDetails: z.string().describe('A formatted string containing the AI-suggested study plan, including sub-tasks, focus areas, and optional time allocations.'),
});
export type GenerateStudyPlanOutput = z.infer<typeof GenerateStudyPlanOutputSchema>;

export async function generateStudyPlan(
  input: GenerateStudyPlanInput
): Promise<GenerateStudyPlanOutput> {
  return generateStudyPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyPlanPrompt',
  input: {schema: GenerateStudyPlanInputSchema},
  output: {schema: GenerateStudyPlanOutputSchema},
  prompt: `
You are an expert academic advisor. Your task is to generate a structured study plan for a student based on their task description, subject, and optionally, a total duration.

Student's Task: "{{taskDescription}}"
Subject: {{subject}}
Language for Plan: {{language}}
{{#if mainTaskDurationMinutes}}
Total Duration Allocated for this Task: {{mainTaskDurationMinutes}} minutes.
{{/if}}

Instructions for Generating the Study Plan:
1.  **Analyze Task**: Understand the core objective of the student's task.
2.  **Sub-Tasks**: Break down the main task into 2-4 logical and manageable sub-tasks.
3.  **Focus Areas/Actions**: For each sub-task, list 1-3 key focus areas or specific actions the student should take.
4.  **Time Allocation (Optional)**:
    *   If 'Total Duration Allocated' is provided, distribute this duration reasonably across the sub-tasks.
    *   Clearly state the suggested time for each sub-task (e.g., "Sub-task 1: [Name] - Approx. X minutes").
    *   If no total duration is provided, do not include time allocations.
5.  **Format**: Present the plan clearly. Use Markdown-like formatting if possible for readability (e.g., headings for sub-tasks, bullet points for focus areas).
    Example (if duration is provided):
    ---
    **Study Plan for: {{taskDescription}}**

    **Sub-Task 1: Understand Core Concepts** (Approx. X minutes)
    *   Focus Area: Review textbook chapter on [specific concept].
    *   Action: Summarize key definitions in your own words.

    **Sub-Task 2: Practice Problems** (Approx. Y minutes)
    *   Focus Area: Work through example problems 1-5.
    *   Action: Identify any problem types you struggle with.
    ---
    Example (if no duration is provided):
    ---
    **Study Plan for: {{taskDescription}}**

    **Sub-Task 1: Foundational Reading**
    *   Read pages X-Y in your textbook covering [topic].
    *   Note down key vocabulary and their meanings.

    **Sub-Task 2: Concept Mapping**
    *   Create a mind map connecting the main ideas from your reading.
    *   Explain these connections to a study partner or rubber duck.
    ---
6.  **Output**: The entire plan should be a single string in the 'planDetails' field. Ensure the plan is in the requested {{language}}.

Generate the study plan now.
`,
});

const generateStudyPlanFlow = ai.defineFlow(
  {
    name: 'generateStudyPlanFlow',
    inputSchema: GenerateStudyPlanInputSchema,
    outputSchema: GenerateStudyPlanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.planDetails || output.planDetails.trim().length < 10) { // Basic check for non-empty plan
        console.error("AI failed to generate a valid study plan, or the plan was too short.", output);
        throw new Error("AI failed to generate a study plan. Please try a different task or ensure your input is clear.");
    }
    return output;
  }
);
