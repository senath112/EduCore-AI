
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { User } from 'firebase/auth';

export interface UserProfile {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  age?: number;
  alFacingYear?: number;
  phoneNumber?: string;
  createdAt: string;
}

export async function saveUserData(user: User, additionalData: Partial<UserProfile> = {}) {
  if (!user) return;

  const userRef = ref(database, `users/${user.uid}/profile`);
  
  const profileData: UserProfile = {
    email: user.email,
    displayName: user.displayName || additionalData.displayName || user.email?.split('@')[0],
    photoURL: user.photoURL || additionalData.photoURL,
    age: additionalData.age,
    alFacingYear: additionalData.alFacingYear,
    phoneNumber: additionalData.phoneNumber,
    createdAt: new Date().toISOString(),
  };

  // Filter out undefined fields before saving
  const cleanedProfileData = Object.entries(profileData).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof UserProfile] = value;
    }
    return acc;
  }, {} as Partial<UserProfile>);


  try {
    await set(userRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid);
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error; // Re-throw to handle in UI
  }
}
