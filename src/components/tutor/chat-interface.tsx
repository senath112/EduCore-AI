
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { aiTutor } from '@/ai/flows/ai-tutor';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/ai-tutor';
import { saveFlaggedResponse, type UserProfile } from '@/services/user-service'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Send, User, Bot, Loader2, Flag, Paperclip, XCircle, ThumbsUp, ThumbsDown, Lock, AlertTriangle, Calculator } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DynamicChartRenderer from './dynamic-chart-renderer';
import { SUBJECTS } from '@/lib/constants';

type MessageAttachment = {
  name: string;
  previewUrl: string;
  type: 'image';
};

type ChartDataPoint = { name: string; value: number; [key: string]: any };

type Message = {
  id: string;
  role: 'student' | 'tutor';
  content: string;
  timestamp?: string;
  attachment?: MessageAttachment;
  chartType?: "bar" | "line" | "pie";
  chartData?: ChartDataPoint[];
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
  const settings = useSettings();
  const { user, userProfile, loading: authLoading, profileLoading, deductCreditForAITutor, triggerStreakUpdate, recaptchaRef } = useAuth();
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
  
  const lastContextKeyForGreeting = useRef<string | null>(null);
  const greetingSentForCurrentContext = useRef<boolean>(false);

  const [isGeoGebraDialogOpen, setIsGeoGebraDialogOpen] = useState(false);

  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

 useEffect(() => {
    const currentContextKey = `${user?.uid || 'nouser'}_${settings.subject}_${settings.language}_${settings.learningMode}`;

    if (lastContextKeyForGreeting.current !== currentContextKey) {
        lastContextKeyForGreeting.current = currentContextKey;
        greetingSentForCurrentContext.current = false; // Reset flag when context changes
        setMessages([]); // Clear messages for a new context
    }

    if (user && !greetingSentForCurrentContext.current && !authLoading && !profileLoading && messages.length === 0) {
        let greetingContent = "";
        const currentSubjectDetails = SUBJECTS.find(s => s.value === settings.subject);
        const personalityName = currentSubjectDetails?.tutorPersonality || `your AI Learning Assistant for ${settings.subject}`;

        if (settings.learningMode === 'deep') {
            greetingContent = `Deep Learning Mode for ${settings.subject} in ${settings.language} activated. How can I assist you with advanced concepts?`;
        } else {
            greetingContent = `Hello! I am ${personalityName}. I specialize in ${settings.subject} and I'll be assisting you in ${settings.language}. How may I help you today?`;
            if (settings.subject === 'ICT') {
                greetingContent += " For comprehensive study, please also refer to the Advanced Level ICT resource book provided by the Sri Lankan government.";
            }
        }
        const newGreetingMessage: Message = {
          id: `greeting-${Date.now()}-${Math.random()}`,
          role: 'tutor',
          content: greetingContent,
          timestamp: new Date().toISOString(),
        };
        setMessages([newGreetingMessage]);
        greetingSentForCurrentContext.current = true;
    } else if (!user && lastContextKeyForGreeting.current !== null) {
        setMessages([]);
        lastContextKeyForGreeting.current = null;
        greetingSentForCurrentContext.current = false;
    }
  }, [user, settings.subject, settings.language, settings.learningMode, authLoading, profileLoading, messages.length]);


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

  const isPrivilegedUser = userProfile?.isAdmin || userProfile?.isTeacher;
  const costForCurrentMode = settings.learningMode === 'deep' ? 3 : 1;

  const canInteract = (() => {
    if (authLoading || profileLoading) return false;
    if (!user) return false;
    if (!userProfile) return false;
    if (isPrivilegedUser) return true;
    return (userProfile.credits ?? 0) >= costForCurrentMode;
  })();

  const isInputDisabled = isAISending || !canInteract;

  const canSubmitMessage = !isAISending && (currentMessage.trim() !== '' || !!selectedImageFile) && canInteract;

  const handleSendMessage = async () => {
    if (isRecaptchaEnabled && recaptchaRef.current) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA. Please try again." });
          if(recaptchaRef.current) recaptchaRef.current.reset();
          return;
        }
        console.warn("ChatInterface reCAPTCHA token:", token, "IMPORTANT: This token MUST be verified server-side for security.");
        if(recaptchaRef.current) recaptchaRef.current.reset();
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "An error occurred during reCAPTCHA verification." });
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    if (!user || !userProfile) {
      if (!user) toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in." });
      else if (!userProfile) toast({ variant: "destructive", title: "Profile Loading", description: "User profile is still loading. Please wait." });
      return;
    }
    
    const costForThisMessage = settings.learningMode === 'deep' ? 3 : 1;
    if (!isPrivilegedUser && (userProfile.credits ?? 0) < costForThisMessage) {
        toast({ variant: "destructive", title: "Insufficient Credits", description: `You need ${costForThisMessage} credits for this interaction. You have ${userProfile.credits ?? 0}.` });
        return;
    }

    if (profileLoading) {
      toast({ title: "Loading profile...", description: "Please wait."});
      return;
    }

    setIsAISending(true);
    await triggerStreakUpdate();

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
        .filter(msg => !msg.id.startsWith('greeting-')) 
        .map(msg => ({ role: msg.role, content: msg.content }));
      if (studentMessageContent) {
          chatHistoryForAI.push({role: 'student', content: studentMessageContent});
      }

      const input: AiTutorInput = {
        subject: settings.subject,
        language: settings.language,
        studentMessage: messageToSendToAI,
        imageDataUri: imageDataUriForAI,
        chatHistory: chatHistoryForAI,
        learningMode: settings.learningMode,
      };

      const result: AiTutorOutput = await aiTutor(input);

      if (!isPrivilegedUser) {
        const creditDeducted = await deductCreditForAITutor(costForThisMessage);
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
        chartType: result.chartType,
        chartData: result.chartData,
      };
      setMessages(prevMessages => [...prevMessages, tutorResponse]);

    } catch (error: any)
{
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
    if (!user) {
        toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to flag a response." });
        return;
    }
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
    console.log('Attempting to save flagged response. UserID:', user.uid, 'MessageID:', flaggingMessageDetails.messageId, 'Content snippet:', flaggingMessageDetails.messageContent.substring(0, 50));
    try {
      const userDisplayName = userProfile?.displayName || user.displayName || "Anonymous";
      const chatHistorySnapshot = messages 
        .filter(m => !m.id.startsWith('greeting-'))
        .map(m => ({ role: m.role, content: m.content }));

      await saveFlaggedResponse(
        user.uid,
        userDisplayName,
        flaggingMessageDetails.messageId,
        flaggingMessageDetails.messageContent,
        settings.subject,
        settings.language,
        chatHistorySnapshot
      );
      toast({ title: "Response Flagged", description: "Thank you for your feedback!" });
    } catch (error: any) {
      console.error("Failed to flag response:", error);
      toast({ variant: "destructive", title: "Flagging Failed", description: error.message || "Could not submit feedback." });
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

    const feedbackData = { 
      userId: user.uid,
      userDisplayName: userProfile?.displayName || user.displayName || "Anonymous",
      messageId,
      aiResponseContent: messageContent,
      feedbackType,
      subject: settings.subject,
      language: settings.language,
      timestamp: new Date().toISOString(),
    };

    console.log("Feedback submitted (simulated):", feedbackData);
    // In a real app, save feedbackData to Firebase here
    // Example: await saveAIResponseFeedback(feedbackData);
    setFeedbackGiven(prev => ({ ...prev, [messageId]: feedbackType }));
    toast({ title: "Feedback Submitted", description: "Thank you for helping us improve!" });
  };
  
  const handleOpenGraphingCalculatorDialog = () => {
    setIsGeoGebraDialogOpen(true);
  };


  let placeholderText = "Ask a question or request an explanation...";
  if (authLoading || profileLoading) {
    placeholderText = "Loading profile & credits...";
  } else if (!user) {
    placeholderText = "Please log in to chat.";
  } else if (!userProfile) {
    placeholderText = "Finalizing your profile setup...";
  } else if (!isPrivilegedUser && (userProfile.credits ?? 0) < costForCurrentMode) {
    placeholderText = `Insufficient credits (need ${costForCurrentMode}).`;
  }


  return (
    <>
    <Card className="w-full shadow-xl flex flex-col flex-grow">
      <CardContent className="p-0 flex-grow flex flex-col">
        <ScrollArea className="flex-grow w-full p-4" ref={scrollAreaRef}>
        <TooltipProvider>
          {profileLoading && !user && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {messages.map((msg) => {
            const isInitialGreeting = msg.id.startsWith('greeting-');
            const isErrorMessage = msg.content === "I'm sorry, I encountered an error. Please try asking again." || (msg.role === 'tutor' && msg.content.includes("I find myself unable to respond"));
            
            let tutorAvatarUrl: string | undefined = undefined;
            let tutorFallbackText: string = '';

            if (msg.role === 'tutor') {
              const currentSubjectDetails = SUBJECTS.find(s => s.value === settings.subject);
              tutorAvatarUrl = currentSubjectDetails?.imageUrl;
              tutorFallbackText = currentSubjectDetails?.tutorPersonality?.charAt(0) || 'AI';
            }

            return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 mb-4 ${
                msg.role === 'student' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'tutor' && (
                <Avatar className="h-8 w-8">
                  {tutorAvatarUrl ? (
                    <AvatarImage key={tutorAvatarUrl} src={tutorAvatarUrl} alt={settings.subject + " Tutor"} />
                  ) : null}
                  <AvatarFallback>
                    {tutorAvatarUrl ? tutorFallbackText.toUpperCase() : <Bot size={18}/>}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`p-3 rounded-lg max-w-[70%] shadow-md ${
                  msg.role === 'student'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground'
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
                      unoptimized 
                    />
                    <p className="text-xs mt-1 italic">{msg.attachment.name}</p>
                  </div>
                )}
                <p
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={formatBoldText(msg.content)}
                />
                {msg.role === 'tutor' && msg.chartType && msg.chartData && msg.chartData.length > 0 && (
                  <DynamicChartRenderer chartType={msg.chartType} chartData={msg.chartData} />
                )}
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
                        disabled={isAISending || isInitialGreeting}
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
              <div className="p-3 rounded-lg bg-card text-card-foreground shadow-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t flex flex-col">
        {selectedImageFile && imagePreviewUrl && (
          <div className="mb-2 p-2 border rounded-md relative flex items-center gap-2 bg-muted w-full">
            <Image
              src={imagePreviewUrl}
              alt="Preview"
              width={40}
              height={40}
              className="rounded object-cover"
              unoptimized 
            />
            <span className="text-sm truncate max-w-[150px]">{selectedImageFile.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={clearSelectedFile} disabled={isAISending}>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isInputDisabled}
                  aria-label="Attach image"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Attach Image</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
            id="file-upload-input"
            disabled={isInputDisabled}
          />
          <Input
            type="text"
            placeholder={placeholderText}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="flex-grow"
            disabled={isInputDisabled}
          />
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenGraphingCalculatorDialog}
                    disabled={isAISending || authLoading || profileLoading || !user}
                    aria-label="Open Graphing Calculator"
                  >
                    <Calculator className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>Open Graphing Calculator</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              <AlertDialogCancel onClick={() => { setFlaggingMessageDetails(null); setIsFlagConfirmDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmFlagMessage}>Confirm Flag</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={isGeoGebraDialogOpen} onOpenChange={setIsGeoGebraDialogOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-6xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Graphing Calculator (GeoGebra)</DialogTitle>
          </DialogHeader>
          <iframe
            src="https://www.geogebra.org/graphing"
            title="GeoGebra Graphing Calculator"
            className="flex-grow border-0"
            width="100%"
            height="100%"
            allowFullScreen
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
