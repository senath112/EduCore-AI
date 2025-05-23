
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AddMCQQuestionFormValues } from '@/lib/schemas';
import { useSettings } from '@/hooks/use-settings'; // For subject
import { useToast } from '@/hooks/use-toast';
import { bulkAddMCQQuestionsToQuiz } from '@/services/quiz-service';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions-flow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, ListChecks, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BulkAddQuestionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quizDetails: { id: string; title: string } | null;
  onQuestionsAdded: () => void;
}

const BulkAddSchema = z.object({
  bulkText: z.string().min(10, "Please paste at least one question in the correct format."),
});
type BulkAddFormValues = z.infer<typeof BulkAddSchema>;

const VALID_ANSWER_KEYS = ["A", "B", "C", "D", "E"] as const;

export default function BulkAddQuestionsDialog({
  isOpen,
  onOpenChange,
  quizDetails,
  onQuestionsAdded,
}: BulkAddQuestionsDialogProps) {
  const { toast } = useToast();
  const { subject } = useSettings();
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState('3');
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);
  const [showAiGenerationFields, setShowAiGenerationFields] = useState(false);

  const form = useForm<BulkAddFormValues>({
    resolver: zodResolver(BulkAddSchema),
    defaultValues: {
      bulkText: '',
    },
  });

  const parseBulkText = (text: string): { questions: AddMCQQuestionFormValues[], errors: string[] } => {
    const questions: AddMCQQuestionFormValues[] = [];
    const errors: string[] = [];
    const questionBlocks = text.trim().split(/\n\s*\n+/);

    questionBlocks.forEach((block, index) => {
      const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length !== 7) {
        errors.push(`Question block ${index + 1} has an incorrect number of lines (expected 7 lines: 1 for question, 5 for options, 1 for answer). Found ${lines.length} lines.`);
        return;
      }
      const [questionText, optA, optB, optC, optD, optE, answerLine] = lines;
      if (!answerLine.toUpperCase().startsWith("ANSWER:")) {
        errors.push(`Question block ${index + 1}: Answer line must start with "ANSWER:".`);
        return;
      }
      const correctAnswer = answerLine.substring(7).trim().toUpperCase() as AddMCQQuestionFormValues['correctAnswer'];
      if (!VALID_ANSWER_KEYS.includes(correctAnswer)) {
        errors.push(`Question block ${index + 1}: Invalid correct answer key "${correctAnswer}". Must be A, B, C, D, or E.`);
        return;
      }
      if (!questionText || !optA || !optB || !optC || !optD || !optE) {
        errors.push(`Question block ${index + 1}: Question text or one of the options is empty.`);
        return;
      }
      questions.push({
        questionText, optionA: optA, optionB: optB, optionC: optC, optionD: optD, optionE: optE, correctAnswer,
      });
    });
    return { questions, errors };
  };

  const handleManualSubmit = async (values: BulkAddFormValues) => {
    if (!quizDetails) {
      toast({ variant: "destructive", title: "Error", description: "Quiz details are missing." });
      return;
    }
    setIsProcessing(true);
    const { questions: parsedQuestions, errors: parsingErrors } = parseBulkText(values.bulkText);
    if (parsingErrors.length > 0) {
      toast({
        variant: "destructive", title: "Parsing Errors Found",
        description: (
          <ScrollArea className="h-20"><ul className="list-disc list-inside">
            {parsingErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul></ScrollArea>
        ), duration: 10000,
      });
      setIsProcessing(false); return;
    }
    if (parsedQuestions.length === 0) {
      toast({ variant: "destructive", title: "No Questions Found", description: "No valid questions were parsed from the input." });
      setIsProcessing(false); return;
    }
    try {
      const result = await bulkAddMCQQuestionsToQuiz(quizDetails.id, parsedQuestions);
      if (result.errorCount > 0) {
        toast({
          variant: "destructive", title: `Partial Success: ${result.successCount} questions added.`,
          description: (
            <ScrollArea className="h-20"><p>{result.errorCount} questions failed:</p><ul className="list-disc list-inside">
              {result.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul></ScrollArea>
          ), duration: 15000,
        });
      } else {
        toast({ title: "Questions Added!", description: `${result.successCount} MCQ questions have been added to quiz "${quizDetails.title}".` });
      }
      onQuestionsAdded(); form.reset(); setShowAiGenerationFields(false); setAiTopic(''); setAiNumQuestions('3'); onOpenChange(false);
    } catch (error: any) {
      console.error("Error bulk adding MCQ questions:", error);
      toast({ variant: "destructive", title: "Bulk Add Failed", description: error.message || "Could not add the questions." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!quizDetails) {
      toast({ variant: "destructive", title: "Error", description: "Quiz details missing for AI generation." }); return;
    }
    if (!aiTopic.trim()) {
      toast({ variant: "destructive", title: "Input Required", description: "Please enter a topic for AI question generation." }); return;
    }
    const numQs = parseInt(aiNumQuestions, 10);
    if (isNaN(numQs) || numQs < 1 || numQs > 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Number of questions must be between 1 and 10." }); return;
    }
    setIsGeneratingAiQuestions(true);
    try {
      const aiInput = {
        subject: subject, quizTitle: quizDetails.title, classContext: "Advanced Level students in Sri Lanka", topic: aiTopic, numberOfQuestions: numQs,
      };
      const result = await generateQuizQuestions(aiInput);
      if (result.questionsText) {
        form.setValue('bulkText', result.questionsText);
        toast({ title: "AI Questions Generated!", description: "Questions pasted into the text area. Please review and then submit." });
      } else {
        toast({ variant: "destructive", title: "AI Generation Failed", description: "The AI did not return any questions." });
      }
    } catch (error: any) {
      console.error("Error generating questions with AI:", error);
      toast({ variant: "destructive", title: "AI Generation Error", description: error.message || "Could not generate questions with AI." });
    } finally {
      setIsGeneratingAiQuestions(false);
    }
  };

  if (!quizDetails) return null;

  const exampleFormat = `Example format for one question:
What is 2 + 2?
3
4
5
6
7
ANSWER: B

(Separate multiple question blocks with one or more blank lines)
  `.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6" /> Bulk Add MCQ Questions to "{quizDetails.title}"
          </DialogTitle>
          <DialogDescription>
            Paste your questions in the format specified below, or use AI to generate them.
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" onClick={() => setShowAiGenerationFields(!showAiGenerationFields)} className="my-3 w-full sm:w-auto self-start">
          <Sparkles className="mr-2 h-4 w-4" />
          {showAiGenerationFields ? 'Hide AI Generation' : 'Generate with AI'}
        </Button>

        {showAiGenerationFields && (
          <Card className="p-4 my-2 border-dashed">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>AI Question Generation</CardTitle>
              <CardDescription>Provide a topic and number of questions for the AI.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div>
                <Label htmlFor="aiTopic">Topic</Label>
                <Input 
                  id="aiTopic" 
                  value={aiTopic} 
                  onChange={(e) => setAiTopic(e.target.value)} 
                  placeholder="e.g., Cell Biology, Newton's Laws"
                  disabled={isGeneratingAiQuestions}
                />
              </div>
              <div>
                <Label htmlFor="aiNumQuestions">Number of Questions (1-10)</Label>
                <Input 
                  id="aiNumQuestions" 
                  type="number" 
                  value={aiNumQuestions} 
                  onChange={(e) => setAiNumQuestions(e.target.value)} 
                  min="1" 
                  max="10"
                  disabled={isGeneratingAiQuestions}
                />
              </div>
              <Button onClick={handleAiGenerate} disabled={isGeneratingAiQuestions || isProcessing} className="w-full">
                {isGeneratingAiQuestions ? <Loader2 className="animate-spin" /> : 'Start AI Generation'}
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Separator className="my-4"/>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleManualSubmit)} className="flex-grow flex flex-col overflow-hidden"> {/* Form takes remaining space and handles its own overflow for children */}
            <ScrollArea className="flex-grow min-h-0 pr-3"> {/* ScrollArea grows to fill space, min-h-0 allows shrinking */}
              <div className="space-y-4 py-4"> {/* Padding applied inside scrollable area */}
                <div className="p-3 border rounded-md bg-muted/50 text-sm">
                  <p className="font-semibold mb-1">Manual Input Format (per question):</p>
                  <pre className="whitespace-pre-wrap text-xs">
                    {`Question text (single line)
Option A text
Option B text
Option C text
Option D text
Option E text
ANSWER: <A|B|C|D|E>`}
                  </pre>
                  <p className="text-xs mt-2">Separate each question block with at least one blank line.</p>
                </div>
                <FormField
                  control={form.control}
                  name="bulkText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Questions (Paste Here or Use AI Generation Above)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={exampleFormat}
                          {...field}
                          disabled={isProcessing || isGeneratingAiQuestions}
                          className="min-h-[200px] font-mono text-sm" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-3 mt-auto border-t"> {/* Footer sticks to bottom of form, border-t for visual separation */}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing || isGeneratingAiQuestions}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing || isGeneratingAiQuestions}>
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Process & Add Questions'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

