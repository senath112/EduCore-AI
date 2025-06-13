
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addMarkEntry, getUserMarkEntries, deleteUserMarkEntry, type MarkEntry } from '@/services/user-service';
import { AddMarkEntrySchema, type AddMarkEntryFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, LogIn, ClipboardList, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import ReCAPTCHA from 'react-google-recaptcha';
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

export default function MarksTrackerPage() {
  const { user, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();

  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isAddingMark, setIsAddingMark] = useState(false);
  const [isDeletingMark, setIsDeletingMark] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<MarkEntry | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<AddMarkEntryFormValues>({
    resolver: zodResolver(AddMarkEntrySchema),
    defaultValues: {
      subjectName: '',
      markObtained: '', // Changed from undefined
      totalMarks: '',   // Changed from undefined
    },
  });

  const fetchMarkEntries = useCallback(async () => {
    if (user) {
      setIsLoadingEntries(true);
      try {
        const entries = await getUserMarkEntries(user.uid);
        setMarkEntries(entries);
      } catch (error) {
        console.error("Failed to fetch mark entries:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load your marks." });
      } finally {
        setIsLoadingEntries(false);
      }
    } else {
      setMarkEntries([]);
      setIsLoadingEntries(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMarkEntries();
    }
  }, [user, authLoading, fetchMarkEntries]);

  const handleAddMarkSubmit = async (values: AddMarkEntryFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to add marks." });
      return;
    }
    setIsAddingMark(true);

    if (isRecaptchaEnabled && recaptchaRef.current && recaptchaSiteKey) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify. Please try again." });
          setIsAddingMark(false);
          if (recaptchaRef.current) recaptchaRef.current.reset();
          return;
        }
      } catch (error) {
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Verification error." });
        setIsAddingMark(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    try {
      await addMarkEntry(user.uid, values);
      toast({ title: "Mark Added", description: `Mark for ${values.subjectName} saved successfully.` });
      form.reset({ // Reset with corrected default values
        subjectName: '',
        markObtained: '',
        totalMarks: '',
      });
      fetchMarkEntries(); // Refresh list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Add Mark", description: error.message || "Could not save the mark." });
    } finally {
      setIsAddingMark(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  const openDeleteConfirmation = (entry: MarkEntry) => {
    setEntryToDelete(entry);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteMark = async () => {
    if (!user || !entryToDelete) return;
    setIsDeletingMark(true);
    try {
      await deleteUserMarkEntry(user.uid, entryToDelete.id);
      toast({ title: "Mark Deleted", description: `Mark for ${entryToDelete.subjectName} deleted.` });
      fetchMarkEntries(); // Refresh list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Delete", description: error.message || "Could not delete the mark." });
    } finally {
      setIsDeletingMark(false);
      setIsConfirmDeleteOpen(false);
      setEntryToDelete(null);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Marks Tracker...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to track your marks.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-auto flex flex-col flex-grow gap-6">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Marks Tracker</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Manually add and keep track of your marks for different subjects.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Add New Mark Entry</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddMarkSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="subjectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Physics Term Test 1" {...field} disabled={isAddingMark} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="markObtained"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mark Obtained</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 75" {...field} disabled={isAddingMark} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalMarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Marks</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} disabled={isAddingMark} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isRecaptchaEnabled && recaptchaSiteKey && (
                <FormItem className="pt-2">
                  <ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaSiteKey} size="invisible" />
                  <p className="text-xs text-muted-foreground mt-1">
                    This site is protected by reCAPTCHA. Server-side validation is required for true protection.
                  </p>
                </FormItem>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isAddingMark || (isRecaptchaEnabled && !recaptchaRef.current)}>
                {isAddingMark ? <Loader2 className="animate-spin" /> : "Add Mark"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="shadow-lg flex-grow flex flex-col">
        <CardHeader>
          <CardTitle>My Mark Entries ({markEntries.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          {isLoadingEntries ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading marks...</p>
            </div>
          ) : markEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No marks entered yet. Add your first mark above!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject / Exam Name</TableHead>
                    <TableHead className="text-center">Mark</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead>Date Entered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.subjectName}</TableCell>
                      <TableCell className="text-center">{entry.markObtained} / {entry.totalMarks}</TableCell>
                      <TableCell className="text-center font-semibold">{entry.percentage.toFixed(1)}%</TableCell>
                      <TableCell>{format(parseISO(entry.dateEntered), 'PP p')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(entry)}
                          disabled={isDeletingMark && entryToDelete?.id === entry.id}
                          title="Delete Mark Entry"
                        >
                          {isDeletingMark && entryToDelete?.id === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {entryToDelete && (
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive"/> Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the mark entry for "{entryToDelete.subjectName}" 
                ({entryToDelete.markObtained}/{entryToDelete.totalMarks})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteOpen(false)} disabled={isDeletingMark}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteMark} disabled={isDeletingMark} className="bg-destructive hover:bg-destructive/90">
                {isDeletingMark ? <Loader2 className="animate-spin" /> : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    