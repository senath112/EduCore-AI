
"use client";

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { aiTutor } from '@/ai/flows/ai-tutor';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/ai-tutor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card'; 
import { Send, User, Bot, Loader2 } from 'lucide-react'; 
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: 'student' | 'tutor';
  content: string;
};

export default function ChatInterface() {
  const { subject, language } = useSettings();
  const { userProfile, deductCreditForAITutor, profileLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const currentCredits = userProfile?.credits;
  const hasCredits = typeof currentCredits === 'number' && currentCredits > 0;
  const canSendMessage = !isLoading && !profileLoading && currentMessage.trim() !== '';


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);
  
  useEffect(() => {
    setMessages([
      {
        id: 'initial_tutor_greeting',
        role: 'tutor',
        content: `Hello! I'm your AI Learning Assistant for ${subject} in ${language}. How can I assist you today?`,
      },
    ]);
  }, [subject, language]);


  const handleSendMessage = async () => {
    if (!canSendMessage) return;

    if (profileLoading) {
      toast({
        title: "Loading profile...",
        description: "Please wait while your profile information is being loaded.",
      });
      return;
    }
    
    if (typeof currentCredits !== 'number') {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not determine your credit balance. Please try refreshing.",
        });
        return;
    }

    if (currentCredits <= 0) {
      toast({
        variant: "destructive",
        title: "Out of Credits",
        description: "You have run out of credits. Please contact support or earn more to continue.",
      });
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'student',
      content: currentMessage,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(msg => ({ role: msg.role, content: msg.content }));
      const input: AiTutorInput = {
        subject,
        language,
        studentMessage: newMessage.content,
        chatHistory, 
      };
      const result: AiTutorOutput = await aiTutor(input);

      // Deduct credit AFTER successful AI response
      const creditDeducted = await deductCreditForAITutor();
      if (!creditDeducted) {
        // This case should ideally be rare if initial checks pass,
        // but good to handle (e.g., Firebase update failed)
        toast({
            variant: "destructive",
            title: "Credit Deduction Failed",
            description: "Could not deduct credit. Your balance might not be up to date.",
        });
      }

      const tutorResponse: Message = {
        id: Date.now().toString() + '_tutor',
        role: 'tutor',
        content: result.tutorResponse,
      };
      setMessages((prevMessages) => [...prevMessages, tutorResponse]);

    } catch (error) {
      console.error("Error with AI Tutor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get response from AI Tutor. Please try again.",
      });
      const errorResponse: Message = {
        id: Date.now().toString() + '_error',
        role: 'tutor',
        content: "I'm sorry, I encountered an error. Please try asking again.",
      };
      setMessages((prevMessages) => [...prevMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  let placeholderText = "Ask a question or request an explanation...";
  if (profileLoading) {
    placeholderText = "Loading profile & credits...";
  } else if (typeof currentCredits === 'number' && currentCredits <= 0) {
    placeholderText = "You are out of credits.";
  }


  return (
    <Card className="w-full shadow-xl flex flex-col flex-grow">
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className="flex-grow w-full p-4 border-b" ref={scrollAreaRef}> 
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 mb-4 ${
                msg.role === 'student' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'tutor' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={18}/></AvatarFallback>
                </Avatar>
              )}
              <div
                className={`p-3 rounded-lg max-w-[70%] shadow-md ${
                  msg.role === 'student'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'student' && (
                 <Avatar className="h-8 w-8">
                   <AvatarFallback><User size={18}/></AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 mb-4 justify-start">
              <Avatar className="h-8 w-8">
                 <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
              <div className="p-3 rounded-lg bg-card text-card-foreground border shadow-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex w-full items-center gap-2"
        >
          <Input
            type="text"
            placeholder={placeholderText}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="flex-grow"
            disabled={isLoading || profileLoading || !hasCredits}
          />
          <Button type="submit" disabled={!canSendMessage || !hasCredits} size="icon" aria-label="Send message">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
