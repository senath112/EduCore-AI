
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { aiTutor } from '@/ai/flows/ai-tutor';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/ai-tutor';
import { saveChatMessage, loadChatHistory, type StoredChatMessage, type StoredChatMessageAttachment } from '@/services/user-service';
import { saveUserQuestion, saveFlaggedResponse } from '@/services/user-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Send, User, Bot, Loader2, Flag, Paperclip, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MessageAttachment = {
  name: string;
  previewUrl: string;
  type: 'image';
};

type Message = {
  id: string;
  role: 'student' | 'tutor';
  content: string;
  timestamp?: string;
  attachment?: MessageAttachment;
};

const formatBoldText = (text: string) => {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const escapeHtml = (unsafeText: string) => {
    return unsafeText
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };
  const html = escapeHtml(text).replace(boldPattern, '<strong>$1</strong>');
  return { __html: html };
};


export default function ChatInterface() {
  const { subject, language } = useSettings();
  const { user, userProfile, deductCreditForAITutor, profileLoading } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAISending, setIsAISending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [greetingSentForContext, setGreetingSentForContext] = useState<string | null>(null);


  const currentCredits = userProfile?.credits;
  const hasSufficientCredits = typeof currentCredits === 'number' && currentCredits > 0;

  const canSubmitMessage = !isAISending && !isHistoryLoading && !profileLoading && (currentMessage.trim() !== '' || !!selectedImageFile);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages, isAISending]);

  // Effect for loading chat history - primarily depends on the user
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsHistoryLoading(false);
      setGreetingSentForContext(null); // Reset greeting tracker on logout
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      setSelectedImageFile(null);
      return;
    }

    setIsHistoryLoading(true); // Start loading when user is available

    const unsubscribe = loadChatHistory(user.uid, (loadedDbMessages) => {
      const formattedMessages: Message[] = loadedDbMessages.map(dbMsg => ({
        id: dbMsg.id!,
        role: dbMsg.role,
        content: dbMsg.content,
        timestamp: dbMsg.timestamp,
        attachment: dbMsg.attachment ? {
          name: dbMsg.attachment.name,
          type: dbMsg.attachment.type as 'image',
          previewUrl: '', // Historical attachments won't have a local preview URL generated this way
        } : undefined,
      }));
      setMessages(formattedMessages);
      setIsHistoryLoading(false); // Finish loading
    });

    return () => {
      unsubscribe();
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl); // Clean up object URL on component unmount or user change
      }
    };
  }, [user]); // Re-run only if the user object itself changes (login/logout)

  // Effect for sending the initial greeting based on context (user, subject, language)
  useEffect(() => {
    if (!user || isHistoryLoading || profileLoading) {
      return; // Don't do anything if no user, or history/profile is still loading
    }

    const currentContextKey = `${user.uid}_${subject}_${language}`;

    // If messages are loaded (isHistoryLoading is false), actual message history is empty,
    // and greeting hasn't been sent for this specific context yet:
    if (messages.length === 0 && greetingSentForContext !== currentContextKey) {
      const greeting = `Hello! I'm your AI Learning Assistant for ${subject} in ${language}. How can I assist you today?`;
      saveChatMessage(user.uid, 'tutor', greeting);
      // Mark that greeting has been sent for this context to prevent duplicates
      setGreetingSentForContext(currentContextKey);
    } else if (messages.length > 0 && greetingSentForContext !== currentContextKey) {
      // If history exists, but context changed (e.g., user switched subject/language),
      // mark this context as "greeted" to prevent a new greeting on top of existing messages.
      setGreetingSentForContext(currentContextKey);
    }
  }, [user, subject, language, messages, isHistoryLoading, profileLoading, greetingSentForContext]);


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearSelectedFile = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertFileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };


  const handleSendMessage = async () => {
    if (!canSubmitMessage || !user) {
      if (!user) toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in." });
      return;
    }
    if (profileLoading) {
      toast({ title: "Loading profile...", description: "Please wait."});
      return;
    }
    if (!hasSufficientCredits) {
      toast({ variant: "destructive", title: "Out of Credits", description: "Please add more credits." });
      return;
    }

    setIsAISending(true);

    let imageDataUriForAI: string | undefined = undefined;
    let studentAttachmentForDB: StoredChatMessageAttachment | undefined = undefined;

    if (selectedImageFile) {
      try {
        imageDataUriForAI = await convertFileToDataUri(selectedImageFile);
        studentAttachmentForDB = {
          name: selectedImageFile.name,
          type: 'image',
        };
      } catch (error) {
        console.error("Error converting file to data URI:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process the image file." });
        setIsAISending(false);
        return;
      }
    }

    const studentMessageContent = currentMessage;
    await saveChatMessage(user.uid, 'student', studentMessageContent, studentAttachmentForDB);

    try {
      const userDisplayName = userProfile?.displayName || user.displayName || null;
      await saveUserQuestion(user.uid, userDisplayName, studentMessageContent + (studentAttachmentForDB ? ` [Attached: ${studentAttachmentForDB.name}]` : ''));
    } catch (error) {
      console.error("Failed to save user question:", error);
    }

    const messageToSendToAI = currentMessage;
    setCurrentMessage('');
    clearSelectedFile();

    try {
      const chatHistoryForAI = messages
        .filter(msg => msg.role === 'student' || msg.role === 'tutor')
        .map(msg => ({ role: msg.role, content: msg.content }));

      const input: AiTutorInput = {
        subject,
        language,
        studentMessage: messageToSendToAI,
        imageDataUri: imageDataUriForAI,
        chatHistory: chatHistoryForAI,
      };

      const result: AiTutorOutput = await aiTutor(input);
      const creditDeducted = await deductCreditForAITutor();
      if (!creditDeducted && result.tutorResponse) {
        toast({
            variant: "destructive",
            title: "Credit Issue",
            description: "Could not deduct credit. Your balance might be outdated.",
        });
      }
      await saveChatMessage(user.uid, 'tutor', result.tutorResponse);

    } catch (error: any) {
      console.error("Error with AI Tutor:", error);
      const errorMsg = error.message || "Failed to get response from AI Tutor. Please try again.";
      toast({ variant: "destructive", title: "AI Tutor Error", description: errorMsg });
      await saveChatMessage(user.uid, 'tutor', "I'm sorry, I encountered an error. Please try asking again.");
    } finally {
      setIsAISending(false);
    }
  };

  const handleFlagMessage = async (messageId: string, messageContent: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to flag a response." });
      return;
    }
    try {
      const userDisplayName = userProfile?.displayName || user.displayName || null;
      const chatHistorySnapshot = messages.slice(0, messages.findIndex(m => m.id === messageId) + 1)
                                      .map(m => ({ role: m.role, content: m.content }));

      await saveFlaggedResponse(
        user.uid,
        userDisplayName,
        messageId,
        messageContent,
        subject,
        language,
        chatHistorySnapshot
      );
      toast({ title: "Response Flagged", description: "Thank you for your feedback!" });
    } catch (error) {
      console.error("Failed to flag response:", error);
      toast({ variant: "destructive", title: "Flagging Failed", description: "Could not submit feedback." });
    }
  };

  let placeholderText = "Ask a question or request an explanation...";
  if (isHistoryLoading) {
    placeholderText = "Loading chat history...";
  } else if (profileLoading) {
    placeholderText = "Loading profile & credits...";
  } else if (!hasSufficientCredits && user) {
    placeholderText = "You are out of credits. Please add more.";
  }


  return (
    <Card className="w-full shadow-xl flex flex-col flex-grow">
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className="flex-grow w-full p-4" ref={scrollAreaRef}>
        <TooltipProvider>
          {isHistoryLoading && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                {msg.attachment && msg.attachment.type === 'image' && msg.attachment.previewUrl && (
                  <div className="mb-2">
                    <Image
                      src={msg.attachment.previewUrl}
                      alt={msg.attachment.name}
                      width={150}
                      height={150}
                      className="rounded-md object-cover"
                    />
                    <p className="text-xs mt-1 italic">{msg.attachment.name}</p>
                  </div>
                )}
                 {msg.attachment && msg.attachment.type === 'image' && !msg.attachment.previewUrl && (
                    <div className="mb-2 p-2 border rounded-md bg-muted/50 text-xs italic">
                      Image attached: {msg.attachment.name} (preview not available for historical attachments)
                    </div>
                  )}
                <p
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={formatBoldText(msg.content)}
                />
              </div>
              {msg.role === 'student' && (
                 <Avatar className="h-8 w-8">
                   <AvatarFallback><User size={18}/></AvatarFallback>
                 </Avatar>
              )}
              {msg.role === 'tutor' &&
                !msg.content.startsWith("Hello! I'm your AI Learning Assistant for") &&
                msg.content !== "I'm sorry, I encountered an error. Please try asking again." &&
                (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-7 w-7 p-1 opacity-50 hover:opacity-100"
                      onClick={() => handleFlagMessage(msg.id, msg.content)}
                      disabled={isAISending}
                    >
                      <Flag className="h-4 w-4" />
                      <span className="sr-only">Flag this response</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Flag this response</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
          </TooltipProvider>
          {isAISending && (
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
      <CardFooter className="p-4 border-t">
        {selectedImageFile && imagePreviewUrl && (
          <div className="mb-2 p-2 border rounded-md relative flex items-center gap-2 bg-muted">
            <Image src={imagePreviewUrl} alt="Preview" width={40} height={40} className="rounded object-cover"/>
            <span className="text-sm truncate max-w-[150px]">{selectedImageFile.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={clearSelectedFile}>
              <XCircle className="h-4 w-4"/>
            </Button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex w-full items-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
            id="file-upload-input"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAISending || isHistoryLoading || profileLoading || (!hasSufficientCredits && !!user)}
            aria-label="Attach image"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            placeholder={placeholderText}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="flex-grow"
            disabled={isAISending || isHistoryLoading || profileLoading || (!hasSufficientCredits && !!user)}
          />
          <Button type="submit" disabled={!canSubmitMessage || (!hasSufficientCredits && !!user)} size="icon" aria-label="Send message">
            {isAISending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

