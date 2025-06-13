
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
import { User as UserIcon, LogOut, LogIn, CircleDollarSign, Settings, CalendarDays, Phone, UserRound, Sun, Moon, ShieldCheck, LifeBuoy, School, BookOpen, Layers, Puzzle, ClipboardList, Trophy, CalendarCheck, MessageSquare, Flame, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function Header() {
  const { user, userProfile, logout, loading: authLoading, profileLoading } = useAuth();
  const { theme, setTheme } = useSettings();
  const router = useRouter();
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

  const handleForumLinkClick = () => {
    window.open('https://educore.discourse.group', '_blank', 'noopener,noreferrer');
  };


  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <LogoIcon className="h-8 w-8" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">EduCore AI</h1>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-y-2 gap-x-3 sm:gap-x-4">
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
              <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {userProfile && typeof userProfile.credits === 'number' && !(userProfile.isAdmin || userProfile.isTeacher) && (
                  <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-2 py-1 text-sm">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    {userProfile.credits} Credits
                  </Badge>
                )}
                 {userProfile && userProfile.currentStreak && userProfile.currentStreak > 0 && !(userProfile.isAdmin || userProfile.isTeacher) && (
                  <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-2 py-1 text-sm border-orange-500 text-orange-600">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {userProfile.currentStreak} Day Streak
                  </Badge>
                )}
                {userProfile && (userProfile.isAdmin || userProfile.isTeacher) && (
                   <Badge variant="outline" className="text-sm">
                     {userProfile.isAdmin ? 'Admin Account' : 'Teacher Account'}
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
                  <DropdownMenuContent className="w-60 sm:w-64 max-h-[80vh] overflow-y-auto" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1.5 py-1">
                        <p className="text-sm font-medium leading-none">
                          {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        {userProfile?.age && (
                          <div className="flex items-center text-xs leading-none text-muted-foreground pt-1">
                            <UserRound className="mr-2 h-3.5 w-3.5 opacity-70" />
                            <span>Age: {userProfile.age}</span>
                          </div>
                        )}
                        {userProfile?.alFacingYear && (
                          <div className="flex items-center text-xs leading-none text-muted-foreground">
                            <CalendarDays className="mr-2 h-3.5 w-3.5 opacity-70" />
                            <span>A/L Year: {userProfile.alFacingYear}</span>
                          </div>
                        )}
                        {userProfile?.phoneNumber && (
                          <div className="flex items-center text-xs leading-none text-muted-foreground">
                            <Phone className="mr-2 h-3.5 w-3.5 opacity-70" />
                            <span>Phone: {userProfile.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />

                    { (userProfile?.isAdmin || userProfile?.isTeacher) && (
                      <DropdownMenuGroup>
                         <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Dashboards</DropdownMenuLabel>
                        {userProfile?.isAdmin && (
                          <DropdownMenuItem onClick={() => router.push('/admin')}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </DropdownMenuItem>
                        )}
                        {userProfile?.isTeacher && (
                          <DropdownMenuItem onClick={() => router.push('/teacher')}>
                            <School className="mr-2 h-4 w-4" />
                            <span>Teacher Dashboard</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </DropdownMenuGroup>
                    )}
                    
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Learning Tools</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push('/tools/flashcards')}>
                        <Layers className="mr-2 h-4 w-4" />
                        <span>Flashcard Generator</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/tools/puzzle-maker')}>
                        <Puzzle className="mr-2 h-4 w-4" />
                        <span>Puzzle Maker</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/tools/marks-analyzer')}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>Marks Tracker</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/planner')}>
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        <span>Study Planner</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                       <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Engagement</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push('/classes')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>My Classes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/leaderboard')}>
                        <Trophy className="mr-2 h-4 w-4" />
                        <span>Global Leaderboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleForumLinkClick}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Forum (External)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsMyBadgesDialogOpen(true)}>
                        <Award className="mr-2 h-4 w-4" />
                        <span>My Badges</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    
                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                       <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Account</DropdownMenuLabel>
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
