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
        // Fetch additional user data from Realtime Database
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const dbUser = snapshot.val();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email,
            school: dbUser.school,
            alYear: dbUser.alYear,
          });
        } else {
          // User exists in Auth but not in DB (e.g. if DB write failed during signup or manual deletion)
          // You might want to create a default profile here or handle as an error
           setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email,
          });
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
      // Save additional user info to Realtime Database
      await set(ref(db, `users/${firebaseUser.uid}`), {
        email: firebaseUser.email,
        school: school,
        alYear: alYear,
        createdAt: serverTimestamp(), // Use serverTimestamp for consistency
      });
      // Manually set user in context as onAuthStateChanged might take a moment
       setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
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
      // onAuthStateChanged will handle setting the user state with DB data
      return userCredential.user;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Failed to log in.");
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
      setUser(null); // Clear user state immediately
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError(error.message || "Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, signUp, logIn, logOut }}>
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
