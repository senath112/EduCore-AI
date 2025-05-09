// src/components/chat/ChatMessagesList.tsx
"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import type { Message } from "@/types";

interface ChatMessagesListProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessagesList({ messages, isLoading }: ChatMessagesListProps) {
  const scrollAreaRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const viewportRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-grow p-4 md:p-6" ref={scrollAreaRef}>
      <div ref={viewportRef} className="h-full">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="ml-2 text-muted-foreground">EduAI is thinking...</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
