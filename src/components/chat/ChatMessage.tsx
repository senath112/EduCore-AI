// src/components/chat/ChatMessage.tsx
"use client";

import { User, Bot, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatBoldText } from "@/lib/utils";
import type { Message, ChatMessageContentReasoning, ChatMessageContentSummary } from "@/types";

interface ChatMessageProps {
  message: Message;
}

function isReasoning(content: any): content is ChatMessageContentReasoning {
  return content && typeof content === "object" && Array.isArray(content.reasoning) && typeof content.answer === "string";
}

function isSummary(content: any): content is ChatMessageContentSummary {
  return content && typeof content === "object" && typeof content.summary === "string" && typeof content.explanations === "string";
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div className={cn("flex items-start gap-3 my-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Icon className="h-8 w-8 text-accent rounded-full flex-shrink-0 mt-1" />}
      <Card className={cn("max-w-2xl shadow-sm", isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground")}>
        <CardContent className="p-4">
          {message.file && (
            <div className="mb-2 p-2 border border-border rounded-md bg-background/50 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Attached: {message.file.name}</span>
            </div>
          )}

          {(() => {
            if (isReasoning(message.content)) {
              const { reasoning, answer } = message.content;
              if (reasoning && reasoning.length > 0) {
                return (
                  <div>
                    <h4 className="font-semibold mb-2 text-lg">Reasoning Steps:</h4>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      {reasoning.map((step, index) => (
                        <li key={index}>{formatBoldText(step)}</li>
                      ))}
                    </ul>
                    <h4 className="font-semibold mb-1 text-lg">Final Answer:</h4>
                    <p className="whitespace-pre-wrap">{formatBoldText(answer)}</p>
                  </div>
                );
              } else {
                // Simple response (e.g. greeting), no reasoning steps
                return <p className="whitespace-pre-wrap">{formatBoldText(answer)}</p>;
              }
            } else if (isSummary(message.content)) {
              const { summary, explanations } = message.content;
              return (
                <div>
                  <h4 className="font-semibold mb-2 text-lg">Summary:</h4>
                  <p className="whitespace-pre-wrap mb-3">{formatBoldText(summary)}</p>
                  <h4 className="font-semibold mb-1 text-lg">Explanations:</h4>
                  <p className="whitespace-pre-wrap">{formatBoldText(explanations)}</p>
                </div>
              );
            } else if (typeof message.content === 'string') {
              return <p className="whitespace-pre-wrap">{formatBoldText(message.content)}</p>;
            }
            return null; 
          })()}
          
          <p className="text-xs text-muted-foreground/80 mt-2 text-right">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>
      {isUser && <Icon className="h-8 w-8 text-primary-foreground bg-accent p-1.5 rounded-full flex-shrink-0 mt-1" />}
    </div>
  );
}
