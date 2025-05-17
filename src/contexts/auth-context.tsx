
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, updateUserCredits, type UserProfile } from '@/services/user-service';
import { Loader2 } from 'lucide-react';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean; // Overall auth loading
  profileLoading: boolean; // Specific to profile fetching
  logout: () => Promise<void>;
  deductCreditForAITutor: () => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserProfile(null); // Reset profile on error
      } finally {
        setProfileLoading(false);
      }
    } else {
      setUserProfile(null); // No user, no profile
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchUserProfile(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null
      setUserProfile(null); // Clear profile on logout
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const deductCreditForAITutor = async (): Promise<boolean> => {
    if (!user || userProfile === null || typeof userProfile.credits !== 'number') {
      console.warn("Deduct credit called without user or profile or credits.");
      return false;
    }
    if (userProfile.credits <= 0) {
      console.log("User has no credits to deduct.");
      return false; // Should be caught by UI, but good to have a check
    }
    const newCreditAmount = userProfile.credits - 1;
    try {
      await updateUserCredits(user.uid, newCreditAmount);
      setUserProfile(prevProfile => prevProfile ? { ...prevProfile, credits: newCreditAmount } : null);
      return true;
    } catch (error) {
      console.error("Failed to deduct credit:", error);
      return false;
    }
  };
  
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileLoading, logout, deductCreditForAITutor, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
