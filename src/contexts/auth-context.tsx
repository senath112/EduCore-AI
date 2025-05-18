
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, updateUserCredits, type UserProfile, saveUserData } from '@/services/user-service';
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
  promptForUserDetails: boolean;
  setPromptForUserDetails: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true); // Start true until first profile fetch attempt
  const [promptForUserDetails, setPromptForUserDetails] = useState(false);
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);

        // Check if profile details are missing for Google user
        if (profile) {
          const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
          const detailsMissing = !profile.age || !profile.alFacingYear || !profile.phoneNumber;
          if (isGoogleUser && detailsMissing) {
            setPromptForUserDetails(true);
          } else {
            setPromptForUserDetails(false);
          }
        } else {
          // If no profile exists yet (e.g., very first Google sign-in before saveUserData runs)
          const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleUser) {
             // We anticipate saveUserData will be called shortly by login/signup forms.
             // For Google users, this initial saveUserData won't have age, etc.
             // So, profile will be incomplete then, triggering the prompt.
             // If profile is truly null after saveUserData, it means details are missing.
            // No specific action here, relies on subsequent saveUserData and profile check.
            // Might need a slight delay or ensure saveUserData is always called first on new login.
            // For now, let's assume profile will be created and then checked.
            // If saveUserData creates it, details will be missing, and prompt will show.
          }
           setPromptForUserDetails(false); // Default to false if no profile
        }

      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserProfile(null); // Reset profile on error
        setPromptForUserDetails(false);
      } finally {
        setProfileLoading(false);
      }
    } else {
      setUserProfile(null); // No user, no profile
      setPromptForUserDetails(false);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      // saveUserData is called from login/signup forms, then profile is fetched
      // Let's ensure profile fetch runs AFTER user is set.
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        // Clear profile if user logs out
        setUserProfile(null);
        setPromptForUserDetails(false);
        setProfileLoading(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
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
      await fetchUserProfile(user); // This will re-evaluate promptForUserDetails
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


  if (loading) { // Only use overall loading for the splash screen
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
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
