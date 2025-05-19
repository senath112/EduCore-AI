
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { aiTutor } from '@/ai/flows/ai-tutor';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/ai-tutor';
import { saveFlaggedResponse, saveAIResponseFeedback } from '@/services/user-service'; // Added saveAIResponseFeedback
import type { AIResponseFeedbackLog } from '@/services/user-service'; // Added AIResponseFeedbackLog
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Send, User, Bot, Loader2, Flag, Paperclip, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react'; // Added ThumbsUp, ThumbsDown
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [isFlagConfirmDialogOpen, setIsFlagConfirmDialogOpen] = useState(false);
  const [flaggingMessageDetails, setFlaggingMessageDetails] = useState<{ messageId: string, messageContent: string } | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});


  const currentCredits = userProfile?.credits;
  const hasSufficientCredits = userProfile?.isAdmin || (typeof currentCredits === 'number' && currentCredits > 0);

  const canSubmitMessage = !isAISending && !profileLoading && (currentMessage.trim() !== '' || !!selectedImageFile) && (userProfile?.isAdmin || hasSufficientCredits);

  // Effect to set initial greeting and clear messages
  useEffect(() => {
    if (profileLoading) return;

    setMessages([]); // Clear messages on user, subject, or language change to start fresh.
    setFeedbackGiven({}); // Reset feedback given status

    if (user) {
      const greetingContent = `Hello! I'm your AI Learning Assistant for ${subject} in ${language}. How can I assist you today?`;
      const greetingMessage: Message = {
        id: `greeting-${Date.now()}-${Math.random()}`,
        role: 'tutor',
        content: greetingContent,
        timestamp: new Date().toISOString(),
      };
      setMessages([greetingMessage]);
    }

    // Clear any pending file selection
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setSelectedImageFile(null);
    setCurrentMessage('');
    if (fileInputRef.current) fileInputRef.current.value = "";

  }, [user, subject, language, profileLoading]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages, isAISending]);


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
    if (!userProfile?.isAdmin && !hasSufficientCredits) {
      toast({ variant: "destructive", title: "Out of Credits", description: "Please add more credits." });
      return;
    }

    setIsAISending(true);

    let imageDataUriForAI: string | undefined = undefined;
    let studentAttachmentForUI: MessageAttachment | undefined = undefined;

    if (selectedImageFile) {
      try {
        imageDataUriForAI = await convertFileToDataUri(selectedImageFile);
        studentAttachmentForUI = {
            name: selectedImageFile.name,
            type: 'image',
            previewUrl: imagePreviewUrl!,
        }
      } catch (error) {
        console.error("Error converting file to data URI:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process the image file." });
        setIsAISending(false);
        return;
      }
    }

    const studentMessageContent = currentMessage;
    const studentMessage: Message = {
        id: `student-${Date.now()}-${Math.random()}`,
        role: 'student',
        content: studentMessageContent,
        timestamp: new Date().toISOString(),
        attachment: studentAttachmentForUI,
    };
    setMessages(prevMessages => [...prevMessages, studentMessage]);

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

      if (!userProfile?.isAdmin) {
        const creditDeducted = await deductCreditForAITutor();
        if (!creditDeducted && result.tutorResponse) {
            toast({
                variant: "destructive",
                title: "Credit Issue",
                description: "Could not deduct credit. Your balance might be outdated.",
            });
        }
      }

      const tutorResponse: Message = {
        id: `tutor-${Date.now()}-${Math.random()}`,
        role: 'tutor',
        content: result.tutorResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, tutorResponse]);

    } catch (error: any) {
      console.error("Error with AI Tutor:", error);
      const errorMsg = error.message || "Failed to get response from AI Tutor. Please try again.";
      toast({ variant: "destructive", title: "AI Tutor Error", description: errorMsg });

      const errorResponse: Message = {
          id: `tutor-error-${Date.now()}`,
          role: 'tutor',
          content: "I'm sorry, I encountered an error. Please try asking again.",
          timestamp: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, errorResponse]);
    } finally {
      setIsAISending(false);
    }
  };

  const openFlagConfirmationDialog = (messageId: string, messageContent: string) => {
    setFlaggingMessageDetails({ messageId, messageContent });
    setIsFlagConfirmDialogOpen(true);
  };

  const confirmFlagMessage = async () => {
    if (!user || !flaggingMessageDetails) {
      toast({ variant: "destructive", title: "Error", description: "Cannot flag response. User or message details missing." });
      setIsFlagConfirmDialogOpen(false);
      setFlaggingMessageDetails(null);
      return;
    }
    try {
      const userDisplayName = userProfile?.displayName || user.displayName || null;
      const chatHistorySnapshot = messages.map(m => ({ role: m.role, content: m.content }));

      await saveFlaggedResponse(
        user.uid,
        userDisplayName,
        flaggingMessageDetails.messageId,
        flaggingMessageDetails.messageContent,
        subject,
        language,
        chatHistorySnapshot
      );
      toast({ title: "Response Flagged", description: "Thank you for your feedback!" });
    } catch (error) {
      console.error("Failed to flag response:", error);
      toast({ variant: "destructive", title: "Flagging Failed", description: "Could not submit feedback." });
    } finally {
      setIsFlagConfirmDialogOpen(false);
      setFlaggingMessageDetails(null);
    }
  };

  const handleResponseFeedback = async (messageId: string, messageContent: string, feedbackType: 'up' | 'down') => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to give feedback." });
      return;
    }
    if (feedbackGiven[messageId]) {
      toast({ title: "Feedback Already Submitted", description: "You've already provided feedback for this message." });
      return;
    }

    const feedbackData: AIResponseFeedbackLog = {
      userId: user.uid,
      userDisplayName: userProfile?.displayName || user.displayName || "Anonymous",
      messageId,
      aiResponseContent: messageContent,
      feedbackType,
      subject,
      language,
      timestamp: new Date().toISOString(),
    };

    try {
      await saveAIResponseFeedback(feedbackData);
      setFeedbackGiven(prev => ({ ...prev, [messageId]: feedbackType }));
      toast({ title: "Feedback Submitted", description: "Thank you for helping us improve!" });
    } catch (error) {
      console.error("Failed to save AI response feedback:", error);
      toast({ variant: "destructive", title: "Feedback Error", description: "Could not submit your feedback." });
    }
  };


  let placeholderText = "Ask a question or request an explanation...";
  if (profileLoading) {
    placeholderText = "Loading profile & credits...";
  } else if (!userProfile?.isAdmin && !hasSufficientCredits && user) {
    placeholderText = "You are out of credits. Please add more.";
  }


  return (
    <>
    <Card className="w-full shadow-xl flex flex-col flex-grow">
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className="flex-grow w-full p-4" ref={scrollAreaRef}>
        <TooltipProvider>
          {profileLoading && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {messages.map((msg) => {
            const isInitialGreeting = msg.id.startsWith('greeting-');
            const isErrorMessage = msg.content === "I'm sorry, I encountered an error. Please try asking again.";
            const canShowFeedbackButtons = msg.role === 'tutor' && !isInitialGreeting && !isErrorMessage;

            return (
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
              {msg.role === 'tutor' && !isInitialGreeting && !isErrorMessage && (
                <div className="flex flex-col sm:flex-row items-center gap-0.5 self-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-1 opacity-50 hover:opacity-100"
                        onClick={() => handleResponseFeedback(msg.id, msg.content, 'up')}
                        disabled={!!feedbackGiven[msg.id] || isAISending}
                      >
                        <ThumbsUp className={`h-4 w-4 ${feedbackGiven[msg.id] === 'up' ? 'text-primary fill-primary' : ''}`} />
                        <span className="sr-only">Helpful</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Helpful</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-1 opacity-50 hover:opacity-100"
                        onClick={() => handleResponseFeedback(msg.id, msg.content, 'down')}
                        disabled={!!feedbackGiven[msg.id] || isAISending}
                      >
                        <ThumbsDown className={`h-4 w-4 ${feedbackGiven[msg.id] === 'down' ? 'text-destructive fill-destructive' : ''}`} />
                        <span className="sr-only">Not Helpful</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Not Helpful</p></TooltipContent>
                  </Tooltip>
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-1 opacity-50 hover:opacity-100"
                        onClick={() => openFlagConfirmationDialog(msg.id, msg.content)}
                        disabled={isAISending}
                      >
                        <Flag className="h-4 w-4" />
                        <span className="sr-only">Flag this response</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Flag response for review</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          );
        })}
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
            disabled={isAISending || profileLoading || (!userProfile?.isAdmin && !hasSufficientCredits && !!user)}
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
            disabled={isAISending || profileLoading || (!userProfile?.isAdmin && !hasSufficientCredits && !!user)}
          />
          <Button type="submit" disabled={!canSubmitMessage} size="icon" aria-label="Send message">
            {isAISending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>

    {flaggingMessageDetails && (
        <AlertDialog open={isFlagConfirmDialogOpen} onOpenChange={setIsFlagConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Flagging</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to flag this AI response as incorrect or problematic?
                This will submit the response and current chat context for review.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setFlaggingMessageDetails(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmFlagMessage}>Confirm Flag</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
