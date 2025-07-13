
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { generateSupportId } from '@/lib/supportUtils';
import type { SupportTicketLog } from '@/services/user-service';
import { saveSupportTicket } from '@/services/user-service';
import type { SupportRequestFormValues } from '@/lib/schemas';
import { SupportRequestFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Send, Info } from 'lucide-react';

interface RequestSupportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestSupportDialog({ isOpen, onOpenChange }: RequestSupportDialogProps) {
  const { user, userProfile, recaptchaRef } = useAuth();
  const { subject, language } = useSettings();
  const { toast } = useToast();
  
  const [supportId, setSupportId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";

  const form = useForm<SupportRequestFormValues>({
    resolver: zodResolver(SupportRequestFormSchema),
    defaultValues: {
      comment: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setSupportId(generateSupportId());
      form.reset(); 
    }
  }, [isOpen, form]);

  const onSubmit = async (values: SupportRequestFormValues) => {
    if (!user || !userProfile || !supportId) {
      toast({ variant: "destructive", title: "Error", description: "User not logged in or support ID missing." });
      return;
    }
    setIsProcessing(true);

    if (isRecaptchaEnabled && recaptchaRef.current) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA. Please try again." });
          setIsProcessing(false);
          recaptchaRef.current.reset();
          return;
        }
        console.warn(
          "reCAPTCHA v3 token obtained for Support Ticket Creation:", token,
          "IMPORTANT: This token MUST be verified server-side with your secret key for security."
        );
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "An error occurred during reCAPTCHA verification." });
        setIsProcessing(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    try {
      const ticketData: Omit<SupportTicketLog, 'status' | 'lastUpdatedAt'> = { // Adjusted type
        supportId,
        userId: user.uid,
        userDisplayName: userProfile.displayName || user.displayName || user.email,
        subject,
        language,
        userComment: values.comment,
        timestamp: new Date().toISOString(),
      };

      await saveSupportTicket(ticketData);
      toast({
        title: "Support Request Submitted",
        description: `Your Support ID is: ${supportId}. Please provide this ID when asked.`,
        duration: 10000,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting support request:", error);
      toast({ 
        variant: "destructive", 
        title: "Submission Failed", 
        description: error.message || "Could not submit your support request." 
      });
    } finally {
      setIsProcessing(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Support</DialogTitle>
          <DialogDescription>
            Please describe your issue below. Your Support ID will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        
        {supportId && (
          <div className="my-4 p-3 bg-muted/50 border rounded-md flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Your Support ID:</p>
              <p className="text-lg font-semibold text-primary tracking-wider">{supportId}</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="comment">Describe your issue</FormLabel>
                  <FormControl>
                    <Textarea
                      id="comment"
                      placeholder="Please provide details about the problem you're facing..."
                      className="min-h-[120px]"
                      disabled={isProcessing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing || !supportId}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
