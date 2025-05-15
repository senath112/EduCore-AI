// src/app/signup/page.tsx
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
import { GraduationCap } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [school, setSchool] = useState("");
  const [alYear, setAlYear] = useState("");
  const [mobileNumber, setMobileNumber] = useState(""); // Added mobile number state
  const { signUp, authError, setAuthError, loading, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/"); // Redirect if already logged in
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (!/^\d{4}$/.test(alYear)) {
      setAuthError("A/L Year must be a 4-digit year (e.g., 2025).");
      return;
    }
    // Basic validation for mobile number (e.g., not empty, you can add more specific regex)
    if (!mobileNumber.trim()) {
        setAuthError("Mobile number is required.");
        return;
    }
    if (!/^\+?[0-9\s-()]{7,15}$/.test(mobileNumber)) {
      setAuthError("Please enter a valid mobile number (7-15 digits, can include +, -, (), spaces).");
      return;
    }

    const signedUpUser = await signUp(email, password, school, alYear, mobileNumber.trim());
    if (signedUpUser) {
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
          <CardTitle className="text-3xl font-bold">Create your Account</CardTitle>
          <CardDescription>Join EduCore AI to start learning.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <Alert variant="destructive">
                <AlertTitle>Signup Failed</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/30"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                type="text"
                placeholder="Your School Name"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alYear">A/L Year (e.g., 2025)</Label>
              <Input
                id="alYear"
                type="text" 
                placeholder="YYYY"
                value={alYear}
                onChange={(e) => setAlYear(e.target.value)}
                required
                pattern="\d{4}"
                title="Please enter a 4-digit year"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                type="tel" 
                placeholder="e.g., +947XXXXXXXX"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
