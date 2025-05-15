
// src/components/shared/Header.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Languages, BookOpen, LogOut, LogIn, UserPlus, CreditCard, ShoppingBag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { Language, Subject } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


interface HeaderProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  selectedSubject: Subject;
  onSubjectChange: (subject: Subject) => void;
}

const languages: Language[] = ["English", "Sinhala"];
const subjects: Subject[] = ["Biology", "Combined Maths", "Physics", "Chemistry"];

export function AppHeader({
  selectedLanguage,
  onLanguageChange,
  selectedSubject,
  onSubjectChange,
}: HeaderProps) {
  const { user, logOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  }

  const showAuthControls = !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/buy-credits');


  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <GraduationCap className="h-10 w-10 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">EduCore AI</h1>
        </Link>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {user && showAuthControls && (
            <>
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedLanguage} onValueChange={(value: Language) => onLanguageChange(value)}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedSubject} onValueChange={(value: Subject) => onSubjectChange(value)}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subj) => (
                      <SelectItem key={subj} value={subj}>
                        {subj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {loading ? (
             <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
          ) : user ? (
            showAuthControls && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    {/* <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} /> */}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                     {user.school && <p className="text-xs leading-none text-muted-foreground">School: {user.school}</p>}
                    {user.alYear && <p className="text-xs leading-none text-muted-foreground">A/L Year: {user.alYear}</p>}
                    {user.mobileNumber && <p className="text-xs leading-none text-muted-foreground">Mobile: {user.mobileNumber}</p>}
                     {user.credits !== undefined && (
                      <div className="flex items-center text-xs leading-none text-muted-foreground mt-1">
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                        Credits: {user.credits}
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/buy-credits')} className="cursor-pointer">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  <span>Buy Credits</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )
          ) : (
            showAuthControls && (
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" /> Log In
                  </Link>
                </Button>
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/signup">
                    <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                  </Link>
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}

