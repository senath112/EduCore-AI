
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddMCQQuestionFormSchema, type AddMCQQuestionFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { addMCQQuestionToQuiz } from '@/services/quiz-service';
import type { MCQOptionId } from '@/services/quiz-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ListPlus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface AddMCQQuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quizDetails: { id: string; title: string } | null;
  onQuestionAdded: () => void;
}

const optionIds: MCQOptionId[] = ['A', 'B', 'C', 'D', 'E'];

export default function AddMCQQuestionDialog({
  isOpen,
  onOpenChange,
  quizDetails,
  onQuestionAdded,
}: AddMCQQuestionDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<AddMCQQuestionFormValues>({
    resolver: zodResolver(AddMCQQuestionFormSchema),
    defaultValues: {
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      optionE: '',
      correctAnswer: undefined,
    },
  });

  const onSubmit = async (values: AddMCQQuestionFormValues) => {
    if (!quizDetails) {
      toast({ variant: "destructive", title: "Error", description: "Quiz details are missing." });
      return;
    }
    setIsProcessing(true);
    try {
      // This function call saves the question to the database via the quiz service
      await addMCQQuestionToQuiz(quizDetails.id, values);
      toast({ title: "Question Added!", description: `MCQ question has been added to quiz "${quizDetails.title}".` });
      onQuestionAdded(); // Callback to refresh the list on the parent page
      form.reset();
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      console.error("Error adding MCQ question:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not add the question." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!quizDetails) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-6 w-6" /> Add MCQ Question to "{quizDetails.title}"
          </DialogTitle>
          <DialogDescription>
            Provide the question text, five multiple-choice options, and mark the correct answer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter the full question here..." {...field} disabled={isProcessing} className="min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(['optionA', 'optionB', 'optionC', 'optionD', 'optionE'] as const).map((optionKey, index) => (
                  <FormField
                    key={optionKey}
                    control={form.control}
                    name={optionKey}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option {String.fromCharCode(65 + index)}</FormLabel>
                        <FormControl>
                          <Input placeholder={`Text for option ${String.fromCharCode(65 + index)}`} {...field} disabled={isProcessing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="correctAnswer"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                          disabled={isProcessing}
                        >
                          {optionIds.map((id) => (
                            <FormItem key={id} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={id} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Option {id}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Add Question'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
