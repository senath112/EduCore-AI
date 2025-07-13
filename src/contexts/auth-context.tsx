
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, Auth } from 'firebase/auth';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { getUserProfile, updateUserCredits, type UserProfile, saveUserData, updateUserActivityAndStreak } from '@/services/user-service';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type ReCAPTCHA from 'react-google-recaptcha';

type AuthContextType = {
  user: User | null;
  authInstance: Auth;
  userProfile: UserProfile | null;
  loading: boolean; // Overall auth loading
  profileLoading: boolean; // Specific to profile fetching
  logout: () => Promise<void>;
  deductCreditForAITutor: (amountToDeduct?: number) => Promise<boolean>;
  deductCreditForFlashcards: (amountToDeduct: number) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  triggerStreakUpdate: () => Promise<void>;
  promptForUserDetails: boolean;
  setPromptForUserDetails: (value: boolean) => void;
  deductCreditForAiPlanner: (amountToDeduct: number) => Promise<boolean>;
  recaptchaRef: React.RefObject<ReCAPTCHA>; // Add reCAPTCHA ref to context
};

const authInstanceGlobal: Auth = getAuth(app); 

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [promptForUserDetails, setPromptForUserDetails] = useState(false);
  const { toast } = useToast();
  const authInstance = authInstanceGlobal;
  const recaptchaRef = useRef<ReCAPTCHA>(null); // Create the ref here

  const fetchUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        console.log("Fetched profile in AuthContext:", profile);


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
             setPromptForUserDetails(true);
           } else {
            setPromptForUserDetails(false);
           }
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
  }, [fetchUserProfile, authInstance]);

  const logout = async () => {
    try {
      await firebaseSignOut(authInstance);
      setUser(null);
      setUserProfile(null);
      setPromptForUserDetails(false);
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not sign you out." });
    }
  };

  const deductCreditForAITutor = async (amountToDeduct: number = 1): Promise<boolean> => {
    if (!user || userProfile === null) {
      console.warn("Deduct credit called without user or profile.");
      return false;
    }
    
    if (userProfile.isAdmin || userProfile.isTeacher) {
      console.log("Admin or Teacher user (AI Tutor): credit deduction bypassed.");
      return true;
    }

    if (typeof userProfile.credits !== 'number' || userProfile.credits < amountToDeduct) {
      console.log(`User has insufficient credits for AI Tutor. Needs ${amountToDeduct}, has ${userProfile.credits}.`);
      return false;
    }
    
    const newCreditAmount = userProfile.credits - amountToDeduct;
    try {
      await updateUserCredits(user.uid, newCreditAmount);
      await refreshUserProfile(); 
      return true;
    } catch (error) {
      console.error("Failed to deduct credit for AI Tutor:", error);
      return false;
    }
  };
  
    const deductCreditForAiPlanner = async (amountToDeduct: number): Promise<boolean> => {
    if (!user || userProfile === null) {
      console.warn("Deduct credit called without user or profile.");
      return false;
    }
    
    if (userProfile.isAdmin || userProfile.isTeacher) {
      console.log("Admin or Teacher user (AI Planner): credit deduction bypassed.");
      return true;
    }

    if (typeof userProfile.credits !== 'number' || userProfile.credits < amountToDeduct) {
      console.log(`User has insufficient credits for AI Planner. Needs ${amountToDeduct}, has ${userProfile.credits}.`);
      return false;
    }
    
    const newCreditAmount = userProfile.credits - amountToDeduct;
    try {
      await updateUserCredits(user.uid, newCreditAmount);
      await refreshUserProfile(); 
      return true;
    } catch (error) {
      console.error("Failed to deduct credit for AI Planner:", error);
      return false;
    }
  };


  const deductCreditForFlashcards = async (amountToDeduct: number): Promise<boolean> => {
    if (!user || userProfile === null) {
      console.warn("Deduct credit for flashcards called without user or profile.");
      return false;
    }
    if (userProfile.isAdmin || userProfile.isTeacher) {
      console.log("Admin or Teacher user (Flashcards): credit deduction bypassed.");
      return true;
    }
    if (typeof userProfile.credits !== 'number' || userProfile.credits < amountToDeduct) {
      console.log(`User has insufficient credits for flashcards. Needs ${amountToDeduct}, has ${userProfile.credits}.`);
      return false;
    }
    const newCreditAmount = userProfile.credits - amountToDeduct;
    try {
      await updateUserCredits(user.uid, newCreditAmount);
      await refreshUserProfile(); 
      return true;
    } catch (error) {
      console.error("Failed to deduct credit for flashcards:", error);
      return false;
    }
  };

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);

  const triggerStreakUpdate = useCallback(async () => {
    if (user) {
      try {
        await updateUserActivityAndStreak(user.uid);
        await refreshUserProfile(); 
      } catch (error) {
        console.error("Failed to trigger streak update via context:", error);
      }
    }
  }, [user, refreshUserProfile]);


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
      authInstance,
      userProfile,
      loading,
      profileLoading,
      logout,
      deductCreditForAITutor,
      deductCreditForFlashcards,
      refreshUserProfile,
      triggerStreakUpdate,
      promptForUserDetails,
      setPromptForUserDetails,
      deductCreditForAiPlanner,
      recaptchaRef // Provide the ref through context
    }}>
      {children}
    </AuthContext.Provider>
  );
}
