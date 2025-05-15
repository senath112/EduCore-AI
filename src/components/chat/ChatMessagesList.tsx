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
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessagesList({ messages, isLoading, messagesEndRef }: ChatMessagesListProps) {
  const scrollAreaRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const viewportRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-grow p-4 md:p-6 bg-background" ref={scrollAreaRef}>
      <div ref={viewportRef} className="h-full space-y-1">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} /> 
        {isLoading && (
          <div className="flex justify-start items-center p-4 pl-12"> {/* Aligns with bot messages */}
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            <p className="ml-3 text-muted-foreground">EduCore AI is thinking...</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
