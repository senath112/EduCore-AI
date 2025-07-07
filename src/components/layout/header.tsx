
"use client";

import Link from 'next/link';
import { useState } from 'react';
import LogoIcon from '@/components/icons/logo-icon';
import LanguageSelector from '@/components/shared/language-selector';
import SubjectSelector from '@/components/shared/subject-selector';
import SettingsDialog from '@/components/settings/settings-dialog';
import RequestSupportDialog from '@/components/support/request-support-dialog';
import MyBadgesDialog from '@/components/badges/my-badges-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
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
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, LogOut, LogIn, CircleDollarSign, Settings, LifeBuoy, Award, Flame, Sun, Moon, UserCog, BookOpenCheck, MessagesSquare, Trophy, Layers, Puzzle, ClipboardList, CalendarCheck, BookOpen } from 'lucide-react';

export default function Header() {
  const { user, userProfile, logout, loading: authLoading, profileLoading } = useAuth();
  const { theme, setTheme } = useSettings();
  const isLoading = authLoading || profileLoading;
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isRequestSupportDialogOpen, setIsRequestSupportDialogOpen] = useState(false);
  const [isMyBadgesDialogOpen, setIsMyBadgesDialogOpen] = useState(false);


  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleOpenSupportDialog = () => {
    if (!user || !userProfile) return;
    setIsRequestSupportDialogOpen(true);
  };


  return (
    <>
      <header className="sticky top-0 z-40 w-full flex justify-center p-2">
        <div className="flex h-14 items-center justify-between gap-x-3 rounded-full bg-[var(--glass-bg)] px-4 shadow-[var(--glass-shadow)] backdrop-blur-lg sm:gap-x-4 border-[var(--glass-border)]">
            <Link href="/" className="flex items-center gap-2 text-primary transition-opacity hover:opacity-80">
              <LogoIcon className="h-8 w-8" />
              <h1 className="hidden text-xl font-semibold tracking-tight sm:block">EduCore AI</h1>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-x-2 sm:gap-x-3">
              {user && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <SubjectSelector />
                  <LanguageSelector />
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {isLoading ? (
                <div className="h-9 w-24 rounded-full bg-muted/50 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  {userProfile && typeof userProfile.credits === 'number' && !(userProfile.isAdmin || userProfile.isTeacher) && (
                    <Badge variant="secondary" className="hidden lg:flex items-center gap-1 pl-2 pr-2 py-1 text-sm">
                      <CircleDollarSign className="h-4 w-4 text-primary" />
                      {userProfile.credits}
                    </Badge>
                  )}
                  {userProfile && userProfile.currentStreak && userProfile.currentStreak > 0 && !(userProfile.isAdmin || userProfile.isTeacher) && (
                    <Badge variant="outline" className="hidden lg:flex items-center gap-1 pl-2 pr-2 py-1 text-sm border-orange-500 text-orange-600">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {userProfile.currentStreak} Day
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
                    <DropdownMenuContent className="w-64 max-h-[80vh] overflow-y-auto" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1 py-1">
                          <p className="text-sm font-medium leading-none">
                            {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      
                      <DropdownMenuSeparator />

                      { (userProfile?.isAdmin || userProfile?.isTeacher) && (
                        <>
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Dashboards</DropdownMenuLabel>
                            {userProfile?.isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link href="/admin"><UserCog className="mr-2 h-4 w-4" />Admin</Link>
                              </DropdownMenuItem>
                            )}
                            {userProfile?.isTeacher && (
                              <DropdownMenuItem asChild>
                                <Link href="/teacher"><BookOpenCheck className="mr-2 h-4 w-4" />Teacher</Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      <DropdownMenuGroup>
                          <DropdownMenuLabel>Learning Tools</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                              <Link href="/tools/flashcards"><Layers className="mr-2 h-4 w-4" />Flashcard Generator</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href="/tools/puzzle-maker"><Puzzle className="mr-2 h-4 w-4" />Puzzle Maker</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href="/tools/marks-analyzer"><ClipboardList className="mr-2 h-4 w-4" />Marks Tracker</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/planner"><CalendarCheck className="mr-2 h-4 w-4" />Study Planner</Link>
                          </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />

                      <DropdownMenuGroup>
                          <DropdownMenuLabel>Engagement</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href="/classes"><BookOpen className="mr-2 h-4 w-4" />My Classes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/leaderboard"><Trophy className="mr-2 h-4 w-4" />Global Leaderboard</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/forum"><MessagesSquare className="mr-2 h-4 w-4" />Forum</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsMyBadgesDialogOpen(true)}>
                              <Award className="mr-2 h-4 w-4" />
                              <span>My Badges</span>
                          </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />

                      <DropdownMenuGroup>
                          <DropdownMenuLabel>Account</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Settings</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleOpenSupportDialog}>
                                  <LifeBuoy className="mr-2 h-4 w-4" />
                              <span>Get Support</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={logout}>
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Log out</span>
                          </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild size="sm">
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" /> Log In
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
        </div>
      </header>
      <SettingsDialog isOpen={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />
      {user && userProfile && ( 
         <RequestSupportDialog isOpen={isRequestSupportDialogOpen} onOpenChange={setIsRequestSupportDialogOpen} />
      )}
      {user && userProfile && (
        <MyBadgesDialog isOpen={isMyBadgesDialogOpen} onOpenChange={setIsMyBadgesDialogOpen} />
      )}
    </>
  );
}
