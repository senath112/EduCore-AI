// src/components/EduAiTutorClient.tsx
"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/shared/Header";
import { ChatMessagesList } from "@/components/chat/ChatMessagesList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
import { handleTutorQueryAction, handleSummarizeFileAction } from "@/lib/actions";
import { fileToDataUri } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Language, Subject, Message } from "@/types";

export function EduAiTutorClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Biology");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Effect to add initial greeting messages
  useEffect(() => {
    setMessages([
      {
        id: "initial-greeting-1",
        role: "system",
        content: "Hello!",
        timestamp: new Date(),
      },
      {
        id: "initial-greeting-2",
        role: "system",
        content: `Welcome to EduAI Tutor! I'm here to help you with ${selectedSubject} in ${selectedLanguage}. Ask me anything!`,
        timestamp: new Date(Date.now() + 1), // Ensure slightly different timestamp for ordering
      },
    ]);
  }, []); // Empty dependency array means this runs once on mount


  const addMessage = (role: "user" | "assistant" | "system", content: Message["content"], file?: { name: string, dataUri?: string }) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: Date.now().toString(), role, content, timestamp: new Date(), file },
    ]);
  };

  const handleSendMessage = async (messageText: string, file?: File) => {
    if (messageText === "" && !file) return;

    setIsLoading(true);
    const userMessageContent = messageText || (file ? `Question about the attached file: ${file.name}` : "File attached.");
    // Do not pass dataUri to addMessage for user message, it's only needed for the backend
    addMessage("user", userMessageContent, file ? {name: file.name} : undefined);

    let fileDataUri: string | undefined;
    if (file) {
      try {
        fileDataUri = await fileToDataUri(file);
      } catch (error) {
        console.error("Error converting file to data URI:", error);
        toast({ title: "File Error", description: "Could not process the attached file.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    const response = await handleTutorQueryAction({
      question: messageText,
      language: selectedLanguage,
      subject: selectedSubject,
      fileDataUri,
    });

    if ("error" in response) {
      addMessage("system", `Error: ${response.error}`);
      toast({ title: "AI Tutor Error", description: response.error, variant: "destructive" });
    } else {
      addMessage("assistant", response);
    }
    setIsLoading(false);
  };

  const handleSummarizeFile = async (file: File) => {
    setIsLoading(true);
    addMessage("user", `Please summarize this file: ${file.name}`, {name: file.name});

    let fileDataUri: string;
    try {
      fileDataUri = await fileToDataUri(file);
    } catch (error) {
      console.error("Error converting file to data URI:", error);
      toast({ title: "File Error", description: "Could not process the attached file.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const response = await handleSummarizeFileAction({
      fileDataUri,
      language: selectedLanguage,
      subject: selectedSubject,
    });

    if ("error" in response) {
      addMessage("system", `Error summarizing file: ${response.error}`);
      toast({ title: "Summarization Error", description: response.error, variant: "destructive" });
    } else {
      addMessage("assistant", response);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
      />
      <ChatMessagesList messages={messages} isLoading={isLoading} />
      <ChatInputArea
        onSendMessage={handleSendMessage}
        onSummarizeFile={handleSummarizeFile}
        isLoading={isLoading}
      />
    </div>
  );
}

