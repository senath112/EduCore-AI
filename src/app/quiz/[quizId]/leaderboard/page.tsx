
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getQuizById, getQuizAttempts, type QuizData, type QuizAttempt } from '@/services/quiz-service';
import { getAllUserProfiles, type UserProfileWithId } from '@/services/user-service'; // Import user service
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, HelpCircle, ArrowLeft, Trophy, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function QuizLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const { toast } = useToast();

  const [quizDetails, setQuizDetails] = useState<QuizData | null>(null);
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      Promise.all([
        getQuizById(quizId),
        getQuizAttempts(quizId),
        getAllUserProfiles() // Fetch all user profiles
      ]).then(([quizData, quizAttemptsData, usersData]) => {
        if (quizData) {
          setQuizDetails(quizData);
        } else {
          toast({ variant: "destructive", title: "Quiz Not Found", description: "Could not load quiz details for the leaderboard." });
        }
        setAllAttempts(quizAttemptsData);
        setAllUsers(usersData);
      }).catch(err => {
        console.error("Failed to load leaderboard data:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load leaderboard data." });
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [quizId, toast]);

  const filteredAndSortedAttempts = useMemo(() => {
    if (!quizDetails || !quizDetails.classId || allUsers.length === 0) {
      return [];
    }
    const classIdOfQuiz = quizDetails.classId;
    
    // Filter attempts by users enrolled in the specific class
    const relevantAttempts = allAttempts.filter(attempt => {
      const userProfile = allUsers.find(user => user.id === attempt.userId);
      return userProfile && userProfile.enrolledClassIds && userProfile.enrolledClassIds[classIdOfQuiz];
    });

    // Sort attempts: highest score (percentage) first, then newest attempt first for ties
    return relevantAttempts.sort((a, b) => {
      const scorePercentA = a.score.total > 0 ? a.score.correct / a.score.total : 0;
      const scorePercentB = b.score.total > 0 ? b.score.correct / b.score.total : 0;

      if (scorePercentB !== scorePercentA) {
        return scorePercentB - scorePercentA; // Higher score percentage first
      }
      // If scores are tied, sort by newest attempt first
      return new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime();
    });
  }, [allAttempts, quizDetails, allUsers]);


  if (loading) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Leaderboard...</p>
      </div>
    );
  }

  if (!quizDetails) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <HelpCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Quiz Not Found</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          The leaderboard for this quiz could not be displayed as the quiz details are missing.
        </p>
        <Button asChild variant="outline">
          <Link href="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto my-auto shadow-xl flex flex-col flex-grow">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/quiz/${quizId}`}><ArrowLeft className="h-4 w-4 mr-1"/> Back to Quiz</Link>
            </Button>
             <Button variant="ghost" size="sm" asChild>
                <Link href="/classes"><ArrowLeft className="h-4 w-4 mr-1"/> Back to Classes</Link>
            </Button>
        </div>
        <div className="flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            <CardTitle className="text-2xl">Leaderboard: {quizDetails.title}{quizDetails.friendlyId ? ` (ID: ${quizDetails.friendlyId})` : ''}</CardTitle>
        </div>
        <CardDescription>{quizDetails.description}</CardDescription>
         <p className="text-sm text-muted-foreground pt-1">Showing attempts from students enrolled in class: {quizDetails.className}</p>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        {filteredAndSortedAttempts.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No attempts recorded for this quiz from students in this class yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-right">Attempted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAttempts.map((attempt, index) => {
                  const percentage = attempt.score.total > 0 ? ((attempt.score.correct / attempt.score.total) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={`${attempt.userId}-${attempt.attemptedAt}-${index}`}>
                      <TableCell className="font-medium text-center">{index + 1}</TableCell>
                      <TableCell>{attempt.userDisplayName || attempt.userId.substring(0,8) + "..."}</TableCell>
                      <TableCell className="text-center">{attempt.score.correct} / {attempt.score.total}</TableCell>
                      <TableCell className="text-center font-semibold">{percentage}%</TableCell>
                      <TableCell className="text-right">{format(new Date(attempt.attemptedAt), 'PP p')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <Button asChild variant="outline">
          <Link href={`/quiz/${quizId}`}>Back to Quiz Page</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
