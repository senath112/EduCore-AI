import type { User as FirebaseUser } from "firebase/auth";

export type Language = "English" | "Sinhala";
export type Subject = "Biology" | "Combined Maths" | "Physics" | "Chemistry";

export interface ChatMessageContentReasoning {
  reasoning: string[];
  answer: string;
}

export interface ChatMessageContentSummary {
  summary: string;
  explanations: string;
}

export type ChatMessageContent = string | ChatMessageContentReasoning | ChatMessageContentSummary;

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: ChatMessageContent;
  timestamp: Date;
  file?: {
    name: string;
    dataUri?: string;
  };
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null; // Or combine with email for display
  school?: string;
  alYear?: string;
  mobileNumber?: string; // Added mobile number
}
