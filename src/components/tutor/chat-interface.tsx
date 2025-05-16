
"use client";

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { aiTutor } from '@/ai/flows/ai-tutor';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/ai-tutor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, User, Bot, Loader2, MessageCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: 'student' | 'tutor';
  content: string;
};

export default function ChatInterface() {
  const { subject, language } = useSettings();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);
  
  useEffect(() => {
    // Clear messages when subject or language changes
    setMessages([]);
  }, [subject, language]);


  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

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

  return (
    <Card className="w-full shadow-xl flex flex-col flex-grow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> AI Learning Assistant ({subject} - {language})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className="flex-grow w-full p-4 border-t border-b" ref={scrollAreaRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle size={48} className="mb-2" />
              <p>Ask me anything about {subject} in {language}, or request an explanation for a specific concept!</p>
            </div>
          )}
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
            placeholder={`Ask about ${subject} or explain a concept...`}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !currentMessage.trim()} size="icon" aria-label="Send message">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
