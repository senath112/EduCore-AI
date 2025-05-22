
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateQuizFormSchema, type CreateQuizFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createQuiz } from '@/services/quiz-service';
import type { ClassData } from '@/services/class-service';
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
import { Loader2, FilePlus2 } from 'lucide-react';

interface CreateQuizDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classData: Pick<ClassData, 'id' | 'name'> | null; // Use Pick for specific fields
  onQuizCreated: () => void;
}

export default function CreateQuizDialog({ 
  isOpen, 
  onOpenChange, 
  classData, 
  onQuizCreated 
}: CreateQuizDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<CreateQuizFormValues>({
    resolver: zodResolver(CreateQuizFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (values: CreateQuizFormValues) => {
    if (!user || !userProfile || !classData) {
      toast({ variant: "destructive", title: "Error", description: "User or class information is missing." });
      return;
    }
    setIsProcessing(true);
    try {
      await createQuiz({
        classId: classData.id,
        className: classData.name,
        teacherId: user.uid,
        teacherName: userProfile.displayName || user.email || "Unknown Teacher",
        title: values.title,
        description: values.description,
      });
      toast({ title: "Quiz Created!", description: `Quiz "${values.title}" has been created for class "${classData.name}".` });
      onQuizCreated();
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not create the quiz." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!classData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-6 w-6" /> Create New Quiz for {classData.name}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new quiz. You can add questions later.
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
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Create Quiz'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
