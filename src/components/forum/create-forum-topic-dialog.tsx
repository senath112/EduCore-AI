
"use client";

import { useState, useRef } from 'react'; // Added useRef
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateForumTopicSchema, type CreateForumTopicFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createForumTopic } from '@/services/forum-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha'; // Added ReCAPTCHA import

interface CreateForumTopicDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTopicCreated: () => void;
}

export default function CreateForumTopicDialog({ isOpen, onOpenChange, onTopicCreated }: CreateForumTopicDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<CreateForumTopicFormValues>({
    resolver: zodResolver(CreateForumTopicSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (values: CreateForumTopicFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to create a topic." });
      return;
    }
    setIsProcessing(true);

    if (isRecaptchaEnabled && recaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA. Please try again." });
          setIsProcessing(false);
          recaptchaRef.current.reset();
          return;
        }
        console.warn(
          "reCAPTCHA v3 token obtained for Forum Topic Creation:", token,
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
      await createForumTopic(
        values.title,
        values.description,
        user.uid,
        userProfile.displayName || user.email
      );
      toast({ title: "Topic Created!", description: `Your new topic "${values.title}" has been created.` });
      onTopicCreated(); 
      form.reset();
      onOpenChange(false); 
    } catch (error: any) {
      console.error("Error creating forum topic:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not create the topic." });
    } finally {
      setIsProcessing(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {isRecaptchaEnabled && recaptchaSiteKey && (
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={recaptchaSiteKey}
            size="invisible"
          />
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-6 w-6" /> Create New Forum Topic
          </DialogTitle>
          <DialogDescription>
            Provide a clear title and a brief description for your new discussion topic.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tips for A/L Physics Revision" {...field} disabled={isProcessing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short summary of what this topic is about..."
                      className="min-h-[100px]"
                      disabled={isProcessing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Create Topic'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
