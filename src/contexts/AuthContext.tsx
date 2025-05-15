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
import { ref, set, get, serverTimestamp } from "firebase/database";
import type { AppUser } from "@/types";

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
            mobileNumber: dbUser.mobileNumber, // Fetch mobile number
          });
        } else {
          // This case handles users who signed up with Google but might not have school/alYear/mobile yet
          // or users whose DB entry was somehow missed.
          const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
          const newUserProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: displayName,
            school: '', 
            alYear: '', 
            mobileNumber: '', // Default mobile number
          };
          await set(ref(db, `users/${firebaseUser.uid}`), {
            email: firebaseUser.email,
            displayName: newUserProfile.displayName,
            createdAt: serverTimestamp(),
            school: newUserProfile.school,
            alYear: newUserProfile.alYear,
            mobileNumber: newUserProfile.mobileNumber,
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
      await set(ref(db, `users/${firebaseUser.uid}`), {
        email: firebaseUser.email,
        displayName: displayName,
        school: school,
        alYear: alYear,
        mobileNumber: mobileNumber, // Save mobile number
        createdAt: serverTimestamp(),
      });
       setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName,
          school: school,
          alYear: alYear,
          mobileNumber: mobileNumber, // Set mobile number in local state
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
      
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
        await set(userRef, {
          email: firebaseUser.email,
          displayName: displayName,
          school: '', 
          alYear: '', 
          mobileNumber: '', // Initialize mobile for Google sign-in users
          createdAt: serverTimestamp(),
        });
         setUser({ 
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName,
          school: '', 
          alYear: '',
          mobileNumber: '', // Set in local state too
        });
      }
      // If snapshot exists, onAuthStateChanged will handle setting the user with existing data.
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

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, signUp, logIn, signInWithGoogle, logOut, sendPasswordReset }}>
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
