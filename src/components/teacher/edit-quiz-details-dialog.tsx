
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateQuizFormSchema, type CreateQuizFormValues } from '@/lib/schemas'; // Re-use schema
import { useToast } from '@/hooks/use-toast';
import { updateQuizDetails, type QuizData } from '@/services/quiz-service';
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
import { Loader2, FileEdit } from 'lucide-react';

interface EditQuizDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quizData: QuizData | null;
  onQuizUpdated: () => void;
}

export default function EditQuizDetailsDialog({
  isOpen,
  onOpenChange,
  quizData,
  onQuizUpdated,
}: EditQuizDetailsDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<CreateQuizFormValues>({
    resolver: zodResolver(CreateQuizFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (quizData && isOpen) {
      form.reset({
        title: quizData.title,
        description: quizData.description,
      });
    }
  }, [quizData, isOpen, form]);

  const onSubmit = async (values: CreateQuizFormValues) => {
    if (!quizData) {
      toast({ variant: "destructive", title: "Error", description: "No quiz data provided for editing." });
      return;
    }
    setIsProcessing(true);
    try {
      await updateQuizDetails(quizData.id, {
        title: values.title,
        description: values.description,
      });
      toast({ title: "Quiz Updated", description: `Details for quiz "${values.title}" have been updated.` });
      onQuizUpdated();
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      console.error("Error updating quiz details:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update quiz details." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!quizData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-6 w-6" /> Edit Quiz Details: {quizData.title}
          </DialogTitle>
          <DialogDescription>
            Modify the title and description for this quiz.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chapter 1 Review" {...field} disabled={isProcessing} />
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
                  <FormLabel>Quiz Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief overview of the quiz content..."
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
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
