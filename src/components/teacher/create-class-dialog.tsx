
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateClassFormSchema, type CreateClassFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createClass } from '@/services/class-service';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Copy } from 'lucide-react';

interface CreateClassDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreated: (result: { classId: string; friendlyId: string }) => void;
}

export default function CreateClassDialog({ isOpen, onOpenChange, onClassCreated }: CreateClassDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFriendlyIdAlert, setShowFriendlyIdAlert] = useState(false);
  const [generatedFriendlyId, setGeneratedFriendlyId] = useState('');

  const form = useForm<CreateClassFormValues>({
    resolver: zodResolver(CreateClassFormSchema),
    defaultValues: {
      className: '',
      classDescription: '',
    },
  });

  const onSubmit = async (values: CreateClassFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in as a teacher." });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await createClass(
        values.className,
        values.classDescription,
        user.uid, // teacherId
        userProfile.displayName || user.email || "Unknown Teacher" // instructorName
      );
      setGeneratedFriendlyId(result.friendlyId);
      setShowFriendlyIdAlert(true); // Show alert with friendly ID
      onClassCreated(result); // Callback to refresh the list on the parent page
      // onOpenChange(false); // Dialog will be closed by the alert dialog's action
      form.reset(); // Reset form fields
    } catch (error: any) {
      console.error("Error creating class:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not create the class." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyFriendlyId = () => {
    navigator.clipboard.writeText(generatedFriendlyId)
      .then(() => {
        toast({ title: "Copied!", description: "Friendly Class ID copied to clipboard." });
      })
      .catch(err => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy ID." });
      });
  };

  const closeDialogsAndReset = () => {
    setShowFriendlyIdAlert(false);
    onOpenChange(false); // Close the main create class dialog
  }

  return (
    <>
      <Dialog open={isOpen && !showFriendlyIdAlert} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6" /> Create New Class
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new class. The Friendly Class ID will be shown after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="className"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Advanced Physics 101" {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a brief description of the class syllabus and objectives..."
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
                  {isProcessing ? <Loader2 className="animate-spin" /> : 'Create Class'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showFriendlyIdAlert && (
        <AlertDialog open={showFriendlyIdAlert} onOpenChange={setShowFriendlyIdAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Class Created Successfully!</AlertDialogTitle>
              <AlertDialogDescription>
                Your new class has been created. Share the Friendly Class ID below with your students so they can join:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 p-3 bg-muted rounded-md flex items-center justify-between">
              <span className="text-lg font-semibold text-primary tracking-wider mr-2">{generatedFriendlyId}</span>
              <Button variant="ghost" size="icon" onClick={handleCopyFriendlyId} title="Copy ID">
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={closeDialogsAndReset}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
