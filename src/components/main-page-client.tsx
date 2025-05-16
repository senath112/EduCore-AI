"use client";

import ChatInterface from "@/components/tutor/chat-interface";
import SubjectSelector from "@/components/shared/subject-selector";
import { MessageCircle } from "lucide-react"; // Though not directly used for tabs, it's part of the overall theme.

export default function MainPageClient() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to EduCore AI</h2>
        <p className="text-muted-foreground mt-2">Your personal AI learning assistant for A-Level subjects. Ask questions, or request explanations for specific concepts!</p>
      </div>
      
      <SubjectSelector />

      <div className="mt-6">
        <ChatInterface />
      </div>
    </div>
  );
}
