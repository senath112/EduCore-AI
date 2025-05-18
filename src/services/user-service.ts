
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
  userDisplayName: string | null;
  questionContent: string;
}

export interface FlaggedResponseLog {
  timestamp: string;
  userId: string;
  userDisplayName: string | null;
  flaggedMessageId: string;
  flaggedMessageContent: string;
  subject: string;
  language: string;
  chatHistorySnapshot: Array<{ role: string; content: string }>;
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
  }

  const now = new Date().toISOString();

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

  const cleanedProfileData = Object.entries(profileData).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof UserProfile] = value;
    }
    return acc;
  }, {} as Partial<UserProfile>);


  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid);
    return cleanedProfileData as UserProfile;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
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

export async function saveUserQuestion(
  userId: string,
  displayName: string | null | undefined,
  questionContent: string
): Promise<void> {
  if (!userId || !questionContent.trim()) {
    console.warn('Attempted to save question with missing userId or empty content.');
    return;
  }

  const userQueriesHistoryRef = ref(database, `userQuestionLogs/${userId}/history`);
  const newQuestionRef = push(userQueriesHistoryRef); 

  const questionLog: UserQuestionLog = {
    timestamp: new Date().toISOString(),
    userId: userId,
    userDisplayName: displayName || null, 
    questionContent: questionContent,
  };

  try {
    await set(newQuestionRef, questionLog);
    console.log(`User question saved for userId: ${userId} with queryId: ${newQuestionRef.key}`);
  } catch (error) {
    console.error(`Error saving user question for userId: ${userId}:`, error);
  }
}


export async function saveFlaggedResponse(
  userId: string,
  userDisplayName: string | null,
  flaggedMessageId: string,
  flaggedMessageContent: string,
  subject: string,
  language: string,
  chatHistorySnapshot: Array<{ role: string; content: string }>
): Promise<void> {
  if (!userId || !flaggedMessageId || !flaggedMessageContent) {
    console.warn('Attempted to save flagged response with missing critical information.');
    return;
  }

  const flaggedResponsesRef = ref(database, 'flaggedResponses');
  const newFlagRef = push(flaggedResponsesRef); // Generates a unique ID for the flag

  const flaggedResponseLog: FlaggedResponseLog = {
    timestamp: new Date().toISOString(),
    userId,
    userDisplayName,
    flaggedMessageId,
    flaggedMessageContent,
    subject,
    language,
    chatHistorySnapshot,
  };

  try {
    await set(newFlagRef, flaggedResponseLog);
    console.log(`Flagged response saved with ID: ${newFlagRef.key} by user: ${userId}`);
  } catch (error) {
    console.error(`Error saving flagged response for user: ${userId}:`, error);
    throw error;
  }
}

