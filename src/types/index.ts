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
    dataUri?: string; // Only for display if needed, actual dataUri sent to backend
  };
}
