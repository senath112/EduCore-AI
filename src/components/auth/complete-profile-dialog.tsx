
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { saveUserData } from '@/services/user-service';
import type { CompleteProfileFormValues } from '@/lib/schemas';
import { CompleteProfileFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface CompleteProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CompleteProfileDialog({ isOpen, onOpenChange }: CompleteProfileDialogProps) {
  const { user, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(CompleteProfileFormSchema),
    defaultValues: {
      age: undefined,
      alFacingYear: undefined,
      phoneNumber: '',
    },
  });

  const onSubmit = async (values: CompleteProfileFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    setIsLoading(true);
    try {
      await saveUserData(user, {
        age: values.age,
        alFacingYear: values.alFacingYear,
        phoneNumber: values.phoneNumber,
      });
      await refreshUserProfile();
      toast({ title: "Profile Updated", description: "Your details have been saved." });
      onOpenChange(false); // Close the dialog
      form.reset(); // Reset form for next potential use
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update your profile." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => {
          // Prevent closing by clicking outside to encourage completion
          e.preventDefault();
          toast({
            title: "Details Required",
            description: "Please complete your profile information.",
            variant: "default",
            duration: 3000,
          });
        }}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide a few more details to complete your account setup. This information helps us tailor your experience.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Your age" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alFacingYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>A/L Facing Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2025" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+947XXXXXXXX" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Details'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
