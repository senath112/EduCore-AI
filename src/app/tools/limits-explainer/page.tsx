
"use client";

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { explainLimitFunction, type ExplainLimitFunctionOutput } from '@/ai/flows/explain-limit-function-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Calculator, Sparkles, LogIn, CircleDollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import DynamicChartRenderer from '@/components/tutor/dynamic-chart-renderer';

const ExplainLimitFunctionFormSchema = z.object({
  functionStr: z.string().min(3, "Function must be at least 3 characters.").max(100, "Function cannot exceed 100 characters."),
  limitPoint: z.string().min(1, "Limit point is required.").max(20, "Limit point is too long."),
});
type ExplainLimitFunctionFormValues = z.infer<typeof ExplainLimitFunctionFormSchema>;

const LIMIT_EXPLAINER_CREDIT_COST = 5;

export default function LimitsExplainerPage() {
  const { user, userProfile, loading: authLoading, profileLoading, deductCreditForAITutor, triggerStreakUpdate } = useAuth();
  const { toast } = useToast();

  const [aiResponse, setAiResponse] = useState<ExplainLimitFunctionOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<ExplainLimitFunctionFormValues>({
    resolver: zodResolver(ExplainLimitFunctionFormSchema),
    defaultValues: {
      functionStr: '',
      limitPoint: '',
    },
  });

  const hasSufficientCredits = useMemo(() => {
    if (!userProfile || userProfile.isAdmin || userProfile.isTeacher) return true;
    return (userProfile.credits ?? 0) >= LIMIT_EXPLAINER_CREDIT_COST;
  }, [userProfile]);

  const onSubmit = async (values: ExplainLimitFunctionFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to use this tool." });
      return;
    }
    if (profileLoading) {
      toast({ title: "Profile loading", description: "Please wait a moment and try again." });
      return;
    }
    if (!hasSufficientCredits) {
      toast({ variant: "destructive", title: "Insufficient Credits", description: `You need ${LIMIT_EXPLAINER_CREDIT_COST} credits for this feature.` });
      return;
    }

    setIsGenerating(true);
    setAiResponse(null);

    if (isRecaptchaEnabled && recaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA." });
          setIsGenerating(false);
          recaptchaRef.current.reset();
          return;
        }
      } catch (error) {
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Verification error." });
        setIsGenerating(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    if (!userProfile.isAdmin && !userProfile.isTeacher) {
      const deductionSuccess = await deductCreditForAITutor(LIMIT_EXPLAINER_CREDIT_COST);
      if (!deductionSuccess) {
        toast({ variant: "destructive", title: "Credit Deduction Failed", description: "Could not deduct credits." });
        setIsGenerating(false);
        if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }
    await triggerStreakUpdate();

    try {
      const result = await explainLimitFunction({
        functionStr: values.functionStr,
        limitPoint: values.limitPoint,
      });
      setAiResponse(result);
      toast({ title: "Explanation Generated!", description: "The AI has analyzed the limit function." });
    } catch (error: any) {
      setAiResponse(null);
      toast({ variant: "destructive", title: "Generation Failed", description: error.message || "Could not generate the explanation." });
    } finally {
      setIsGenerating(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  const isSubmitButtonDisabled = isGenerating || profileLoading || !hasSufficientCredits;

  if (authLoading) {
    return <div className="flex flex-grow flex-col items-center justify-center p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to use the Limits Explainer.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow gap-6">
      {isRecaptchaEnabled && recaptchaSiteKey && (
        <ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaSiteKey} size="invisible" />
      )}
      <header>
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Limits Explainer</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Enter a function and a limit point to get a step-by-step explanation from our AI tutor.
        </p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Analyze a Limit Function</CardTitle>
          <CardDescription>
            Use standard math notation (e.g., `(x^2 - 4) / (x - 2)`). For the limit, enter a number or 'infinity'.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="functionStr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Function f(x)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., (x^2-1)/(x-1)" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                   <FormField
                    control={form.control}
                    name="limitPoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit as x approaches</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1 or infinity" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormDescription className="flex items-center gap-1 text-xs pt-1">
                <CircleDollarSign className="h-3.5 w-3.5" />
                 Cost: {LIMIT_EXPLAINER_CREDIT_COST} credits.
                {userProfile && !userProfile.isAdmin && !userProfile.isTeacher && ` Your balance: ${userProfile.credits ?? 0} credits.`}
                {(userProfile?.isAdmin || userProfile?.isTeacher) && " (Free for Admins/Teachers)"}
              </FormDescription>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitButtonDisabled}>
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Explain Limit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isGenerating && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">AI is analyzing the function...</p>
        </div>
      )}

      {aiResponse && (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>AI Explanation & Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Final Answer</h3>
              <p className="text-2xl font-bold text-primary p-3 bg-muted rounded-lg inline-block">
                lim f(x) = {aiResponse.finalAnswer}
              </p>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="font-semibold text-lg mb-2">Step-by-Step Explanation</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{aiResponse.explanation}</p>
            </div>

            {aiResponse.chartData && aiResponse.chartData.length > 0 ? (
                <div>
                    <h3 className="font-semibold text-lg mb-2">Function Plot</h3>
                    <DynamicChartRenderer chartType="line" chartData={aiResponse.chartData} />
                </div>
            ) : (
                <div className="p-3 border rounded-md bg-muted/50 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>A chart could not be generated for this function.</span>
                </div>
            )}

          </CardContent>
        </Card>
      )}

    </div>
  );
}
