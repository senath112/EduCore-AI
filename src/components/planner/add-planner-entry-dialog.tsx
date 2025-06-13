
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddPlannerEntrySchema, type AddPlannerEntryFormValues } from '@/lib/schemas';
import { SUBJECTS } from '@/lib/constants';
import type { Subject } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { addPlannerEntry } from '@/services/study-planner-service';
import { generateStudyPlan } from '@/ai/flows/generate-study-plan-flow';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, PlusCircle, Lightbulb, CopyIcon } from "lucide-react";
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { cn } from "@/lib/utils";
import ReCAPTCHA from 'react-google-recaptcha';

interface AddPlannerEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryAdded: () => void;
}

const AI_PLANNER_CREDIT_COST = 2;

export default function AddPlannerEntryDialog({ isOpen, onOpenChange, onEntryAdded }: AddPlannerEntryDialogProps) {
  const { user, userProfile, deductCreditForAiPlanner, triggerStreakUpdate } = useAuth();
  const { language } = useSettings();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // For main form submission
  const [isGeneratingAiPlan, setIsGeneratingAiPlan] = useState(false);
  const [aiGeneratedPlan, setAiGeneratedPlan] = useState<string | null>(null);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<AddPlannerEntryFormValues>({
    resolver: zodResolver(AddPlannerEntrySchema),
    defaultValues: {
      task: '',
      subject: undefined,
      date: undefined,
      time: '09:00',
      durationMinutes: '',
      notes: '',
    },
  });

  const taskValue = form.watch("task");
  const subjectValue = form.watch("subject");

  const resetDialogState = useCallback(() => {
    form.reset({
      task: '',
      subject: undefined,
      date: undefined,
      time: '09:00',
      durationMinutes: '',
      notes: '',
    });
    setAiGeneratedPlan(null);
    setIsGeneratingAiPlan(false);
    setIsProcessing(false);
  }, [form]);

  useEffect(() => {
    if (isOpen) {
      // Reset when dialog opens to ensure fresh state
      resetDialogState();
    }
  }, [isOpen, resetDialogState]);

  const handleGenerateAiPlan = useCallback(async () => {
    if (!user || !userProfile || isGeneratingAiPlan) {
      return;
    }

    const currentTask = form.getValues("task");
    const currentSubject = form.getValues("subject") as Subject;
    const currentDuration = form.getValues("durationMinutes");

    if (!currentTask || currentTask.trim().length < 3 || !currentSubject) {
        toast({ variant: "destructive", title: "Input Required", description: "Please enter a valid Task/Topic (min 3 chars) and select a Subject before generating an AI plan." });
        return;
    }
    
    setIsGeneratingAiPlan(true);
    setAiGeneratedPlan(null); 

    if (isRecaptchaEnabled && recaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify. Please try again." });
          setIsGeneratingAiPlan(false);
          if (recaptchaRef.current) recaptchaRef.current.reset();
          return;
        }
      } catch (error) {
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Verification error." });
        setIsGeneratingAiPlan(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    const isPrivileged = userProfile.isAdmin || userProfile.isTeacher;
    if (!isPrivileged) {
      const deductionSuccess = await deductCreditForAiPlanner(AI_PLANNER_CREDIT_COST);
      if (!deductionSuccess) {
        toast({ variant: "destructive", title: "Credit Error", description: `Failed to deduct ${AI_PLANNER_CREDIT_COST} credits. Please check your balance.` });
        setIsGeneratingAiPlan(false);
        if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }
    await triggerStreakUpdate();

    try {
      const result = await generateStudyPlan({
        taskDescription: currentTask,
        subject: currentSubject,
        language: language,
        mainTaskDurationMinutes: currentDuration ? Number(currentDuration) : undefined,
      });
      setAiGeneratedPlan(result.planDetails);
      toast({ title: "AI Study Plan Suggested!", description: "Review the plan below. You can copy it to your notes." });
    } catch (error: any) {
      console.error("Error generating AI study plan:", error);
      toast({ variant: "destructive", title: "AI Plan Failed", description: error.message || "Could not generate study plan." });
      setAiGeneratedPlan(null);
    } finally {
      setIsGeneratingAiPlan(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  }, [user, userProfile, isGeneratingAiPlan, language, deductCreditForAiPlanner, triggerStreakUpdate, toast, form]);


  const handleCopyToNotes = () => {
    if (aiGeneratedPlan) {
      const currentNotes = form.getValues("notes") || "";
      const newNotes = currentNotes ? `${currentNotes}\n\n--- AI Suggested Plan ---\n${aiGeneratedPlan}` : `--- AI Suggested Plan ---\n${aiGeneratedPlan}`;
      form.setValue("notes", newNotes);
      toast({ title: "Plan Copied", description: "AI suggested plan has been copied to your notes." });
    }
  };

  const onSubmit = async (values: AddPlannerEntryFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    setIsProcessing(true);

    try {
      const [hours, minutes] = values.time.split(':').map(Number);
      let combinedDateTime = values.date;
      combinedDateTime = setHours(combinedDateTime, hours);
      combinedDateTime = setMinutes(combinedDateTime, minutes);
      combinedDateTime = setSeconds(combinedDateTime, 0);
      combinedDateTime = setMilliseconds(combinedDateTime, 0);

      await addPlannerEntry(user.uid, {
        task: values.task,
        subject: values.subject,
        dateTime: combinedDateTime.toISOString(),
        durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
        notes: values.notes,
      });
      toast({ title: "Entry Added", description: `"${values.task}" added to your planner.` });
      onEntryAdded();
      onOpenChange(false); 
    } catch (error: any) {
      console.error("Error adding planner entry:", error);
      toast({ variant: "destructive", title: "Failed to Add Entry", description: error.message || "Could not add entry." });
    } finally {
      setIsProcessing(false);
    }
  };

  const canGenerateAiPlan = taskValue && taskValue.trim().length >= 3 && subjectValue;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        {isRecaptchaEnabled && recaptchaSiteKey && (
          <ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaSiteKey} size="invisible" />
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-6 w-6" /> Add to Study Planner
          </DialogTitle>
          <DialogDescription>
            Plan your study sessions. Task, subject, date, and time are required.
            Fill Task & Subject to enable AI plan suggestions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="addPlannerEntryForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 overflow-y-auto flex-grow pr-2">
            <FormField
              control={form.control}
              name="task"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task / Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Revise Chapter 3 Photosynthesis" {...field} disabled={isProcessing || isGeneratingAiPlan} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isProcessing || isGeneratingAiPlan}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBJECTS.map((subjectItem) => (
                        <SelectItem key={subjectItem.value} value={subjectItem.value}>
                          {subjectItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal h-10",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isProcessing || isGeneratingAiPlan}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isProcessing || isGeneratingAiPlan }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="h-10" disabled={isProcessing || isGeneratingAiPlan} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Minutes, Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 60 for 1 hour" {...field} disabled={isProcessing || isGeneratingAiPlan} />
                  </FormControl>
                   <FormDescription className="text-xs">
                    AI plan suggestions are more effective with a duration.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAiPlan}
                disabled={!canGenerateAiPlan || isGeneratingAiPlan || isProcessing}
                className="w-full"
              >
                {isGeneratingAiPlan ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                Suggest Study Plan with AI
              </Button>

              {isGeneratingAiPlan && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      <span>AI is generating a study plan...</span>
                  </div>
              )}
              {aiGeneratedPlan && !isGeneratingAiPlan && (
                  <div className="space-y-2 pt-2">
                       <FormLabel>AI Suggested Plan:</FormLabel>
                      <Textarea
                          readOnly
                          value={aiGeneratedPlan}
                          className="min-h-[100px] bg-muted/50 text-sm"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={handleCopyToNotes} className="w-full">
                          <CopyIcon className="mr-2 h-4 w-4"/> Copy to My Notes
                      </Button>
                  </div>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="pt-2">
                  <FormLabel>My Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific notes for this session..." {...field} disabled={isProcessing || isGeneratingAiPlan} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="pt-4 mt-auto border-t">
          <Button type="button" variant="outline" onClick={() => {
              onOpenChange(false);
          }} disabled={isProcessing || isGeneratingAiPlan}>
            Cancel
          </Button>
          <Button type="submit" form="addPlannerEntryForm" disabled={isProcessing || isGeneratingAiPlan}>
            {isProcessing ? <Loader2 className="animate-spin" /> : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    