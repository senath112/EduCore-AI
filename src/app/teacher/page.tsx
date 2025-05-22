
"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldAlert, School, PlusCircle, BookCopy, Ticket, Users, BarChart3, CheckCircle, XCircle, Clock, CircleDollarSign, Trash2, FilePlus2, ClipboardList, PencilLine, ListChecks, UploadCloud, ExternalLink, FileEdit } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import CreateClassDialog from '@/components/teacher/create-class-dialog';
import GenerateVouchersDialog from '@/components/teacher/generate-vouchers-dialog';
import CreateQuizDialog from '@/components/teacher/create-quiz-dialog'; 
import EditQuizDetailsDialog from '@/components/teacher/edit-quiz-details-dialog'; 
import AddMCQQuestionDialog from '@/components/teacher/add-mcq-question-dialog';
import BulkAddQuestionsDialog from '@/components/teacher/bulk-add-questions-dialog';
import { getClassesByTeacher, deleteClass, type ClassData, approveJoinRequest, denyJoinRequest } from '@/services/class-service';
import { getAllUserProfiles, type UserProfileWithId } from '@/services/user-service'; 
import { getAllCreditVouchers, type CreditVoucher } from '@/services/voucher-service';
import { getQuizzesForClass, type QuizData, publishQuiz, unpublishQuiz } from '@/services/quiz-service'; 
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, isPast, parseISO } from 'date-fns';
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

export default function TeacherDashboardPage() {
  const { user, userProfile, loading, profileLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isCreateClassDialogOpen, setIsCreateClassDialogOpen] = useState(false);
  const [isGenerateVouchersDialogOpen, setIsGenerateVouchersDialogOpen] = useState(false);
  
  const [myTeacherClasses, setMyTeacherClasses] = useState<ClassData[]>([]);
  const [loadingTeacherClasses, setLoadingTeacherClasses] = useState(true);

  const [teacherVouchers, setTeacherVouchers] = useState<CreditVoucher[]>([]);
  const [loadingTeacherVouchers, setLoadingTeacherVouchers] = useState(true);

  const [allUsers, setAllUsers] = useState<UserProfileWithId[]>([]); 
  const [loadingAllUsers, setLoadingAllUsers] = useState(true); 

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  const [processingStudentRequestId, setProcessingStudentRequestId] = useState<string | null>(null);

  // Quiz related state
  const [isCreateQuizDialogOpen, setIsCreateQuizDialogOpen] = useState(false);
  const [selectedClassForQuiz, setSelectedClassForQuiz] = useState<Pick<ClassData, 'id' | 'name'> | null>(null);
  const [classQuizzes, setClassQuizzes] = useState<Record<string, QuizData[]>>({});
  const [loadingClassQuizzes, setLoadingClassQuizzes] = useState<Record<string, boolean>>({});

  const [isEditQuizDetailsDialogOpen, setIsEditQuizDetailsDialogOpen] = useState(false); 
  const [selectedQuizForEdit, setSelectedQuizForEdit] = useState<QuizData | null>(null); 

  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState<{ id: string, title: string } | null>(null);

  const [isBulkAddQuestionsDialogOpen, setIsBulkAddQuestionsDialogOpen] = useState(false);
  const [selectedQuizForBulkAdd, setSelectedQuizForBulkAdd] = useState<{ id: string, title: string } | null>(null);

  const [processingQuizStatusChange, setProcessingQuizStatusChange] = useState<string | null>(null);


  const isLoading = loading || profileLoading;

  const fetchTeacherData = useCallback(async () => {
    if (user && userProfile?.isTeacher) {
      setLoadingTeacherClasses(true);
      setLoadingTeacherVouchers(true);
      setLoadingAllUsers(true);
      
      const currentTeacherClassSnapshot = await getClassesByTeacher(user.uid);
      const currentClassIds = currentTeacherClassSnapshot.map(cls => cls.id);

      setLoadingClassQuizzes(prev => {
        const newLoadingStates: Record<string, boolean> = {};
        currentClassIds.forEach(clsId => newLoadingStates[clsId] = true);
        return { ...prev, ...newLoadingStates };
      });
      
      try {
        const [allVouchersData, allUsersData] = await Promise.all([
          getAllCreditVouchers(),
          getAllUserProfiles(), 
        ]);
        setMyTeacherClasses(currentTeacherClassSnapshot); 
        setAllUsers(allUsersData); 
        
        const filteredVouchers = allVouchersData
          .filter(v => v.generatedByTeacherId === user.uid)
          .map(v => ({
            ...v,
            status: v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)) ? 'expired' : v.status
          }));
        setTeacherVouchers(filteredVouchers);

        const quizzesByClass: Record<string, QuizData[]> = {};
        const initialQuizLoadingStates: Record<string, boolean> = {};
        currentTeacherClassSnapshot.forEach(cls => initialQuizLoadingStates[cls.id] = true);
        setLoadingClassQuizzes(initialQuizLoadingStates);

        for (const cls of currentTeacherClassSnapshot) {
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
        console.error("Failed to fetch teacher's data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your dashboard data.",
        });
      } finally {
        setLoadingTeacherClasses(false);
        setLoadingTeacherVouchers(false);
        setLoadingAllUsers(false); 
      }
    }
  }, [user, userProfile?.isTeacher, toast]);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !userProfile?.isTeacher) {
        router.push('/'); 
      } else {
        fetchTeacherData();
      }
    }
  }, [user, userProfile, isLoading, router, fetchTeacherData]);

  const handleClassCreated = (result: { classId: string; friendlyId: string }) => {
    fetchTeacherData(); 
  };

  const handleVouchersGenerated = (vouchers: CreditVoucher[]) => {
    fetchTeacherData(); 
  };

  const handleQuizCreatedOrUpdated = () => { 
    fetchTeacherData(); 
  };

  const handleDeleteClassClick = (classItem: ClassData) => {
    setClassToDelete(classItem);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete || !user) return;
    setIsDeletingClass(true);
    try {
      await deleteClass(classToDelete.id, user.uid);
      toast({
        title: "Class Deleted",
        description: `Class "${classToDelete.name}" has been successfully deleted.`,
      });
      fetchTeacherData(); 
    } catch (error: any) {
      console.error("Error deleting class:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete the class.",
      });
    } finally {
      setIsDeletingClass(false);
      setIsDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const handleApproveRequest = async (classId: string, studentUserId: string) => {
    setProcessingStudentRequestId(studentUserId);
    try {
      await approveJoinRequest(classId, studentUserId);
      toast({ title: "Student Approved", description: "The student has been enrolled in the class." });
      fetchTeacherData();
    } catch (error: any) {
      console.error("Error approving student:", error);
      toast({ variant: "destructive", title: "Approval Failed", description: error.message || "Could not approve student." });
    } finally {
      setProcessingStudentRequestId(null);
    }
  };

  const handleDenyRequest = async (classId: string, studentUserId: string) => {
    setProcessingStudentRequestId(studentUserId);
    try {
      await denyJoinRequest(classId, studentUserId);
      toast({ title: "Student Denied", description: "The join request has been denied." });
      fetchTeacherData();
    } catch (error: any) {
      console.error("Error denying student:", error);
      toast({ variant: "destructive", title: "Denial Failed", description: error.message || "Could not deny student." });
    } finally {
      setProcessingStudentRequestId(null);
    }
  };

  const handlePublishQuiz = async (quizId: string) => {
    setProcessingQuizStatusChange(quizId);
    try {
      await publishQuiz(quizId);
      toast({ title: "Quiz Published", description: "The quiz is now live." });
      fetchTeacherData(); 
    } catch (error: any) {
      console.error("Error publishing quiz:", error);
      toast({ variant: "destructive", title: "Publish Failed", description: error.message || "Could not publish the quiz." });
    } finally {
      setProcessingQuizStatusChange(null);
    }
  };

  const handleUnpublishQuiz = async (quizId: string) => {
    setProcessingQuizStatusChange(quizId);
    try {
      await unpublishQuiz(quizId);
      toast({ title: "Quiz Unpublished", description: "The quiz has been returned to draft status." });
      fetchTeacherData(); 
    } catch (error: any) {
      console.error("Error unpublishing quiz:", error);
      toast({ variant: "destructive", title: "Unpublish Failed", description: error.message || "Could not unpublish the quiz." });
    } finally {
      setProcessingQuizStatusChange(null);
    }
  };

  const totalGeneratedVouchers = teacherVouchers.length;
  const totalRedeemedVouchers = teacherVouchers.filter(v => v.status === 'redeemed').length;
  const totalActiveVouchers = teacherVouchers.filter(v => v.status === 'active' && v.expiryDate && !isPast(parseISO(v.expiryDate))).length; 
  const totalExpiredVouchers = teacherVouchers.filter(v => v.status === 'expired' || (v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)))).length;


  const getVoucherStatusBadgeVariant = (status: CreditVoucher['status']) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'redeemed':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const openCreateQuizDialog = (classItem: Pick<ClassData, 'id' | 'name'>) => {
    setSelectedClassForQuiz(classItem);
    setIsCreateQuizDialogOpen(true);
  };

  const openEditQuizDetailsDialog = (quiz: QuizData) => { 
    setSelectedQuizForEdit(quiz);
    setIsEditQuizDetailsDialogOpen(true);
  };

  const openAddQuestionDialog = (quiz: Pick<QuizData, 'id' | 'title'>) => {
    setSelectedQuizForQuestion(quiz);
    setIsAddQuestionDialogOpen(true);
  };

  const openBulkAddQuestionsDialog = (quiz: Pick<QuizData, 'id' | 'title'>) => {
    setSelectedQuizForBulkAdd(quiz);
    setIsBulkAddQuestionsDialogOpen(true);
  };


  if (isLoading || (userProfile?.isTeacher && (loadingTeacherClasses || loadingTeacherVouchers || loadingAllUsers))) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Teacher Dashboard...</p>
      </div>
    );
  }

  if (!user || !userProfile?.isTeacher) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center min-h-[calc(100vh-150px)]">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You do not have permission to view this page.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 min-h-[calc(100vh-150px)]">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <School className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-primary">Teacher Dashboard</h1>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1.5">
                <CircleDollarSign className="mr-2 h-5 w-5 text-primary"/> 
                 Your Credits: {userProfile?.isAdmin ? 'Unlimited (Admin)' : (userProfile?.credits ?? 0)}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground mt-1">
            Welcome, {userProfile?.displayName || user.email}! Manage your classes and student engagement.
          </p>
        </header>

        <section className="mb-10 p-4 border rounded-lg shadow-sm bg-card">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
                <BookCopy className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-semibold text-card-foreground">My Created Classes ({myTeacherClasses.length})</h2>
            </div>
            <Button onClick={() => setIsCreateClassDialogOpen(true)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Class
            </Button>
          </div>
          {loadingTeacherClasses ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading your classes...</p>
            </div>
          ) : myTeacherClasses.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">You haven't created any classes yet.</p>
          ) : (
            <div className="space-y-6">
              {myTeacherClasses.map(classItem => {
                const enrolledStudents = allUsers.filter(u => u.enrolledClassIds && u.enrolledClassIds[classItem.id]);
                const pendingRequests = classItem.pendingJoinRequests 
                  ? Object.values(classItem.pendingJoinRequests) 
                  : [];
                const quizzesForThisClass = classQuizzes[classItem.id] || [];
                const isLoadingThisClassQuizzes = loadingClassQuizzes[classItem.id] || false;

                return (
                  <Card key={classItem.id} className="shadow-md flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{classItem.name}</CardTitle>
                          <CardDescription className="pt-1">{classItem.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                           <Button
                              variant="outline"
                              size="xs"
                              onClick={() => openCreateQuizDialog({id: classItem.id, name: classItem.name})}
                           >
                               <FilePlus2 className="mr-1 h-3 w-3" /> Add Quiz
                           </Button>
                           <Button
                              variant="destructiveOutline"
                              size="xs"
                              onClick={() => handleDeleteClassClick(classItem)}
                              disabled={isDeletingClass && classToDelete?.id === classItem.id}
                           >
                              {isDeletingClass && classToDelete?.id === classItem.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                  <Trash2 className="mr-1 h-3 w-3" />
                              )}
                              Delete Class
                           </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Instructor: {classItem.instructorName}</p>
                      {classItem.friendlyId && (
                        <p className="text-sm text-muted-foreground">Class ID: <span className="font-semibold text-primary">{classItem.friendlyId}</span> (Share with students to join)</p>
                      )}
                      
                      <Separator />
                      
                      <div>
                        <h4 className="text-md font-semibold flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5 text-primary"/>
                          Enrolled Students ({enrolledStudents.length})
                        </h4>
                        {enrolledStudents.length > 0 ? (
                          <ul className="list-disc list-inside pl-2 text-sm space-y-1 max-h-32 overflow-y-auto">
                            {enrolledStudents.map(student => (
                              <li key={student.id}>{student.displayName || student.email}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No students enrolled yet.</p>
                        )}
                      </div>

                      {pendingRequests.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="text-md font-semibold flex items-center gap-2 mb-2">
                              <Users className="h-5 w-5 text-amber-600"/>
                              Pending Join Requests ({pendingRequests.length})
                            </h4>
                            <ul className="space-y-3">
                              {pendingRequests.map(req => (
                                <li key={req.userId} className="p-2 border rounded-md text-sm bg-muted/30">
                                  <p><strong>{req.userName || req.userEmail}</strong> ({req.userEmail})</p>
                                  {req.message && <p className="italic text-muted-foreground mt-1">"{req.message}"</p>}
                                  <div className="flex gap-2 mt-2">
                                    <Button 
                                      size="xs" 
                                      variant="outline"
                                      onClick={() => handleApproveRequest(classItem.id, req.userId)}
                                      disabled={processingStudentRequestId === req.userId}
                                    >
                                      {processingStudentRequestId === req.userId ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3"/>} Approve
                                    </Button>
                                    <Button 
                                      size="xs" 
                                      variant="destructiveOutline"
                                      onClick={() => handleDenyRequest(classItem.id, req.userId)}
                                      disabled={processingStudentRequestId === req.userId}
                                    >
                                       {processingStudentRequestId === req.userId ? <Loader2 className="h-3 w-3 animate-spin"/> : <XCircle className="h-3 w-3"/>} Deny
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}

                      <Separator />
                      <div>
                        <h4 className="text-md font-semibold flex items-center gap-2 mb-2">
                          <ClipboardList className="h-5 w-5 text-indigo-500"/>
                          Quizzes for this Class ({quizzesForThisClass.length})
                        </h4>
                        {isLoadingThisClassQuizzes ? (
                            <div className="flex items-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <p className="ml-2 text-sm text-muted-foreground">Loading quizzes...</p>
                            </div>
                        ) : quizzesForThisClass.length > 0 ? (
                          <ul className="space-y-2">
                            {quizzesForThisClass.map(quiz => (
                              <li key={quiz.id} className="p-2.5 border rounded-md text-sm bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                  <p className="font-medium">{quiz.title} (Questions: {Object.keys(quiz.questions || {}).length})</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">{quiz.description}</p>
                                  <Badge variant={quiz.status === 'published' ? 'default' : 'outline'} className="mt-1 text-xs capitalize">{quiz.status}</Badge>
                                </div>
                                <div className="flex gap-1.5 self-start sm:self-center mt-2 sm:mt-0 flex-wrap">
                                    <Button 
                                      variant="outline" 
                                      size="xs"
                                      onClick={() => openEditQuizDetailsDialog(quiz)} 
                                    >
                                      <FileEdit className="mr-1 h-3 w-3" /> Edit Details
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="xs"
                                      onClick={() => openAddQuestionDialog({id: quiz.id, title: quiz.title})}
                                    >
                                      <PencilLine className="mr-1 h-3 w-3" /> Add Q
                                    </Button>
                                     <Button 
                                      variant="outline" 
                                      size="xs"
                                      onClick={() => openBulkAddQuestionsDialog({id: quiz.id, title: quiz.title})}
                                    >
                                      <ListChecks className="mr-1 h-3 w-3" /> Bulk Add
                                    </Button>
                                    {quiz.status === 'draft' ? (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={() => handlePublishQuiz(quiz.id)}
                                        disabled={processingQuizStatusChange === quiz.id || Object.keys(quiz.questions || {}).length === 0}
                                        title={Object.keys(quiz.questions || {}).length === 0 ? "Add questions before publishing" : "Publish Quiz"}
                                        className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                                      >
                                        {processingQuizStatusChange === quiz.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="mr-1 h-3 w-3" />}
                                        Publish
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={() => handleUnpublishQuiz(quiz.id)}
                                        disabled={processingQuizStatusChange === quiz.id}
                                        className="text-amber-600 border-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                      >
                                        {processingQuizStatusChange === quiz.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="mr-1 h-3 w-3" />}
                                        Unpublish
                                      </Button>
                                    )}
                                     <Button asChild variant="link" size="xs" className="px-0 h-auto">
                                        <Link href={`/quiz/${quiz.id}/leaderboard`} target="_blank">
                                            <BarChart3 className="mr-1 h-3 w-3" /> Leaderboard
                                        </Link>
                                    </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No quizzes created for this class yet. Click "Add Quiz" above to start.</p>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        
        <section className="mb-10 p-4 border rounded-lg shadow-sm bg-card">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
                <Ticket className="h-7 w-7 text-accent" />
                <h2 className="text-2xl font-semibold text-card-foreground">My Credit Vouchers</h2>
            </div>
            <Button variant="outline" onClick={() => setIsGenerateVouchersDialogOpen(true)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Generate New Vouchers
            </Button>
          </div>
          {loadingTeacherVouchers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading your vouchers...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-primary">{totalGeneratedVouchers}</p>
                  <p className="text-xs text-muted-foreground">Total Generated</p>
                </div>
                <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-green-600">{totalRedeemedVouchers}</p>
                  <p className="text-xs text-muted-foreground">Total Redeemed</p>
                </div>
                <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-blue-600">{totalActiveVouchers}</p>
                  <p className="text-xs text-muted-foreground">Currently Active</p>
                </div>
                 <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-destructive">{totalExpiredVouchers}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>

              {teacherVouchers.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">You haven't generated any vouchers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher Code</TableHead>
                        <TableHead className="text-center">Credits</TableHead>
                        <TableHead>Restricted to Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires At</TableHead>
                        <TableHead>Redeemed By (User ID)</TableHead>
                        <TableHead>Redeemed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherVouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-medium font-mono">{voucher.id}</TableCell>
                          <TableCell className="text-center">{voucher.credits}</TableCell>
                          <TableCell>{voucher.restrictedToClassName || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={getVoucherStatusBadgeVariant(voucher.status)}>
                              {voucher.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{voucher.expiryDate ? format(parseISO(voucher.expiryDate), 'PPp') : 'N/A'}</TableCell>
                          <TableCell className="truncate max-w-[100px]">{voucher.redeemedByUserId || 'N/A'}</TableCell>
                          <TableCell>{voucher.redeemedAt ? format(parseISO(voucher.redeemedAt), 'PPp') : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <CreateClassDialog
        isOpen={isCreateClassDialogOpen}
        onOpenChange={setIsCreateClassDialogOpen}
        onClassCreated={handleClassCreated}
      />
      <GenerateVouchersDialog
        isOpen={isGenerateVouchersDialogOpen}
        onOpenChange={setIsGenerateVouchersDialogOpen}
        onVouchersGenerated={handleVouchersGenerated}
      />
      {selectedClassForQuiz && (
        <CreateQuizDialog
            isOpen={isCreateQuizDialogOpen}
            onOpenChange={setIsCreateQuizDialogOpen}
            classData={selectedClassForQuiz}
            onQuizCreated={handleQuizCreatedOrUpdated}
        />
      )}
      {selectedQuizForEdit && ( 
        <EditQuizDetailsDialog
          isOpen={isEditQuizDetailsDialogOpen}
          onOpenChange={setIsEditQuizDetailsDialogOpen}
          quizData={selectedQuizForEdit}
          onQuizUpdated={handleQuizCreatedOrUpdated}
        />
      )}
      {selectedQuizForQuestion && (
        <AddMCQQuestionDialog
            isOpen={isAddQuestionDialogOpen}
            onOpenChange={setIsAddQuestionDialogOpen}
            quizDetails={selectedQuizForQuestion}
            onQuestionAdded={handleQuizCreatedOrUpdated}
        />
      )}
      {selectedQuizForBulkAdd && (
        <BulkAddQuestionsDialog
            isOpen={isBulkAddQuestionsDialogOpen}
            onOpenChange={setIsBulkAddQuestionsDialogOpen}
            quizDetails={selectedQuizForBulkAdd}
            onQuestionsAdded={handleQuizCreatedOrUpdated}
        />
      )}
       {classToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the class "{classToDelete.name}"? 
                This action cannot be undone. Students currently enrolled will remain enrolled but the class will no longer be accessible or visible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingClass}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteClass} 
                disabled={isDeletingClass}
                className={buttonVariants({variant: "destructive"})}
              >
                {isDeletingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    

    

