
// src/lib/actions.ts
"use server";

import { reasonStepByStep, ReasonStepByStepInput, ReasonStepByStepOutput } from "@/ai/flows/reason-step-by-step";
import { summarizeFileUpload, SummarizeFileUploadInput, SummarizeFileUploadOutput } from "@/ai/flows/summarize-file-upload";
import type { Language, Subject } from "@/types";
import { db } from "@/lib/firebase";
import { ref, get, update, serverTimestamp, increment } from "firebase/database";


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

    // Using increment with a negative value for atomic deduction
    await update(userRef, { credits: increment(-creditsToDeduct) });
    
    // Fetch the updated credits to return the new balance
    const updatedSnapshot = await get(userRef);
    const newCredits = updatedSnapshot.val().credits;

    return { success: true, newCredits };
  } catch (error) {
    console.error("Error deducting credits:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to deduct credits." };
  }
}

export async function addUserCreditsAction(
  userId: string,
  creditsToAdd: number
): Promise<{ success: boolean; newCredits?: number; error?: string }> {
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }
  if (creditsToAdd <= 0) {
    return { success: false, error: "Credits to add must be positive." };
  }

  const userRef = ref(db, `users/${userId}`);

  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      // This case should ideally not happen if the user is logged in
      // but as a safeguard, we can create the user record if it's missing
      // or simply return an error. For now, let's return an error.
      return { success: false, error: "User not found. Cannot add credits." };
    }
    
    // Using increment for atomic addition
    await update(userRef, { credits: increment(creditsToAdd) });

    // Fetch the updated credits to return the new balance
    const updatedSnapshot = await get(userRef);
    const newCredits = updatedSnapshot.val().credits;

    return { success: true, newCredits };
  } catch (error)
  {
    console.error("Error adding credits:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add credits." };
  }
}
