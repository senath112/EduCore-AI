
"use client";

import { useState, useRef } from 'react'; // Added useRef
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendEmailVerification } from 'firebase/auth';
import { saveUserData } from '@/services/user-service';
import type { LoginFormValues } from '@/lib/schemas';
import { LoginFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import ReCAPTCHA from 'react-google-recaptcha';

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshUserProfile, authInstance } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showResendVerificationButtonForEmail, setShowResendVerificationButtonForEmail] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleResendVerificationEmail = async (email: string) => {
    if (!authInstance || !authInstance.currentUser) {
        toast({ variant: "destructive", title: "Error", description: "Cannot resend verification email. User not signed in." });
        return;
    }
    if (authInstance.currentUser.email !== email) {
        toast({ variant: "destructive", title: "Error", description: "Mismatch in email for resending verification." });
        if (authInstance.currentUser) await signOut(authInstance);
        setShowResendVerificationButtonForEmail(null);
        return;
    }
    setIsResendingVerification(true);
    try {
        await sendEmailVerification(authInstance.currentUser);
        toast({
            title: "Verification Email Resent",
            description: `A new verification email has been sent to ${email}. Please check your inbox.`,
            duration: 7000,
        });
        setShowResendVerificationButtonForEmail(null);
    } catch (error: any) {
        console.error("Error resending verification email:", error);
        toast({ variant: "destructive", title: "Resend Failed", description: error.message || "Could not resend verification email." });
    } finally {
        setIsResendingVerification(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    if (isRecaptchaEnabled && !recaptchaToken) {
      toast({ variant: "destructive", title: "CAPTCHA Required", description: "Please complete the reCAPTCHA." });
      return;
    }
    // IMPORTANT: In a real application, you would send the 'recaptchaToken'
    // to your backend here to verify it with Google using your RECAPTCHA_SECRET_KEY.
    // This client-side only check can be bypassed.

    if (!authInstance) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please try again." });
      return;
    }
    setIsLoading(true);
    setShowResendVerificationButtonForEmail(null);
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        toast({
          variant: "destructive",
          title: "Email Not Verified",
          description: "Please verify your email address. Check your inbox for the verification link.",
          duration: 7000
        });
        setShowResendVerificationButtonForEmail(user.email);
        setIsLoading(false);
        if (recaptchaRef.current) recaptchaRef.current.reset(); // Reset CAPTCHA
        setRecaptchaToken(null);
        return;
      }

      await refreshUserProfile();
      toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });
      router.push('/');
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/user-disabled') {
        toast({ variant: "destructive", title: "Account Disabled", description: "Your account has been disabled. Please contact support." });
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password." });
      }
      else {
        toast({ variant: "destructive", title: "Login Failed", description: error.message || "An unexpected error occurred." });
      }
       if (recaptchaRef.current) recaptchaRef.current.reset();
       setRecaptchaToken(null);
    } finally {
      if (showResendVerificationButtonForEmail === null) {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (!authInstance) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please try again." });
      return;
    }
    setIsGoogleLoading(true);
    setShowResendVerificationButtonForEmail(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(authInstance, provider);
      const user = result.user;
      if (user) {
        await saveUserData(user, { email: user.email, displayName: user.displayName, photoURL: user.photoURL });
        await refreshUserProfile();
        toast({ title: "Google Sign-in Successful", description: "Welcome! Redirecting..." });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Google Sign-in error:", error);
      console.warn("Google Sign-in specific error: " + error.code + ". This often relates to browser pop-up blockers, extensions, or OAuth configuration (e.g., Authorized JavaScript Origins in Google Cloud Console). Check browser console for the full error object logged above.");
      let description = "An unexpected error occurred during Google Sign-in.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Google Sign-in could not complete. The popup window may have been closed or blocked. Please check your browser settings (e.g., pop-up blockers) and try again.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Google Sign-in Failed", description });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || isGoogleLoading || isResendingVerification || (isRecaptchaEnabled && !recaptchaToken);

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Log In</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
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
                    <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading || isGoogleLoading || isResendingVerification} />
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading || isResendingVerification} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isRecaptchaEnabled && recaptchaSiteKey && (
              <FormItem>
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaSiteKey}
                  onChange={handleRecaptchaChange}
                />
                {!recaptchaToken && <p className="text-sm font-medium text-destructive">Please complete the CAPTCHA.</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  reCAPTCHA is for security. Server-side validation is required for true protection.
                </p>
              </FormItem>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Log In'}
            </Button>
            {showResendVerificationButtonForEmail && (
                 <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleResendVerificationEmail(showResendVerificationButtonForEmail)}
                    disabled={isResendingVerification}
                >
                    {isResendingVerification ? <Loader2 className="animate-spin" /> : 'Resend Verification Email'}
                </Button>
            )}
             <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading || isResendingVerification}>
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" role="img" aria-label="Google logo">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              )}
              Sign in with Google
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{' '}
              <Button variant="link" asChild className="px-0">
                <Link href="/signup">Sign up</Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
