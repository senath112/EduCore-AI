
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { sendJoinRequest } from '@/services/user-service';
import type { ClassData } from '@/services/class-service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/services/user-service';
import { Button } from '@/components/ui/button';
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
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ClassJoinRequestSchema, type ClassJoinRequestFormValues } from '@/lib/schemas';

interface RequestToJoinClassDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classToJoin: ClassData | null;
  user: User;
  userProfile: UserProfile;
  onJoinRequestSent: () => void;
}

export default function RequestToJoinClassDialog({
  isOpen,
  onOpenChange,
  classToJoin,
  user,
  userProfile,
  onJoinRequestSent,
}: RequestToJoinClassDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const { recaptchaRef } = useAuth(); // Get the global ref from context
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";

  const form = useForm<ClassJoinRequestFormValues>({
    resolver: zodResolver(ClassJoinRequestSchema),
    defaultValues: {
      message: '',
    },
  });

  const onSubmit = async (values: ClassJoinRequestFormValues) => {
    if (!classToJoin) {
      toast({ variant: "destructive", title: "Error", description: "Class information is missing." });
      return;
    }
    setIsProcessing(true);

    if (isRecaptchaEnabled && recaptchaRef.current) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify. Please try again." });
          setIsProcessing(false);
          recaptchaRef.current.reset();
          return;
        }
      } catch (error) {
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Verification error." });
        setIsProcessing(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    try {
      await sendJoinRequest(classToJoin.id, user.uid, userProfile.displayName || user.email, user.email, values.message);
      toast({ title: "Request Sent", description: `Your request to join "${classToJoin.name}" has been sent to the teacher for approval.` });
      onJoinRequestSent();
    } catch (error: any) {
      console.error("Error sending join request:", error);
      toast({ variant: "destructive", title: "Failed to Send Request", description: error.message || "Could not send your request." });
    } finally {
      setIsProcessing(false);
      if (recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  if (!classToJoin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to Join "{classToJoin.name}"</DialogTitle>
          <DialogDescription>
            Your request will be sent to the instructor, {classToJoin.instructorName}, for approval. You can add an optional message.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional Message to Instructor</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Hi, I'm a student from the morning batch."
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
                {isProcessing ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
