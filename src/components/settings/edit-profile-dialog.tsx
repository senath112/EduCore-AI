
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { saveUserData } from '@/services/user-service';
import type { CompleteProfileFormValues } from '@/lib/schemas'; // Re-use schema
import { CompleteProfileFormSchema } from '@/lib/schemas';      // Re-use schema
import { Button } from '@/components/ui/button';
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
import { Loader2 } from 'lucide-react';

interface EditProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ isOpen, onOpenChange }: EditProfileDialogProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
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

  useEffect(() => {
    if (isOpen && userProfile) {
      form.reset({
        age: userProfile.age,
        alFacingYear: userProfile.alFacingYear,
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [isOpen, userProfile, form]);

  const onSubmit = async (values: CompleteProfileFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    setIsLoading(true);
    try {
      // Construct data to save, ensuring existing fields in userProfile are not overwritten if not in form
      // This is important because userProfile might contain more fields like email, displayName, photoURL, credits
      // which are not part of this specific form but should be preserved.
      const dataToSave = {
        // Retain other profile data not directly edited in this form
        email: userProfile?.email,
        displayName: userProfile?.displayName,
        photoURL: userProfile?.photoURL,
        credits: userProfile?.credits,
        createdAt: userProfile?.createdAt,
        // Update with form values
        age: values.age,
        alFacingYear: values.alFacingYear,
        phoneNumber: values.phoneNumber,
      };
      await saveUserData(user, dataToSave);
      await refreshUserProfile();
      toast({ title: "Profile Updated", description: "Your details have been successfully updated." });
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update your profile." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
          <DialogDescription>
            Update your personal information. Make sure your changes are accurate.
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
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
