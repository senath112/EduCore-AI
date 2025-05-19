
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserProfileWithId } from '@/services/user-service';
import { adminUpdateUserProfile } from '@/services/user-service';
import type { AdminEditUserFormValues } from '@/lib/schemas';
import { AdminEditUserFormSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: UserProfileWithId | null;
  onUserUpdated: () => void;
}

export default function EditUserDialog({ isOpen, onOpenChange, userToEdit, onUserUpdated }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminEditUserFormValues>({
    resolver: zodResolver(AdminEditUserFormSchema),
    defaultValues: {
      displayName: '',
      age: undefined,
      alFacingYear: undefined,
      phoneNumber: '',
      credits: 0,
      isAdmin: false,
    },
  });

  useEffect(() => {
    if (userToEdit && isOpen) {
      form.reset({
        displayName: userToEdit.displayName || '',
        age: userToEdit.age,
        alFacingYear: userToEdit.alFacingYear,
        phoneNumber: userToEdit.phoneNumber || '',
        credits: typeof userToEdit.credits === 'number' ? userToEdit.credits : 0,
        isAdmin: !!userToEdit.isAdmin,
      });
    }
  }, [userToEdit, isOpen, form]);

  const onSubmit = async (values: AdminEditUserFormValues) => {
    if (!userToEdit) {
      toast({ variant: "destructive", title: "Error", description: "No user selected for editing." });
      return;
    }
    setIsLoading(true);

    const updatePayload: Partial<UserProfileWithId> = {
      displayName: values.displayName, // Will be handled by schema transform if empty
      age: values.age,
      alFacingYear: values.alFacingYear,
      phoneNumber: values.phoneNumber,
      credits: values.credits,
      isAdmin: values.isAdmin,
    };
    
    try {
      await adminUpdateUserProfile(userToEdit.id, updatePayload);
      toast({ title: "User Updated", description: `${userToEdit.displayName || userToEdit.email}'s profile has been updated.` });
      onUserUpdated(); // This will re-fetch users and close dialog via onOpenChange(false) in parent
    } catch (error: any) {
      console.error("Error updating user profile by admin:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update user profile." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User: {userToEdit.displayName || userToEdit.email}</DialogTitle>
          <DialogDescription>
            Modify the details for this user. Email and PhotoURL are not editable here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="User's display name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="User's age" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={isLoading} />
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
                    <Input type="number" placeholder="e.g., 2025" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={isLoading} />
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
            <FormField
              control={form.control}
              name="credits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credits</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="User's credits" {...field} onChange={e => field.onChange(Number(e.target.value))} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                  <div className="space-y-0.5">
                    <FormLabel>Administrator Status</FormLabel>
                    <FormDescription>
                      Grant or revoke admin privileges for this user.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                      aria-readonly
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
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
