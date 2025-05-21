
"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldAlert, School, PlusCircle, BookCopy, Ticket, Users, BarChart3, CheckCircle, XCircle, Clock, CircleDollarSign, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import CreateClassDialog from '@/components/teacher/create-class-dialog';
import GenerateVouchersDialog from '@/components/teacher/generate-vouchers-dialog';
import { getClassesByTeacher, deleteClass, type ClassData } from '@/services/class-service';
import { getAllCreditVouchers, type CreditVoucher } from '@/services/voucher-service';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
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

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);


  const isLoading = loading || profileLoading;

  const fetchTeacherData = useCallback(async () => {
    if (user && userProfile?.isTeacher) {
      setLoadingTeacherClasses(true);
      setLoadingTeacherVouchers(true);
      try {
        const [classes, allVouchers] = await Promise.all([
          getClassesByTeacher(user.uid),
          getAllCreditVouchers()
        ]);
        setMyTeacherClasses(classes);
        
        const filteredVouchers = allVouchers
          .filter(v => v.generatedByTeacherId === user.uid)
          .map(v => ({
            ...v,
            status: v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)) ? 'expired' : v.status
          }));
        setTeacherVouchers(filteredVouchers);
        
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
      fetchTeacherData(); // Refresh the list
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


  if (isLoading || (userProfile?.isTeacher && (loadingTeacherClasses || loadingTeacherVouchers))) {
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
                Your Credits: {userProfile?.credits ?? 0}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTeacherClasses.map(classItem => (
                <Card key={classItem.id} className="shadow-md flex flex-col">
                  <CardHeader className="flex-grow">
                    <CardTitle>{classItem.name}</CardTitle>
                    <CardDescription className="pt-1 flex-grow">{classItem.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <p className="text-sm text-muted-foreground">Instructor: {classItem.instructorName}</p>
                    {classItem.friendlyId && (
                       <p className="text-sm text-muted-foreground mt-1">Class ID: <span className="font-semibold text-primary">{classItem.friendlyId}</span></p>
                    )}
                     <p className="text-xs text-muted-foreground mt-1">Internal ID: <span className="font-mono">{classItem.id.substring(0,6)}...</span></p>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteClassClick(classItem)}
                        disabled={isDeletingClass && classToDelete?.id === classItem.id}
                    >
                        {isDeletingClass && classToDelete?.id === classItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Class
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Student Management</CardTitle>
              <CardDescription>Oversee students enrolled in your classes.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Feature coming soon. (Students will be listed here based on who joined your classes)</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Class Analytics</CardTitle>
              <CardDescription>Review student engagement and flag patterns in your classes.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Feature coming soon. (Insights on flagged content and student activity within your classes)</p>
            </CardContent>
          </Card>
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

