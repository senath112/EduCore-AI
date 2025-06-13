
"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react'; // Added useRef
import { useAuth } from '@/hooks/use-auth';
import { getQuizById, submitQuizAttempt, getQuizAttempts, type QuizData, type QuestionData } from '@/services/quiz-service';
import { awardBadge } from '@/services/user-service'; // Import awardBadge
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Clock, HelpCircle, ArrowLeft, LogIn, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReCAPTCHA from 'react-google-recaptcha'; // Added ReCAPTCHA import

type AnswersState = Record<string, string>; // questionId: selectedOptionId

export default function QuizTakingPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const { user, userProfile, loading: authLoading, profileLoading, triggerStreakUpdate, refreshUserProfile } = useAuth();
  const { toast } = useToast();

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const [isConfirmSubmitDialogOpen, setIsConfirmSubmitDialogOpen] = useState(false);

  const isLoading = authLoading || profileLoading;

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (quizId && user) {
      setLoadingQuiz(true);
      getQuizById(quizId)
        .then(data => {
          if (data && data.status === 'published') {
            setQuizData(data);
          } else if (data && data.status !== 'published') {
            toast({ variant: "destructive", title: "Quiz Not Available", description: "This quiz is not currently published or available." });
            setQuizData(null); 
          } else {
            toast({ variant: "destructive", title: "Quiz Not Found", description: "Could not load the quiz details." });
          }
        })
        .catch(err => {
          console.error("Failed to fetch quiz:", err);
          toast({ variant: "destructive", title: "Error", description: "Failed to load quiz." });
        })
        .finally(() => setLoadingQuiz(false));
    } else if (!user && !authLoading) {
        toast({ title: "Please log in", description: "You need to be logged in to take a quiz."});
    }
  }, [quizId, user, toast, authLoading]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNextQuestion = () => {
    if (quizData && quizData.questions && currentQuestionIndex < Object.keys(quizData.questions).length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1); // Corrected from prev + 1
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizData || !quizData.questions || !user || !userProfile) {
        toast({ variant: "destructive", title: "Error", description: "Cannot submit quiz. Data missing." });
        return;
    }
    setIsConfirmSubmitDialogOpen(false);
    setIsSubmitting(true);

    if (isRecaptchaEnabled && recaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA. Please try again." });
          setIsSubmitting(false);
          recaptchaRef.current.reset();
          return;
        }
        console.warn(
          "reCAPTCHA v3 token obtained for Quiz Submission:", token,
          "IMPORTANT: This token MUST be verified server-side with your secret key for security."
        );
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "An error occurred during reCAPTCHA verification." });
        setIsSubmitting(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    await triggerStreakUpdate(); 

    let correctAnswers = 0;
    const questionArray = Object.values(quizData.questions);
    questionArray.forEach(q => {
      if (answers[q.id] === q.correctAnswerId) {
        correctAnswers++;
      }
    });
    const currentScore = { correct: correctAnswers, total: questionArray.length };
    setScore(currentScore);

    try {
        await submitQuizAttempt(
            user.uid, 
            userProfile.displayName || user.email, 
            quizId, 
            quizData.title, 
            answers, 
            currentScore
        );
        toast({ title: "Quiz Submitted!", description: `You scored ${correctAnswers} out of ${questionArray.length}.`});
        setQuizSubmitted(true);

        // Check for leaderboard topper badge
        const allAttempts = await getQuizAttempts(quizId);
        if (allAttempts.length > 0 && allAttempts[0].userId === user.uid) {
            // Ensure user is #1 (getQuizAttempts already sorts this way, but a double check is fine)
            const userIsTop = allAttempts[0].score.correct === currentScore.correct && allAttempts[0].score.total === currentScore.total;
            if (userIsTop) {
                const badgeAwarded = await awardBadge(user.uid, 'leaderboard_topper');
                if (badgeAwarded) {
                    toast({ 
                        title: "New Badge Earned!", 
                        description: "Congratulations! You've earned the 'Leaderboard Topper' badge!",
                        duration: 7000 
                    });
                    await refreshUserProfile(); 
                }
            }
        }
        
        // Check for Quiz Ace badge (score > 80%)
        if (currentScore.total > 0 && (currentScore.correct / currentScore.total) * 100 > 80) {
            const badgeAwarded = await awardBadge(user.uid, 'quiz_ace');
            if (badgeAwarded) {
                toast({
                    title: "New Badge Earned!",
                    description: "Congratulations! You've earned the 'Quiz Ace' badge!",
                    duration: 7000
                });
                await refreshUserProfile();
            }
        }


    } catch (error) {
        console.error("Error submitting quiz attempt or awarding badge:", error);
        toast({ variant: "destructive", title: "Submission Failed", description: "Could not save your quiz attempt or check for badges."});
    } finally {
        setIsSubmitting(false);
        if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  if (isLoading || loadingQuiz) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Quiz...</p>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to take this quiz.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  if (!quizData) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <HelpCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Quiz Not Found or Not Available</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          This quiz could not be loaded, or it might not be published.
        </p>
        <Button asChild variant="outline">
          <Link href="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  const questionIds = Object.keys(quizData.questions || {});
  const currentQuestion: QuestionData | undefined = quizData.questions ? quizData.questions[questionIds[currentQuestionIndex]] : undefined;
  const totalQuestions = questionIds.length;

  if (quizSubmitted && score) {
    return (
      <Card className="w-full max-w-2xl mx-auto my-auto shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Quiz Completed!</CardTitle>
          <CardDescription>{quizData.title}{quizData.friendlyId ? ` (ID: ${quizData.friendlyId})` : ''}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-5xl font-bold text-primary">
            {score.correct} / {score.total}
          </p>
          <p className="text-xl text-muted-foreground">
            You answered {score.correct} questions correctly out of {score.total}.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/classes">Back to Classes</Link>
          </Button>
          <Button asChild>
            <Link href={`/quiz/${quizId}/leaderboard`}>
                <BarChart3 className="mr-2 h-4 w-4"/> View Leaderboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion) {
     return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <HelpCircle className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-semibold">No Questions</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          This quiz currently has no questions. Please check back later.
        </p>
        <Button asChild variant="outline">
          <Link href="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {isRecaptchaEnabled && recaptchaSiteKey && (
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={recaptchaSiteKey}
          size="invisible"
        />
      )}
      <Card className="w-full max-w-2xl mx-auto my-auto shadow-xl flex flex-col flex-grow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" asChild className="mb-2">
                <Link href="/classes"><ArrowLeft className="h-4 w-4 mr-1"/> Back to Classes</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              <Clock className="inline h-4 w-4 mr-1" />
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
          <CardTitle className="text-2xl">{quizData.title}{quizData.friendlyId ? ` (ID: ${quizData.friendlyId})` : ''}</CardTitle>
          {quizData.description && <CardDescription>{quizData.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-grow space-y-6">
          <div>
            <p className="text-lg font-semibold mb-4">{currentQuestion.text}</p>
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.options.map(option => (
                <Label
                  key={option.id}
                  htmlFor={`${currentQuestion.id}-${option.id}`}
                  className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors
                              ${answers[currentQuestion.id] === option.id ? 'bg-primary/10 border-primary ring-1 ring-primary' : ''}`}
                >
                  <RadioGroupItem value={option.id} id={`${currentQuestion.id}-${option.id}`} />
                  <span>{option.id}. {option.text}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t pt-4">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting}
          >
            Previous
          </Button>
          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button
              onClick={handleNextQuestion}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => setIsConfirmSubmitDialogOpen(true)}
              disabled={isSubmitting || Object.keys(answers).length !== totalQuestions}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Quiz"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmSubmitDialogOpen} onOpenChange={setIsConfirmSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your answers? You won't be able to change them after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSubmitDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitQuiz} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
