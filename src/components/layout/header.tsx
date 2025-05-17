
"use client";

import Link from 'next/link';
import LogoIcon from '@/components/icons/logo-icon';
import LanguageSelector from '@/components/shared/language-selector';
import SubjectSelector from '@/components/shared/subject-selector';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, LogIn, CircleDollarSign, Settings } from 'lucide-react'; 

export default function Header() {
  const { user, userProfile, logout, loading: authLoading, profileLoading } = useAuth();
  const isLoading = authLoading || profileLoading;

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <LogoIcon className="h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">EduCore AI</h1>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <SubjectSelector />
              <LanguageSelector />
            </>
          )}
          {isLoading ? (
            <div className="h-9 w-32 rounded-md bg-muted animate-pulse" /> 
          ) : user ? (
            <div className="flex items-center gap-3">
              {userProfile && typeof userProfile.credits === 'number' && (
                <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-2 py-1 text-sm">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  {userProfile.credits} Credits
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} alt={userProfile?.displayName || user.displayName || user.email || 'User'} />
                      <AvatarFallback>
                        {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button variant="outline" asChild size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Log In
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
