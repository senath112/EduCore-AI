
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode, Dispatch, SetStateAction } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, set, get, serverTimestamp, update } from "firebase/database";
import type { AppUser } from "@/types";

const INITIAL_CREDITS = 10;

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  signUp: (email: string, pass: string, school: string, alYear: string, mobileNumber: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass: string) => Promise<FirebaseUser | null>;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateLocalUserCredits: (newCreditAmount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const dbUser = snapshot.val();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || dbUser.displayName || firebaseUser.email?.split('@')[0],
            school: dbUser.school,
            alYear: dbUser.alYear,
            mobileNumber: dbUser.mobileNumber,
            credits: dbUser.credits !== undefined ? dbUser.credits : INITIAL_CREDITS,
          });
          if (dbUser.credits === undefined) {
             await update(userRef, { credits: INITIAL_CREDITS, updatedAt: serverTimestamp() });
          } else {
             await update(userRef, { updatedAt: serverTimestamp() }); // Update last active time
          }
        } else {
          const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
          const newUserProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: displayName,
            school: '', // For Google Sign-In, these might be empty initially
            alYear: '',
            mobileNumber: '',
            credits: INITIAL_CREDITS,
          };
          await set(ref(db, `users/${firebaseUser.uid}`), {
            email: firebaseUser.email,
            displayName: newUserProfile.displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            school: newUserProfile.school,
            alYear: newUserProfile.alYear,
            mobileNumber: newUserProfile.mobileNumber,
            credits: newUserProfile.credits,
          });
          setUser(newUserProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, school: string, alYear: string, mobileNumber: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const displayName = firebaseUser.email?.split('@')[0];
      const userCredits = INITIAL_CREDITS;
      await set(ref(db, `users/${firebaseUser.uid}`), {
        email: firebaseUser.email,
        displayName: displayName,
        school: school,
        alYear: alYear,
        mobileNumber: mobileNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        credits: userCredits,
      });
       setUser({ // Update local user state immediately
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName,
          school: school,
          alYear: alYear,
          mobileNumber: mobileNumber,
          credits: userCredits,
        });
      return firebaseUser;
    } catch (error: any) {
      console.error("Signup error:", error);
      setAuthError(error.message || "Failed to sign up.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // User data will be fetched by onAuthStateChanged
      return userCredential.user;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Failed to log in.");
      return null;
    } finally {
      setLoading(false);
    }
  };

 const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
    setLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // User data (including checking if new or existing for credit initialization)
      // will be handled by the onAuthStateChanged listener.
      // We just need to ensure the basic profile info is there if it's a truly new DB entry.
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
        await set(userRef, {
          email: firebaseUser.email,
          displayName: displayName,
          school: '', 
          alYear: '', 
          mobileNumber: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          credits: INITIAL_CREDITS, // Ensure new Google sign-ups get initial credits
        });
         // onAuthStateChanged will subsequently pick this up and set the user state.
      } else {
        // If user exists, just update their last active time
        await update(userRef, { updatedAt: serverTimestamp() });
      }
      return firebaseUser;
    } catch (error: any) {
      console.error("Google Sign-In error object:", error); 
      let specificMessage = `Failed to sign in with Google: ${error.message || 'An unknown error occurred.'}`;
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
           specificMessage = "Google Sign-In was cancelled or the popup was closed. This can happen if you closed it manually, due to browser issues (try disabling extensions or using an incognito window), or if there's a misconfiguration in your Google Cloud/Firebase project settings. Please meticulously review your Authorized JavaScript origins, Authorized redirect URIs in the Google Cloud Console, and ensure Google is enabled as a provider with correct web SDK configuration in Firebase Authentication settings.";
          break;
        case 'auth/popup-blocked':
          specificMessage = "Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.";
          break;
        case 'auth/cancelled-popup-request':
          specificMessage = "Multiple Google Sign-In popups were opened, or a new popup was opened before the previous one completed. Please try again.";
          break;
        case 'auth/operation-not-allowed':
          specificMessage = "Google Sign-In is not enabled for this project. Please check your Firebase console settings (Authentication -> Sign-in method) and ensure the web SDK configuration is correctly set up if you are using a custom setup.";
          break;
        case 'auth/unauthorized-domain':
          specificMessage = "This domain is not authorized for Google Sign-In. Please check your Firebase (Authentication -> Settings -> Authorized domains) and Google Cloud console (Credentials -> OAuth 2.0 Client ID -> Authorized JavaScript origins and Authorized redirect URIs) settings.";
          break;
      }
      setAuthError(`${specificMessage} (Code: ${error.code || 'N/A'})`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      console.error("Password reset error:", error);
      setAuthError(error.message || "Failed to send password reset email.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null); 
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError(error.message || "Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  const updateLocalUserCredits = (newCreditAmount: number) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, credits: newCreditAmount };
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, signUp, logIn, signInWithGoogle, logOut, sendPasswordReset, updateLocalUserCredits }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
