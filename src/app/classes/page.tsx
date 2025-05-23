
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getAllClasses, getClassByFriendlyId, type ClassData } from '@/services/class-service';
import { enrollInClass, leaveClass } from '@/services/user-service';
import { redeemVoucher } from '@/services/voucher-service';
import { getQuizzesForClass, type QuizData } from '@/services/quiz-service'; // Import quiz service
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, BookOpen, LogIn, Users, School, AlertTriangle, XCircle, Ticket, UserPlus, FileText, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { RedeemVoucherFormValues, JoinClassFormValues } from '@/lib/schemas';
import { RedeemVoucherSchema, JoinClassSchema } from '@/lib/schemas';
import { Separator } from '@/components/ui/separator';


export default function ClassesPage() {
  const { user, userProfile, loading: authLoading, profileLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [loadingAllClasses, setLoadingAllClasses] = useState(true);
  const [processingClassId, setProcessingClassId] = useState<string | null>(null);
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);

  const [classQuizzes, setClassQuizzes] = useState<Record<string, QuizData[]>>({});
  const [loadingClassQuizzes, setLoadingClassQuizzes] = useState<Record<string, boolean>>({});

  const isLoading = authLoading || profileLoading;

  const redeemVoucherForm = useForm<RedeemVoucherFormValues>({
    resolver: zodResolver(RedeemVoucherSchema),
    defaultValues: {
      voucherCode: '',
    },
  });

  const joinClassForm = useForm<JoinClassFormValues>({
    resolver: zodResolver(JoinClassSchema),
    defaultValues: {
      friendlyId: '',
    },
  });

  const fetchClassesAndQuizzes = useCallback(async () => {
    if (user && userProfile) {
      setLoadingAllClasses(true);
      setLoadingClassQuizzes({}); // Reset quiz loading states
      try {
        const classes = await getAllClasses();
        setAllClasses(classes);

        const enrolledCls = classes.filter(cls => userProfile.enrolledClassIds && userProfile.enrolledClassIds[cls.id]);
        
        const initialQuizLoadingStates: Record<string, boolean> = {};
        enrolledCls.forEach(cls => initialQuizLoadingStates[cls.id] = true);
        setLoadingClassQuizzes(initialQuizLoadingStates);

        const quizzesByClass: Record<string, QuizData[]> = {};
        for (const cls of enrolledCls) {
          try {
            const quizzes = await getQuizzesForClass(cls.id);
            quizzesByClass[cls.id] = quizzes;
          } catch (quizError) {
            console.error(`Failed to fetch quizzes for class ${cls.id}:`, quizError);
            quizzesByClass[cls.id] = [];
          } finally {
            setLoadingClassQuizzes(prev => ({ ...prev, [cls.id]: false }));
          }
        }
        setClassQuizzes(quizzesByClass);

      } catch (error) {
        console.error("Failed to fetch all classes or quizzes:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load class or quiz data." });
      } finally {
        setLoadingAllClasses(false);
      }
    }
  }, [user, userProfile, toast]);


  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && userProfile) { // Ensure userProfile is also loaded
        fetchClassesAndQuizzes();
    }
  }, [user, userProfile, isLoading, router, fetchClassesAndQuizzes]);


  const handleLeaveClass = async (classId: string) => {
    if (!user) return;
    setProcessingClassId(classId);
    try {
      await leaveClass(user.uid, classId);
      await refreshUserProfile();
      fetchClassesAndQuizzes(); // Re-fetch to update enrolled classes and their quizzes
      toast({
        title: "Success",
        description: "Successfully left the class.",
      });
    } catch (error) {
      console.error("Failed to leave class:", error);
      toast({
        variant: "destructive",
        title: "Error Leaving Class",
        description: "Could not leave the class.",
      });
    } finally {
      setProcessingClassId(null);
    }
  };

  const handleRedeemVoucher = async (values: RedeemVoucherFormValues) => {
    if (!user || !userProfile) return;
    setIsRedeemingVoucher(true);
    try {
      const result = await redeemVoucher(user.uid, values.voucherCode);
      if (result.success) {
        toast({
          title: "Voucher Redeemed!",
          description: result.message,
        });
        await refreshUserProfile();
        if (result.autoEnrolledClassId) { // If auto-enrolled, refresh class/quiz data
            fetchClassesAndQuizzes();
        }
        redeemVoucherForm.reset();
      } else {
        toast({
          variant: "destructive",
          title: "Redemption Failed",
          description: result.message,
        });
      }
    } catch (error: any) {
      console.error("Error redeeming voucher:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not redeem voucher. Please try again.",
      });
    } finally {
      setIsRedeemingVoucher(false);
    }
  };

  const handleJoinClassSubmit = async (values: JoinClassFormValues) => {
    if (!user || !userProfile) return;
    setIsJoiningClass(true);
    try {
      const classToJoin = await getClassByFriendlyId(values.friendlyId);
      if (!classToJoin) {
        toast({
          variant: "destructive",
          title: "Class Not Found",
          description: `No class found with ID: ${values.friendlyId}. Please check the ID and try again.`,
        });
        setIsJoiningClass(false);
        return;
      }

      const alreadyEnrolled = userProfile.enrolledClassIds && userProfile.enrolledClassIds[classToJoin.id];
      if (alreadyEnrolled) {
        toast({
          title: "Already Enrolled",
          description: `You are already enrolled in "${classToJoin.name}".`,
        });
        setIsJoiningClass(false);
        return;
      }

      await enrollInClass(user.uid, classToJoin.id);
      toast({
        title: "Successfully Joined Class!",
        description: `You have been enrolled in "${classToJoin.name}".`,
      });
      await refreshUserProfile();
      fetchClassesAndQuizzes(); // Re-fetch to update enrolled classes and their quizzes
      joinClassForm.reset();

    } catch (error: any) {
      console.error("Error joining class:", error);
      toast({
        variant: "destructive",
        title: "Error Joining Class",
        description: error.message || "Could not join the class. Please try again.",
      });
    } finally {
      setIsJoiningClass(false);
    }
  };


  if (isLoading || (loadingAllClasses && !allClasses.length)) { // Adjusted loading condition
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Classes...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center min-h-[calc(100vh-150px)]">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to view and manage classes.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  const enrolledClassIds = userProfile?.enrolledClassIds || {};
  const myClasses = allClasses.filter(cls => enrolledClassIds[cls.id]);

  return (
    <>
    <div className="container mx-auto p-4 md:p-6 min-h-[calc(100vh-150px)]">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Manage Your Classes</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Redeem credit vouchers, join new classes using a Class ID, or manage your current enrollments.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-secondary" />
              Join a New Class
            </CardTitle>
            <CardDescription>Enter the Friendly Class ID provided by your teacher.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...joinClassForm}>
              <form onSubmit={joinClassForm.handleSubmit(handleJoinClassSubmit)} className="space-y-4">
                <FormField
                  control={joinClassForm.control}
                  name="friendlyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="friendlyIdInput">Friendly Class ID</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            id="friendlyIdInput"
                            placeholder="e.g., AB12CD"
                            {...field}
                            className="uppercase"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            disabled={isJoiningClass}
                          />
                          <Button type="submit" disabled={isJoiningClass || !joinClassForm.formState.isValid}>
                            {isJoiningClass ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Class"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-accent" />
              Redeem Credit Voucher
            </CardTitle>
            <CardDescription>Enter a voucher code to add credits to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...redeemVoucherForm}>
              <form onSubmit={redeemVoucherForm.handleSubmit(handleRedeemVoucher)} className="space-y-4">
                <FormField
                  control={redeemVoucherForm.control}
                  name="voucherCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="voucherCodeInput">Voucher Code</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            id="voucherCodeInput"
                            placeholder="e.g., ABCD1234"
                            {...field}
                            className="uppercase"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            disabled={isRedeemingVoucher}
                          />
                          <Button type="submit" disabled={isRedeemingVoucher || !redeemVoucherForm.formState.isValid}>
                            {isRedeemingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>


      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-secondary" />
          <h2 className="text-2xl font-semibold text-secondary">My Enrolled Classes ({myClasses.length})</h2>
        </div>
        {myClasses.length === 0 ? (
          <p className="text-muted-foreground italic">You are not currently enrolled in any classes. Use a Friendly Class ID from your teacher to join a class.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myClasses.map(classItem => {
              const publishedQuizzes = (classQuizzes[classItem.id] || []).filter(q => q.status === 'published');
              const isLoadingThisClassQuizzes = loadingClassQuizzes[classItem.id] || false;

              return (
                <Card key={classItem.id} className="shadow-md flex flex-col">
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 pt-1">
                      <School className="h-4 w-4 opacity-70" /> Instructor: {classItem.instructorName}
                    </p>
                    {classItem.friendlyId && (
                       <p className="text-xs text-muted-foreground mt-1">Class ID: <span className="font-medium">{classItem.friendlyId}</span></p>
                    )}
                    <CardDescription className="pt-2 flex-grow">{classItem.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 mt-auto pt-4 border-t">
                    <h4 className="text-md font-semibold flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-primary"/>
                        Published Quizzes
                    </h4>
                    {isLoadingThisClassQuizzes ? (
                        <div className="flex items-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <p className="ml-2 text-sm text-muted-foreground">Loading quizzes...</p>
                        </div>
                    ) : publishedQuizzes.length > 0 ? (
                        <ul className="space-y-2">
                        {publishedQuizzes.map(quiz => (
                            <li key={quiz.id} className="p-2 border rounded-md text-sm bg-muted/30">
                            <p className="font-medium">{quiz.title}{quiz.friendlyId ? ` (ID: ${quiz.friendlyId})`: ""}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{quiz.description}</p>
                            <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1">
                                <Link href={`/quiz/${quiz.id}`}>Start Quiz</Link>
                            </Button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No published quizzes available for this class yet.</p>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleLeaveClass(classItem.id)}
                      disabled={processingClassId === classItem.id}
                    >
                      {processingClassId === classItem.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Leave Class
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {allClasses.length === 0 && !loadingAllClasses && myClasses.length === 0 && (
         <Card className="shadow-lg text-center mt-10">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                No Classes Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              It seems there are no classes configured in the system yet, or you haven't joined any.
              Please ask your teacher for a Friendly Class ID to join.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
