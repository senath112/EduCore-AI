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
} from "firebase/auth";
import { ref, set, get, serverTimestamp } from "firebase/database";
import type { AppUser } from "@/types";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  signUp: (email: string, pass: string, school: string, alYear: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass: string) => Promise<FirebaseUser | null>;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
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
          });
        } else {
          const newUserProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            school: '', 
            alYear: '', 
          };
          await set(ref(db, `users/${firebaseUser.uid}`), {
            email: firebaseUser.email,
            displayName: newUserProfile.displayName,
            createdAt: serverTimestamp(),
            school: newUserProfile.school,
            alYear: newUserProfile.alYear,
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

  const signUp = async (email: string, pass: string, school: string, alYear: string): Promise<FirebaseUser | null> => {
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
        createdAt: serverTimestamp(),
      });
       setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName,
          school: school,
          alYear: alYear,
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
          createdAt: serverTimestamp(),
        });
         setUser({ 
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName,
          school: '',
          alYear: '',
        });
      }
      return firebaseUser;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("Google Sign-In was cancelled or the popup was closed before completion.");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("Multiple Google Sign-In popups were opened, or a new popup was opened before the previous one completed. Please try again.");
      } else if (error.code === 'auth/operation-not-allowed') {
         setAuthError("Google Sign-In is not enabled for this project. Please check your Firebase console settings (Authentication -> Sign-in method).");
      } else if (error.code === 'auth/unauthorized-domain') {
         setAuthError("This domain is not authorized for Google Sign-In. Please check your Firebase and Google Cloud console 'Authorized domains' and 'Authorized JavaScript origins' settings.");
      } else {
        setAuthError(`Failed to sign in with Google: ${error.message || 'An unknown error occurred.'} (Code: ${error.code || 'N/A'})`);
      }
      return null;
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
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, signUp, logIn, signInWithGoogle, logOut }}>
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
