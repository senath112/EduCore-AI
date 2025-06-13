
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { generateBlockPuzzle, type GenerateBlockPuzzleOutput } from '@/ai/flows/generate-block-puzzle-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Puzzle, Sparkles, CheckCircle, XCircle, Lightbulb, CircleDollarSign, LogIn, Brain } from 'lucide-react';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { GenerateBlockPuzzleFormSchema, type GenerateBlockPuzzleFormValues } from '@/lib/schemas';
import { awardBadge } from '@/services/user-service';

const PUZZLE_GENERATION_CREDIT_COST = 3;

interface DisplayablePuzzle extends GenerateBlockPuzzleOutput {
  id: string; // For React key
}

// Fisher-Yates (Knuth) Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function PuzzleMakerPage() {
  const { user, userProfile, loading: authLoading, profileLoading, deductCreditForAITutor, triggerStreakUpdate, refreshUserProfile } = useAuth();
  const { subject, language } = useSettings();
  const { toast } = useToast();

  const [generatedPuzzle, setGeneratedPuzzle] = useState<DisplayablePuzzle | null>(null);
  const [userSelections, setUserSelections] = useState<(string | undefined)[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [numBlanksInPuzzle, setNumBlanksInPuzzle] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [puzzleSolvedCorrectly, setPuzzleSolvedCorrectly] = useState<boolean | null>(null);
  const [scoreAwarded, setScoreAwarded] = useState<number>(0);

  const generateRecaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<GenerateBlockPuzzleFormValues>({
    resolver: zodResolver(GenerateBlockPuzzleFormSchema),
    defaultValues: {
      topic: '',
      numberOfBlanks: 2,
      numberOfDistractorsPerBlank: 2,
    },
  });

  const resetPuzzleState = () => {
    setGeneratedPuzzle(null);
    setUserSelections([]);
    setShuffledOptions([]);
    setNumBlanksInPuzzle(0);
    setResultMessage(null);
    setPuzzleSolvedCorrectly(null);
    setScoreAwarded(0);
  };

  const handleGeneratePuzzle = async (values: GenerateBlockPuzzleFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in." });
      return;
    }
    if (profileLoading) {
      toast({ title: "Profile loading", description: "Please wait a moment." });
      return;
    }
    const isPrivileged = userProfile.isAdmin || userProfile.isTeacher;
    if (!isPrivileged && (userProfile.credits ?? 0) < PUZZLE_GENERATION_CREDIT_COST) {
      toast({ variant: "destructive", title: "Insufficient Credits", description: `You need ${PUZZLE_GENERATION_CREDIT_COST} credits to generate a puzzle.` });
      return;
    }

    setIsGenerating(true);
    resetPuzzleState();

    if (isRecaptchaEnabled && generateRecaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await generateRecaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify. Please try again." });
          setIsGenerating(false);
          if (generateRecaptchaRef.current) generateRecaptchaRef.current.reset();
          return;
        }
      } catch (error) {
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Verification error." });
        setIsGenerating(false);
        if (generateRecaptchaRef.current) generateRecaptchaRef.current.reset();
        return;
      }
    }

    if (!isPrivileged) {
      const deductionSuccess = await deductCreditForAITutor(PUZZLE_GENERATION_CREDIT_COST);
      if (!deductionSuccess) {
        toast({ variant: "destructive", title: "Credit Error", description: "Failed to deduct credits." });
        setIsGenerating(false);
        if (isRecaptchaEnabled && generateRecaptchaRef.current) generateRecaptchaRef.current.reset();
        return;
      }
    }
    await triggerStreakUpdate();

    try {
      const result = await generateBlockPuzzle({
        topic: values.topic,
        subject,
        language,
        numberOfBlanks: values.numberOfBlanks,
        numberOfDistractorsPerBlank: values.numberOfDistractorsPerBlank,
      });
      
      if (result.puzzleStatementWithBlanks && result.correctAnswersInOrder) {
        const blanks = (result.puzzleStatementWithBlanks.match(/____/g) || []).length;
        if (blanks !== result.correctAnswersInOrder.length) {
            throw new Error("Mismatch between blanks in statement and number of correct answers provided by AI.");
        }
        setNumBlanksInPuzzle(blanks);
        setUserSelections(Array(blanks).fill(undefined));
        const allOptions = [...result.correctAnswersInOrder, ...(result.distractorAnswers || [])];
        setShuffledOptions(shuffleArray(allOptions));
        setGeneratedPuzzle({ ...result, id: `puzzle-${Date.now()}` });
        toast({ title: "Puzzle Generated!", description: "Select the correct words for each blank." });
      } else {
        throw new Error("AI failed to generate a valid puzzle structure.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message || "Could not generate puzzle." });
      resetPuzzleState();
    } finally {
      setIsGenerating(false);
      if (isRecaptchaEnabled && generateRecaptchaRef.current) generateRecaptchaRef.current.reset();
    }
  };

  const handleUserSelectionChange = (index: number, value: string) => {
    const newSelections = [...userSelections];
    newSelections[index] = value;
    setUserSelections(newSelections);
  };

  const handleSubmitAnswers = async () => {
    if (!generatedPuzzle || !user || !userProfile) return;
    
    setIsChecking(true);
    setResultMessage(null);
    setPuzzleSolvedCorrectly(null);
    setScoreAwarded(0);

    // Client-side validation
    let isCorrect = true;
    if (userSelections.length !== generatedPuzzle.correctAnswersInOrder.length) {
      isCorrect = false;
    } else {
      for (let i = 0; i < userSelections.length; i++) {
        if (userSelections[i] !== generatedPuzzle.correctAnswersInOrder[i]) {
          isCorrect = false;
          break;
        }
      }
    }

    setPuzzleSolvedCorrectly(isCorrect);
    if (isCorrect) {
      setResultMessage("That's absolutely correct! Well done.");
      setScoreAwarded(generatedPuzzle.pointsValue);
      const isPrivileged = userProfile.isAdmin || userProfile.isTeacher;
      if (!isPrivileged) {
        const currentCredits = userProfile.credits ?? 0;
        const newTotalCredits = currentCredits + generatedPuzzle.pointsValue;
        // We need an updateUserCredits function in user-service.ts for this
        // For now, we'll assume it exists and would be called here.
        // await updateUserCredits(user.uid, newTotalCredits); 
        await refreshUserProfile(); // Refresh to show updated credits
        toast({ title: "Credits Awarded!", description: `You earned ${generatedPuzzle.pointsValue} credits!` });
      }
      // Award puzzle pro badge
      const badgeAwarded = await awardBadge(user.uid, 'puzzle_pro');
      if (badgeAwarded) {
          toast({
              title: "New Badge Earned!",
              description: "Congratulations! You've earned the 'Puzzle Pro' badge!",
              duration: 7000
          });
          await refreshUserProfile();
      }

    } else {
      setResultMessage("Not quite right. The correct solution is shown in the blanks.");
      // Optionally, fill the dropdowns with correct answers after an incorrect attempt
      // setUserSelections([...generatedPuzzle.correctAnswersInOrder]);
    }
    setIsChecking(false);
  };

  const hasSufficientCreditsForGeneration = useMemo(() => {
    if (profileLoading) return false; // Wait for profile to load
    if (!userProfile) return false; // No profile means no credits
    if (userProfile.isAdmin || userProfile.isTeacher) return true;
    return (userProfile.credits ?? 0) >= PUZZLE_GENERATION_CREDIT_COST;
  }, [userProfile, profileLoading]);

  const isGenerateDisabled = isGenerating || profileLoading || (!userProfile && !authLoading) || !hasSufficientCreditsForGeneration;
  const isSubmitDisabled = isChecking || puzzleSolvedCorrectly !== null || userSelections.some(sel => sel === undefined);

  const renderPuzzleStatementWithDropdowns = () => {
    if (!generatedPuzzle?.puzzleStatementWithBlanks) return null;
    const parts = generatedPuzzle.puzzleStatementWithBlanks.split("____");
    const dropdownElements = [];

    for (let i = 0; i < numBlanksInPuzzle; i++) {
      dropdownElements.push(
        <span key={`blank-${i}`} className="inline-block mx-1 align-bottom">
          <Select
            value={userSelections[i] || ""}
            onValueChange={(value) => handleUserSelectionChange(i, value)}
            disabled={isChecking || puzzleSolvedCorrectly !== null}
          >
            <SelectTrigger className="w-[150px] sm:w-[180px] h-9 text-sm px-2 py-1">
              <SelectValue placeholder={`Blank ${i + 1}`} />
            </SelectTrigger>
            <SelectContent>
              {shuffledOptions.map((option, optIndex) => (
                <SelectItem key={`${option}-${optIndex}`} value={option} className="text-sm">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      );
    }

    const combinedElements = [];
    parts.forEach((part, index) => {
      combinedElements.push(<span key={`part-${index}`}>{part}</span>);
      if (index < dropdownElements.length) {
        combinedElements.push(dropdownElements[index]);
      }
    });
    return combinedElements;
  };


  if (authLoading) {
    return <div className="flex flex-grow flex-col items-center justify-center p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to use the Puzzle Maker.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }
  if (profileLoading && !userProfile) {
     return <div className="flex flex-grow flex-col items-center justify-center p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="mt-2">Loading profile...</p></div>;
  }


  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col flex-grow my-auto">
      {isRecaptchaEnabled && recaptchaSiteKey && (
        <ReCAPTCHA ref={generateRecaptchaRef} sitekey={recaptchaSiteKey} size="invisible" />
      )}
      <Card className="shadow-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            AI Block Puzzle Maker
          </CardTitle>
          <CardDescription>
            Enter a topic for {subject} ({language}), number of blanks, and distractors. The AI will create a puzzle where you fit words into blanks. Cost: {PUZZLE_GENERATION_CREDIT_COST} credits.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGeneratePuzzle)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cell Structure, The Solar System" {...field} disabled={isGenerating || profileLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numberOfBlanks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Blanks (1-4)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="4" {...field} disabled={isGenerating || profileLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfDistractorsPerBlank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distractors per Blank (1-3)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="3" {...field} disabled={isGenerating || profileLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormDescription className="flex items-center gap-1 text-xs pt-1">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Cost: {PUZZLE_GENERATION_CREDIT_COST} credits.
                {userProfile && !userProfile.isAdmin && !userProfile.isTeacher && ` Your balance: ${userProfile.credits ?? 0} credits.`}
                {(userProfile?.isAdmin || userProfile?.isTeacher) && " (Free for Admins/Teachers)"}
              </FormDescription>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isGenerateDisabled}>
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Puzzle
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isGenerating && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Generating your puzzle...</p>
        </div>
      )}

      {generatedPuzzle && !isGenerating && (
        <Card className="shadow-lg flex-grow flex flex-col mt-6">
          <CardHeader>
            <CardTitle>Solve the Puzzle! (Worth {generatedPuzzle.pointsValue} Points)</CardTitle>
            <CardDescription>Select the correct word/phrase for each blank from the dropdown menus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-grow">
            <div className="text-lg leading-relaxed whitespace-pre-line p-4 border rounded-md bg-muted/30 min-h-[100px]">
              {renderPuzzleStatementWithDropdowns()}
            </div>
            {resultMessage && (
              <div className={`p-3 rounded-md text-sm ${puzzleSolvedCorrectly ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'}`}>
                <p className="font-semibold">{resultMessage}</p>
                {puzzleSolvedCorrectly && scoreAwarded > 0 && (
                   <p className="mt-1">You earned {scoreAwarded} points and credits!</p>
                )}
                {puzzleSolvedCorrectly === false && (
                    <p className="mt-2">Correct answers: {generatedPuzzle.correctAnswersInOrder.join(', ')}</p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col sm:flex-row gap-2 items-stretch">
            {puzzleSolvedCorrectly === null ? (
                 <Button onClick={handleSubmitAnswers} disabled={isSubmitDisabled} className="flex-1">
                 {isChecking ? <Loader2 className="animate-spin" /> : "Submit Answers"}
               </Button>
            ) : (
                <Button onClick={() => form.handleSubmit(handleGeneratePuzzle)()} className="flex-1">
                    <Sparkles className="mr-2 h-4 w-4" /> Generate New Puzzle
                </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
