// src/app/forgot-password/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MailQuestion, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { sendPasswordReset, loading, authError, setAuthError } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setMessage(null);
    const success = await sendPasswordReset(email);
    if (success) {
      setMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions.",
      });
      setEmail(""); // Clear email field on success
    } else {
      // authError will be set by the context
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <MailQuestion className="h-12 w-12 text-accent" />
          </div>
          <CardTitle className="text-3xl font-bold">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          {message && !authError && (
            <Alert variant="default" className="mb-4 bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent">
                <GraduationCap className="h-4 w-4 !text-accent" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm mt-4">
          <p>
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log In
            </Link>
          </p>
           <p className="mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
