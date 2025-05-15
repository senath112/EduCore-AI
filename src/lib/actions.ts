
// src/lib/actions.ts
"use server";

import { reasonStepByStep, ReasonStepByStepInput, ReasonStepByStepOutput } from "@/ai/flows/reason-step-by-step";
import { summarizeFileUpload, SummarizeFileUploadInput, SummarizeFileUploadOutput } from "@/ai/flows/summarize-file-upload";
import type { Language, Subject } from "@/types";
import { db } from "@/lib/firebase";
import { ref, get, update, serverTimestamp } from "firebase/database";


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

export async function deductUserCreditsAction(
  userId: string,
  creditsToDeduct: number
): Promise<{ success: boolean; newCredits?: number; error?: string }> {
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }
  if (creditsToDeduct <= 0) {
    return { success: false, error: "Credits to deduct must be positive." };
  }

  const userRef = ref(db, `users/${userId}`);

  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      return { success: false, error: "User not found." };
    }

    const userData = snapshot.val();
    const currentCredits = userData.credits !== undefined ? userData.credits : 0;

    if (currentCredits < creditsToDeduct) {
      return { success: false, error: "Insufficient credits." };
    }

    const newCredits = currentCredits - creditsToDeduct;
    await update(userRef, { credits: newCredits });

    return { success: true, newCredits };
  } catch (error) {
    console.error("Error deducting credits:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to deduct credits." };
  }
}
