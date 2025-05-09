// src/lib/actions.ts
"use server";

import { reasonStepByStep, ReasonStepByStepInput, ReasonStepByStepOutput } from "@/ai/flows/reason-step-by-step";
import { summarizeFileUpload, SummarizeFileUploadInput, SummarizeFileUploadOutput } from "@/ai/flows/summarize-file-upload";
import type { Language, Subject } from "@/types";

interface TutorQueryInput {
  question: string;
  language: Language;
  subject: Subject;
  fileDataUri?: string;
}

export async function handleTutorQueryAction(input: TutorQueryInput): Promise<ReasonStepByStepOutput | { error: string }> {
  try {
    const aiInput: ReasonStepByStepInput = {
      question: input.question,
      language: input.language,
      subject: input.subject,
    };
    if (input.fileDataUri) {
      aiInput.fileDataUri = input.fileDataUri;
    }
    const result = await reasonStepByStep(aiInput);
    return result;
  } catch (error) {
    console.error("Error in handleTutorQueryAction:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred with the AI Tutor." };
  }
}

interface SummarizeFileInput {
  fileDataUri: string;
  language: Language;
  subject: Subject;
}

export async function handleSummarizeFileAction(input: SummarizeFileInput): Promise<SummarizeFileUploadOutput | { error: string }> {
  try {
    const aiInput: SummarizeFileUploadInput = {
      fileDataUri: input.fileDataUri,
      language: input.language,
      subject: input.subject,
    };
    const result = await summarizeFileUpload(aiInput);
    return result;
  } catch (error) {
    console.error("Error in handleSummarizeFileAction:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred while summarizing the file." };
  }
}
