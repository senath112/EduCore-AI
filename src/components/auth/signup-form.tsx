
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveUserData } from '@/services/user-service';
import type { SignupFormValues } from '@/lib/schemas';
import { SignupFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Chrome } from 'lucide-react'; // Added Chrome for Google Icon
import { useAuth } from '@/hooks/use-auth';

const DEFAULT_SIGNUP_CREDITS = 10;

export default function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(SignupFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      age: undefined,
      alFacingYear: undefined,
      phoneNumber: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      if (user) {
        await saveUserData(user, {
          age: values.age,
          alFacingYear: values.alFacingYear,
          phoneNumber: values.phoneNumber,
          email: values.email, 
          credits: DEFAULT_SIGNUP_CREDITS, // Assign initial credits on email/password signup
        });
        await refreshUserProfile(); // Refresh profile to get credits in context
        toast({ title: "Signup Successful", description: "Welcome! Redirecting to the app..." });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({ variant: "destructive", title: "Signup Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        // saveUserData will assign default credits if it's a new user via Google
        await saveUserData(user, { email: user.email, displayName: user.displayName, photoURL: user.photoURL });
        await refreshUserProfile(); // Refresh profile to get credits in context
        toast({ title: "Google Sign-in Successful", description: "Welcome! Redirecting to the app..." });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Google Sign-in error:", error); // Log the full error object
      let description = "An unexpected error occurred during Google Sign-in.";
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn("Google Sign-in specific error: auth/popup-closed-by-user. This often relates to browser pop-up blockers, extensions, or OAuth configuration (e.g., Authorized JavaScript Origins in Google Cloud Console). Check browser console for the full error object logged above.");
        description = "Google Sign-in could not complete. The popup window may have been closed or blocked. Please check your browser settings (e.g., pop-up blockers) and try again.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Google Sign-in Failed", description });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>Enter your details below to sign up.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Your age" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alFacingYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>A/L Facing Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2025" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+947XXXXXXXX" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
            </Button>
            <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />} Sign Up with Google
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Button variant="link" asChild className="px-0">
                <Link href="/login">Log in</Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
