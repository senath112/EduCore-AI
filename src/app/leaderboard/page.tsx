
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllUserProfiles, type UserProfileWithId } from '@/services/user-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, LogIn, Trophy, Flame, Award as AwardIcon, UserCircle2 } from 'lucide-react'; // Renamed Award to AwardIcon
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  photoURL?: string | null;
  totalScore: number;
  streak: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

const STREAK_SCORE_MULTIPLIER = 10;
const BADGE_SCORE_MULTIPLIER = 50;

export default function GlobalLeaderboardPage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();

  const [allUserProfiles, setAllUserProfiles] = useState<UserProfileWithId[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  const isLoading = authLoading || profileLoading || isLoadingProfiles;

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        // Handled by conditional rendering below
        setIsLoadingProfiles(false);
        return;
      }
      setIsLoadingProfiles(true);
      getAllUserProfiles()
        .then(profiles => {
          setAllUserProfiles(profiles);
        })
        .catch(error => {
          console.error("Failed to load user profiles:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load user data for the leaderboard." });
        })
        .finally(() => {
          setIsLoadingProfiles(false);
        });
    }
  }, [user, authLoading, profileLoading, toast]);

  const leaderboardData = useMemo((): LeaderboardEntry[] => {
    if (isLoadingProfiles || !user) return [];

    const studentProfiles = allUserProfiles.filter(
      profile => !profile.isAdmin && !profile.isTeacher && profile.email // Ensure they are students with an email
    );

    const scoredStudents = studentProfiles.map(profile => {
      const streakScore = (profile.currentStreak || 0) * STREAK_SCORE_MULTIPLIER;
      const badgeCount = Object.keys(profile.earnedBadges || {}).length;
      const badgeScore = badgeCount * BADGE_SCORE_MULTIPLIER;
      const totalScore = streakScore + badgeScore;

      return {
        userId: profile.id,
        displayName: profile.displayName || profile.email?.split('@')[0] || 'Student',
        photoURL: profile.photoURL,
        totalScore,
        streak: profile.currentStreak || 0,
        badgeCount,
        isCurrentUser: user?.uid === profile.id,
        // For tie-breaking: sort by earliest creation date (older accounts rank higher in ties)
        // Or simply by more badges, then by streak if total score is tied
        createdAt: profile.createdAt ? new Date(profile.createdAt).getTime() : Date.now() 
      };
    });

    // Sort by total score descending, then by badge count, then by streak, then by creation date
    scoredStudents.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (b.badgeCount !== a.badgeCount) {
        return b.badgeCount - a.badgeCount;
      }
      if (b.streak !== a.streak) {
        return b.streak - a.streak;
      }
      return a.createdAt - b.createdAt; // Older account (smaller timestamp) ranks higher
    });

    return scoredStudents.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
  }, [allUserProfiles, user, isLoadingProfiles]);

  if (isLoading) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Leaderboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to view the Global Leaderboard.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-auto shadow-xl flex flex-col flex-grow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" />
          <CardTitle className="text-3xl">Global Student Leaderboard</CardTitle>
        </div>
        <CardDescription>
          See who's leading the charge! Ranking is based on activity streaks and earned badges.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        {leaderboardData.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">
            No student data available yet to display on the leaderboard.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Total Score</TableHead>
                  <TableHead className="text-center">Streak</TableHead>
                  <TableHead className="text-center">Badges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((entry) => (
                  <TableRow 
                    key={entry.userId}
                    className={cn(
                        entry.isCurrentUser && "bg-primary/10 hover:bg-primary/20"
                    )}
                  >
                    <TableCell className="font-bold text-lg text-center">{entry.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.photoURL || undefined} alt={entry.displayName || 'Student'} />
                          <AvatarFallback>
                            {entry.displayName ? entry.displayName.charAt(0).toUpperCase() : <UserCircle2 size={20} />}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn("font-medium", entry.isCurrentUser && "text-primary font-semibold")}>
                          {entry.displayName} {entry.isCurrentUser && "(You)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-primary">{entry.totalScore}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            {entry.streak}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <AwardIcon className="h-4 w-4 text-amber-600" />
                            {entry.badgeCount}
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
