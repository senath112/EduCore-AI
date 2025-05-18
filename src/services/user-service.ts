
import { ref, set, get, child, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { User } from 'firebase/auth';

const DEFAULT_INITIAL_CREDITS = 10;

export interface UserProfile {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  age?: number;
  alFacingYear?: number;
  phoneNumber?: string;
  credits?: number;
  createdAt: string;
  lastUpdatedAt?: string;
}

export interface UserQuestionLog {
  timestamp: string;
  userId: string;
  questionContent: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const userProfileRef = ref(database, `users/${userId}/profile`);
  try {
    const snapshot = await get(userProfileRef);
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

export async function saveUserData(user: User, additionalData: Partial<UserProfile> = {}) {
  if (!user) return;

  const userProfileRef = ref(database, `users/${user.uid}/profile`);
  let existingProfile: UserProfile | null = null;

  try {
    const snapshot = await get(userProfileRef);
    if (snapshot.exists()) {
      existingProfile = snapshot.val() as UserProfile;
    }
  } catch (error) {
    console.error("Error fetching existing user profile during saveUserData:", error);
    // Continue, assuming no profile exists or let it be overwritten
  }

  const now = new Date().toISOString();

  // Determine credits:
  // 1. If additionalData.credits is provided (e.g., from direct signup), use that.
  // 2. Else, if existingProfile.credits exists, use that.
  // 3. Else (new user via Google, or existing user somehow without credits), assign default.
  let finalCredits: number;
  if (typeof additionalData.credits === 'number') {
    finalCredits = additionalData.credits;
  } else if (typeof existingProfile?.credits === 'number') {
    finalCredits = existingProfile.credits;
  } else {
    finalCredits = DEFAULT_INITIAL_CREDITS;
  }

  const profileData: UserProfile = {
    email: user.email,
    displayName: additionalData.displayName || existingProfile?.displayName || user.displayName || user.email?.split('@')[0],
    photoURL: additionalData.photoURL || existingProfile?.photoURL || user.photoURL,
    age: additionalData.age ?? existingProfile?.age,
    alFacingYear: additionalData.alFacingYear ?? existingProfile?.alFacingYear,
    phoneNumber: additionalData.phoneNumber ?? existingProfile?.phoneNumber,
    credits: finalCredits,
    createdAt: existingProfile?.createdAt || now,
    lastUpdatedAt: now,
  };

  // Filter out undefined fields before saving, except for those that can be explicitly null (like photoURL, displayName)
  const cleanedProfileData = Object.entries(profileData).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof UserProfile] = value;
    }
    return acc;
  }, {} as Partial<UserProfile>);


  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid, cleanedProfileData);
    return cleanedProfileData as UserProfile; // Return the saved profile
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error; // Re-throw to handle in UI
  }
}

export async function updateUserCredits(userId: string, newCreditAmount: number): Promise<void> {
  if (!userId) throw new Error("User ID is required to update credits.");
  if (typeof newCreditAmount !== 'number' || newCreditAmount < 0) {
    throw new Error("Invalid credit amount.");
  }
  const creditsRef = ref(database, `users/${userId}/profile/credits`);
  const lastUpdatedRef = ref(database, `users/${userId}/profile/lastUpdatedAt`);
  try {
    await set(creditsRef, newCreditAmount);
    await set(lastUpdatedRef, new Date().toISOString());
    console.log(`Credits updated for user ${userId} to ${newCreditAmount}`);
  } catch (error) {
    console.error(`Error updating credits for user ${userId}:`, error);
    throw error;
  }
}

export async function saveUserQuestion(userId: string, questionContent: string): Promise<void> {
  if (!userId || !questionContent.trim()) {
    console.warn('Attempted to save question with missing userId or empty content.');
    return;
  }

  const userQueriesHistoryRef = ref(database, `userQueries/${userId}/history`);
  const newQuestionRef = push(userQueriesHistoryRef); // Generates a unique ID for the new question

  const questionLog: UserQuestionLog = {
    timestamp: new Date().toISOString(),
    userId: userId,
    questionContent: questionContent,
  };

  try {
    await set(newQuestionRef, questionLog);
    console.log(`User question saved for userId: ${userId} with queryId: ${newQuestionRef.key}`);
  } catch (error) {
    console.error(`Error saving user question for userId: ${userId}:`, error);
    // Optionally re-throw or handle as needed for your application's error strategy
  }
}
