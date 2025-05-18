
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { User, Auth } from 'firebase/auth'; // Added Auth type
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'; // Added getAuth
import { app } from '@/lib/firebase'; // Import app
import { getUserProfile, updateUserCredits, type UserProfile, saveUserData } from '@/services/user-service';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  authInstance: Auth; // Firebase Auth instance
  userProfile: UserProfile | null;
  loading: boolean; // Overall auth loading
  profileLoading: boolean; // Specific to profile fetching
  logout: () => Promise<void>;
  deductCreditForAITutor: () => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  handleAddCredits: (amount: number) => Promise<boolean>;
  promptForUserDetails: boolean;
  setPromptForUserDetails: (value: boolean) => void;
};

// Initialize authInstance directly here as app is already initialized
const authInstance: Auth = getAuth(app);

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [promptForUserDetails, setPromptForUserDetails] = useState(false);
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);

        if (profile) {
          const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
          const detailsMissing = !profile.age || !profile.alFacingYear || !profile.phoneNumber;
          if (isGoogleUser && detailsMissing) {
            setPromptForUserDetails(true);
          } else {
            setPromptForUserDetails(false);
          }
        } else {
          const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleUser) {
             // Handled by CompleteProfileDialog logic if profile is null after initial saveUserData
          }
           setPromptForUserDetails(false);
        }

      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserProfile(null);
        setPromptForUserDetails(false);
      } finally {
        setProfileLoading(false);
      }
    } else {
      setUserProfile(null);
      setPromptForUserDetails(false);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUserProfile(null);
        setPromptForUserDetails(false);
        setProfileLoading(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]); // authInstance is stable, not needed in deps

  const logout = async () => {
    try {
      await firebaseSignOut(authInstance);
      setUser(null);
      setUserProfile(null);
      setPromptForUserDetails(false);
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
      return false;
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
    <AuthContext.Provider value={{
      user,
      authInstance, // Provide authInstance
      userProfile,
      loading,
      profileLoading,
      logout,
      deductCreditForAITutor,
      refreshUserProfile,
      handleAddCredits,
      promptForUserDetails,
      setPromptForUserDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
}
