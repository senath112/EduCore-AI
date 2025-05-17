
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, updateUserCredits, type UserProfile } from '@/services/user-service';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean; // Overall auth loading
  profileLoading: boolean; // Specific to profile fetching
  logout: () => Promise<void>;
  deductCreditForAITutor: () => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  handleAddCredits: (amount: number) => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const { toast } = useToast();

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

  const handleAddCredits = async (amount: number): Promise<boolean> => {
    if (!user || userProfile === null || typeof userProfile.credits !== 'number') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User profile not loaded. Cannot add credits.",
      });
      return false;
    }
    if (amount <= 0) {
        toast({
            variant: "destructive",
            title: "Invalid Amount",
            description: "Credit amount must be positive.",
        });
        return false;
    }

    const newCreditAmount = (userProfile.credits || 0) + amount;
    try {
      await updateUserCredits(user.uid, newCreditAmount);
      setUserProfile(prevProfile => prevProfile ? { ...prevProfile, credits: newCreditAmount } : null);
      toast({
        title: "Credits Added",
        description: `${amount} credits have been successfully added to your account.`,
      });
      return true;
    } catch (error) {
      console.error("Failed to add credits:", error);
      toast({
        variant: "destructive",
        title: "Error Adding Credits",
        description: "Could not add credits to your account. Please try again.",
      });
      return false;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileLoading, logout, deductCreditForAITutor, refreshUserProfile, handleAddCredits }}>
      {children}
    </AuthContext.Provider>
  );
}
