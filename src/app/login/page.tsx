// src/app/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GraduationCap } from "lucide-react"; // ChromeIcon removed

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { logIn, signInWithGoogle, authError, setAuthError, loading, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/"); 
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const loggedInUser = await logIn(email, password);
    if (loggedInUser) {
      router.push("/");
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    const loggedInUser = await signInWithGoogle();
    if (loggedInUser) {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <GraduationCap className="h-12 w-12 text-accent" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Log in to access EduCore AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? "Logging In..." : "Log In"}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 hover:text-gray-700" 
            onClick={handleGoogleSignIn} 
            disabled={loading}
          >
            <svg 
              className="mr-2 h-[18px] w-[18px]" 
              aria-hidden="true" 
              focusable="false" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 18 18"
            >
              <path d="M17.6401 9.1815C17.6401 8.56336 17.5831 7.96309 17.4771 7.38068H9V10.818H13.8437C13.6369 11.9861 13.001 12.9997 12.0457 13.6542V15.7065H14.6169C16.4994 14.0106 17.6401 11.8015 17.6401 9.1815Z" fill="#4285F4"/>
              <path d="M9.00001 18C11.4309 18 13.4681 17.1939 14.617 15.7066L12.0458 13.6543C11.2425 14.158 10.2118 14.4852 9.00001 14.4852C6.65608 14.4852 4.67191 12.9567 3.96401 10.9056H1.2959V12.9998C2.43701 15.3798 5.48183 18 9.00001 18Z" fill="#34A853"/>
              <path d="M3.96404 10.9055C3.78404 10.3805 3.68186 9.80795 3.68186 9.20432C3.68186 8.60068 3.78404 8.02818 3.96404 7.50318V5.40894H1.29593C0.750041 6.48068 0.45459 7.69068 0.45459 9.00005C0.45459 10.3094 0.750041 11.5194 1.29593 12.5912L3.96404 10.9055Z" fill="#FBBC05"/>
              <path d="M9.00001 3.92305C10.3209 3.92305 11.5078 4.41259 12.4127 5.26495L14.6719 3.10095C13.4646 1.96077 11.4273 1.11636e-05 9.00001 1.11636e-05C5.48183 -0.000130429 2.43701 2.62018 1.2959 5.00018L3.96401 7.18541C4.67191 5.13441 6.65608 3.92305 9.00001 3.92305Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm mt-4">
          <p>
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
