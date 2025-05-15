
// src/components/dialogs/CompleteProfileDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserCog, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppUser } from "@/types";

const profileSchema = z.object({
  school: z.string().min(1, "School name is required."),
  alYear: z.string().regex(/^\d{4}$/, "A/L Year must be a 4-digit year (e.g., 2025)."),
  mobileNumber: z.string().min(1, "Mobile number is required.").regex(/^\+?[0-9\s-()]{7,15}$/, "Please enter a valid mobile number."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CompleteProfileDialogProps {
  user: AppUser; // To prefill if needed, though usually for new Google users these are empty
  onClose: () => void;
}

export function CompleteProfileDialog({ user, onClose }: CompleteProfileDialogProps) {
  const { updateUserProfileDetails, loading: authLoading, authError, setAuthError } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      school: user.school || "",
      alYear: user.alYear || "",
      mobileNumber: user.mobileNumber || "",
    },
  });

   useEffect(() => {
    // Reset form if user details change (e.g., if dialog re-opens for some reason with different user)
    form.reset({
      school: user.school || "",
      alYear: user.alYear || "",
      mobileNumber: user.mobileNumber || "",
    });
  }, [user, form]);

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSubmitting(true);
    setAuthError(null);
    const success = await updateUserProfileDetails(data);
    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your additional details have been saved.",
      });
      onClose(); // This will close the dialog
    } else {
      // authError will be set by the context, so we don't need to toast it here again
      // but we can ensure the form remains for correction
    }
    setIsSubmitting(false);
  };

  return (
    <DialogContent className="sm:max-w-md p-6 rounded-lg shadow-xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
      <DialogHeader className="mb-4">
        <div className="flex items-center gap-3 mb-2 justify-center">
          <UserCog className="h-10 w-10 text-accent" />
          <DialogTitle className="text-2xl font-bold text-center">Complete Your Profile</DialogTitle>
        </div>
        <DialogDescription className="text-center text-muted-foreground">
          Please provide a few more details to complete your EduCore AI account setup.
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Update Failed</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School</FormLabel>
                <FormControl>
                  <Input placeholder="Your School Name" {...field} className="bg-muted/30"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>A/L Year (e.g., 2025)</FormLabel>
                <FormControl>
                  <Input placeholder="YYYY" {...field} className="bg-muted/30"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., +947XXXXXXXX" {...field} type="tel" className="bg-muted/30"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <DialogFooter className="sm:justify-center mt-6 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting || authLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting || authLoading ? "Saving..." : "Save Details"}
            </Button>
            {/* Optionally, add a "Skip" button if desired, which would call onClose and perhaps set a flag in user profile */}
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

