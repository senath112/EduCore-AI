
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  getUserPlannerEntries,
  updatePlannerEntry,
  deletePlannerEntry,
  type PlannerEntry,
} from '@/services/study-planner-service';
import AddPlannerEntryDialog from '@/components/planner/add-planner-entry-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, LogIn, CalendarCheck, PlusCircle, Trash2, Edit3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isPast } from 'date-fns';

export default function StudyPlannerPage() {
  const { user, loading: authLoading, profileLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [plannerEntries, setPlannerEntries] = useState<PlannerEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  
  const [entryToDelete, setEntryToDelete] = useState<PlannerEntry | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [processingCompleteToggle, setProcessingCompleteToggle] = useState<string | null>(null);


  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      setIsLoadingEntries(true);
      const unsubscribe = getUserPlannerEntries(user.uid, (entries) => {
        setPlannerEntries(entries);
        setIsLoadingEntries(false);
      });
      return () => unsubscribe(); // Cleanup listener on unmount
    }
  }, [user, isLoading, router]);

  const handleToggleComplete = async (entry: PlannerEntry) => {
    if (!user) return;
    setProcessingCompleteToggle(entry.id);
    try {
      await updatePlannerEntry(user.uid, entry.id, { isCompleted: !entry.isCompleted });
      // The real-time listener will update the UI.
      toast({
        title: `Task ${!entry.isCompleted ? 'completed' : 'marked incomplete'}`,
        description: `"${entry.task}" status updated.`,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
        setProcessingCompleteToggle(null);
    }
  };

  const openDeleteConfirmation = (entry: PlannerEntry) => {
    setEntryToDelete(entry);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!user || !entryToDelete) return;
    setIsProcessingDelete(true);
    try {
      await deletePlannerEntry(user.uid, entryToDelete.id);
      toast({ title: "Entry Deleted", description: `"${entryToDelete.task}" removed from your planner.` });
      // Listener will update the UI.
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
      setIsProcessingDelete(false);
      setIsConfirmDeleteOpen(false);
      setEntryToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Study Planner...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to use the Study Planner.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }

  const upcomingEntries = plannerEntries.filter(entry => !entry.isCompleted && !isPast(parseISO(entry.dateTime)));
  const pastOrCompletedEntries = plannerEntries.filter(entry => entry.isCompleted || isPast(parseISO(entry.dateTime)));

  return (
    <>
      <div className="w-full max-w-4xl mx-auto my-auto flex flex-col flex-grow gap-6">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <CalendarCheck className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-primary">My Study Planner</h1>
            </div>
            <Button onClick={() => setIsAddEntryDialogOpen(true)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Study Entry
            </Button>
          </div>
          <p className="text-lg text-muted-foreground">Organize your study sessions and track your progress.</p>
        </header>

        {isLoadingEntries && (
          <div className="flex justify-center items-center py-10 col-span-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your planner entries...</p>
          </div>
        )}

        {!isLoadingEntries && upcomingEntries.length === 0 && (
          <Card className="shadow-lg text-center col-span-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <CalendarCheck className="h-6 w-6 text-primary" /> No Upcoming Study Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You have no upcoming study sessions planned. Click "Add New Study Entry" to get started!</p>
            </CardContent>
          </Card>
        )}
        
        {!isLoadingEntries && upcomingEntries.length > 0 && (
            <section>
                <h2 className="text-xl font-semibold text-secondary mb-3">Upcoming Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEntries.map((entry) => (
                    <Card key={entry.id} className={`shadow-md flex flex-col ${entry.isCompleted ? 'opacity-60 bg-muted/30' : 'bg-card'}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{entry.task}</CardTitle>
                        <Badge variant="outline" className="capitalize">{entry.subject}</Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1 text-sm pt-1">
                            <Clock className="h-3.5 w-3.5" /> 
                            {format(parseISO(entry.dateTime), "PPP 'at' p")}
                            {entry.durationMinutes && ` (${entry.durationMinutes} mins)`}
                        </CardDescription>
                    </CardHeader>
                    {entry.notes && (
                        <CardContent className="pt-0 pb-2">
                        <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">Notes: {entry.notes}</p>
                        </CardContent>
                    )}
                    <CardFooter className="mt-auto pt-3 flex justify-between items-center border-t">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`complete-${entry.id}`}
                                checked={entry.isCompleted}
                                onCheckedChange={() => handleToggleComplete(entry)}
                                disabled={processingCompleteToggle === entry.id}
                            />
                            <label
                                htmlFor={`complete-${entry.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {entry.isCompleted ? 'Completed' : 'Mark as Complete'}
                            </label>
                             {processingCompleteToggle === entry.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteConfirmation(entry)}
                        disabled={isProcessingDelete && entryToDelete?.id === entry.id}
                        title="Delete Entry"
                        className="text-destructive hover:text-destructive/80"
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                    </Card>
                ))}
                </div>
            </section>
        )}


        {!isLoadingEntries && pastOrCompletedEntries.length > 0 && (
            <section className="mt-8">
                <h2 className="text-xl font-semibold text-muted-foreground mb-3">Past & Completed Sessions</h2>
                <ScrollArea className="h-[300px] pr-3">
                <div className="space-y-3">
                {pastOrCompletedEntries.map((entry) => (
                    <Card key={entry.id} className={`shadow-sm flex flex-col ${entry.isCompleted ? 'bg-green-50 dark:bg-green-900/30 border-green-500/50' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-500/50'}`}>
                    <CardHeader className="p-3">
                        <div className="flex justify-between items-start">
                            <CardTitle className={`text-md ${entry.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{entry.task}</CardTitle>
                            <Badge variant={entry.isCompleted ? "default" : "secondary"} className="capitalize text-xs">
                                {entry.isCompleted ? <CheckCircle className="mr-1 h-3 w-3"/> : <AlertTriangle className="mr-1 h-3 w-3"/>}
                                {entry.isCompleted ? 'Completed' : 'Past Due'}
                            </Badge>
                        </div>
                         <CardDescription className="text-xs text-muted-foreground">
                            {format(parseISO(entry.dateTime), "PPP 'at' p")} - {entry.subject}
                        </CardDescription>
                    </CardHeader>
                     {entry.notes && (
                        <CardContent className="p-3 pt-0 text-xs text-muted-foreground italic whitespace-pre-wrap">
                        Notes: {entry.notes}
                        </CardContent>
                    )}
                    <CardFooter className="p-3 pt-2 flex justify-end items-center border-t">
                         <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirmation(entry)}
                        disabled={isProcessingDelete && entryToDelete?.id === entry.id}
                        title="Delete Entry"
                        className="text-destructive hover:text-destructive/80 h-7 px-2"
                        >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                    </CardFooter>
                    </Card>
                ))}
                </div>
                </ScrollArea>
            </section>
        )}

      </div>

      <AddPlannerEntryDialog
        isOpen={isAddEntryDialogOpen}
        onOpenChange={setIsAddEntryDialogOpen}
        onEntryAdded={() => { /* Real-time listener updates the list */ }}
      />

      {entryToDelete && (
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive"/> Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the planner entry for "{entryToDelete.task}"? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteOpen(false)} disabled={isProcessingDelete}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEntry} disabled={isProcessingDelete} className="bg-destructive hover:bg-destructive/90">
                {isProcessingDelete ? <Loader2 className="animate-spin" /> : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
