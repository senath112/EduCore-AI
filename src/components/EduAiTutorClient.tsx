
// src/components/EduAiTutorClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/shared/Header";
import { ChatMessagesList } from "@/components/chat/ChatMessagesList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
import { handleTutorQueryAction, handleSummarizeFileAction, deductUserCreditsAction } from "@/lib/actions";
import { fileToDataUri } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Language, Subject, Message } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const AI_INTERACTION_COST = 1;

export function EduAiTutorClient() {
  const authContext = useAuth();
  const { user, loading: authLoading, updateLocalUserCredits } = authContext;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Biology");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetInitialMessages, setHasSetInitialMessages] = useState(false); // Flag to track initial message setup
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Effect to set initial messages or reset on logout
  useEffect(() => {
    if (user && !hasSetInitialMessages) {
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
          content: `Welcome to EduCore AI! I'm here to help you with ${selectedSubject} in ${selectedLanguage}. Ask me anything! (Each interaction costs ${AI_INTERACTION_COST} credit).`,
          timestamp: new Date(Date.now() + 1),
        },
      ]);
      setHasSetInitialMessages(true);
    } else if (!user) {
      // User logged out
      setMessages([]);
      setHasSetInitialMessages(false);
    }
  }, [user, selectedSubject, selectedLanguage, hasSetInitialMessages]);


  // Effect to update the content of the second welcome message if subject or language changes
  // after initial messages have been set.
  useEffect(() => {
    if (user && hasSetInitialMessages && messages.length > 0) {
        setMessages(prevMessages => {
            const welcomeMessageIndex = prevMessages.findIndex(msg => msg.id === "initial-greeting-2");
            if (welcomeMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                const currentWelcomeMessage = updatedMessages[welcomeMessageIndex];
                const newWelcomeContent = `Welcome to EduCore AI! I'm here to help you with ${selectedSubject} in ${selectedLanguage}. Ask me anything! (Each interaction costs ${AI_INTERACTION_COST} credit).`;

                // Only update if content actually changes to avoid unnecessary re-renders/scrolls
                if (currentWelcomeMessage.content !== newWelcomeContent) {
                    updatedMessages[welcomeMessageIndex] = {
                        ...currentWelcomeMessage,
                        content: newWelcomeContent,
                        timestamp: new Date(Date.now() + 1) // Update timestamp to reflect change
                    };
                    return updatedMessages;
                }
            }
            return prevMessages;
        });
    }
  }, [user, selectedSubject, selectedLanguage, hasSetInitialMessages, messages.length]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const addMessage = (role: "user" | "assistant" | "system", content: Message["content"], file?: { name: string, dataUri?: string }) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: Date.now().toString(), role, content, timestamp: new Date(), file },
    ]);
  };

  const handleSendMessage = async (messageText: string, file?: File) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to send messages.", variant: "destructive" });
      router.push("/login");
      return;
    }
    if (messageText.trim() === "" && !file) return;

    if (user.credits === undefined || user.credits < AI_INTERACTION_COST) {
      toast({ title: "Insufficient Credits", description: `You need at least ${AI_INTERACTION_COST} credit(s) for this action. You have ${user.credits !== undefined ? user.credits : 0}.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const userMessageContent = messageText.trim() || (file ? `Question about the attached file: ${file.name}` : "File attached.");
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
      question: messageText.trim(),
      language: selectedLanguage,
      subject: selectedSubject,
      fileDataUri,
    });

    if ("error" in response) {
      addMessage("system", `Error: ${response.error}`);
      toast({ title: "AI Tutor Error", description: response.error, variant: "destructive" });
    } else {
      addMessage("assistant", response);
      const deductionResult = await deductUserCreditsAction(user.uid, AI_INTERACTION_COST);
      if (deductionResult.success && deductionResult.newCredits !== undefined) {
        updateLocalUserCredits(deductionResult.newCredits);
        toast({ title: "Credits Updated", description: `${AI_INTERACTION_COST} credit(s) deducted. New balance: ${deductionResult.newCredits}.`, variant: "default" });
      } else {
        toast({ title: "Credit Deduction Failed", description: deductionResult.error || "Could not update credits automatically. Please check your balance.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  const handleSummarizeFile = async (file: File) => {
     if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to summarize files.", variant: "destructive" });
      router.push("/login");
      return;
    }

    if (user.credits === undefined || user.credits < AI_INTERACTION_COST) {
      toast({ title: "Insufficient Credits", description: `You need at least ${AI_INTERACTION_COST} credit(s) for this action. You have ${user.credits !== undefined ? user.credits : 0}.`, variant: "destructive" });
      return;
    }

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
      const deductionResult = await deductUserCreditsAction(user.uid, AI_INTERACTION_COST);
      if (deductionResult.success && deductionResult.newCredits !== undefined) {
        updateLocalUserCredits(deductionResult.newCredits);
        toast({ title: "Credits Updated", description: `${AI_INTERACTION_COST} credit(s) deducted. New balance: ${deductionResult.newCredits}.`, variant: "default" });
      } else {
        toast({ title: "Credit Deduction Failed", description: deductionResult.error || "Could not update credits automatically. Please check your balance.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-8">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
        <p className="text-muted-foreground mt-4">Loading EduCore AI...</p>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex flex-col h-screen items-center justify-center bg-background p-8">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
      />
      <ChatMessagesList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
      <ChatInputArea
        onSendMessage={handleSendMessage}
        onSummarizeFile={handleSummarizeFile}
        isLoading={isLoading}
      />
    </div>
  );
}

