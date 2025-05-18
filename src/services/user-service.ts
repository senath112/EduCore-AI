
import { ref, set, get, push, serverTimestamp, query, orderByChild, onValue, off, type DatabaseReference } from 'firebase/database';
import { getDatabase, type Database } from 'firebase/database';
import { app } from '@/lib/firebase';
import type { User } from 'firebase/auth';

const DEFAULT_INITIAL_CREDITS = 10;
const database: Database = getDatabase(app);

export interface UserProfile {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  age?: number;
  alFacingYear?: number;
  phoneNumber?: string;
  credits?: number;
  createdAt: string; // ISO string
  lastUpdatedAt?: string; // ISO string
  isAdmin?: boolean; // Added admin flag
}

export interface UserQuestionLog {
  timestamp: string; // ISO string
  userId: string;
  userDisplayName: string | null;
  questionContent: string;
}

export interface FlaggedResponseLog {
  timestamp: string; // ISO string
  userId: string;
  userDisplayName: string | null;
  flaggedMessageId: string;
  flaggedMessageContent: string;
  subject: string;
  language: string;
  chatHistorySnapshot: Array<{ role: string; content: string }>;
}

export interface StoredChatMessageAttachment {
  name: string;
  type: 'image'; // Extend with other types like 'pdf' if needed in future
  // storageUrl?: string; // Optional: if uploading to Firebase Storage
}

export interface StoredChatMessage {
  id?: string; // Added by loadChatHistory from Firebase key
  role: 'student' | 'tutor';
  content: string;
  timestamp: string; // Server timestamp (ISO string or number for Firebase)
  attachment?: StoredChatMessageAttachment;
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
    // Continue, as profile might not exist yet
  }

  const now = new Date().toISOString();
  let finalCredits: number;

  if (typeof additionalData.credits === 'number') {
    finalCredits = additionalData.credits;
  } else if (existingProfile && typeof existingProfile.credits === 'number') {
    finalCredits = existingProfile.credits;
  } else {
    finalCredits = DEFAULT_INITIAL_CREDITS;
  }

  // Construct the profile, ensuring isAdmin is handled carefully.
  // User-facing forms (Signup, CompleteProfile, EditProfile) do not pass `isAdmin` in `additionalData`.
  // `isAdmin` defaults to false for new users and is preserved for existing users.
  // It can only be changed to true by a trusted process (e.g. manual DB edit or future admin tool passing it in additionalData).
  const profileData: UserProfile = {
    email: user.email,
    displayName: additionalData.displayName ?? existingProfile?.displayName ?? user.displayName ?? user.email?.split('@')[0],
    photoURL: additionalData.photoURL ?? existingProfile?.photoURL ?? user.photoURL,
    age: additionalData.age ?? existingProfile?.age,
    alFacingYear: additionalData.alFacingYear ?? existingProfile?.alFacingYear,
    phoneNumber: additionalData.phoneNumber ?? existingProfile?.phoneNumber,
    credits: finalCredits,
    createdAt: existingProfile?.createdAt || now,
    lastUpdatedAt: now,
    isAdmin: typeof additionalData.isAdmin === 'boolean' ? additionalData.isAdmin : (existingProfile?.isAdmin || false),
  };

  // Remove undefined values before saving
  const cleanedProfileData = Object.fromEntries(
    Object.entries(profileData).filter(([, value]) => value !== undefined)
  ) as Partial<UserProfile>;


  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid, 'Admin status:', cleanedProfileData.isAdmin);
    return cleanedProfileData as UserProfile; // Return the saved data
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
  // Path uses userId directly for robustness
  const userQueriesHistoryRef = ref(database, `userQuestionLogs/${userId}/history`);
  const newQuestionRef = push(userQueriesHistoryRef);
  const questionLog: UserQuestionLog = {
    timestamp: new Date().toISOString(),
    userId: userId,
    userDisplayName: displayName || null, // Store display name for context
    questionContent: questionContent,
  };
  try {
    await set(newQuestionRef, questionLog);
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
  const newFlagRef = push(flaggedResponsesRef);
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
  } catch (error) {
    console.error(`Error saving flagged response for user: ${userId}:`, error);
    throw error;
  }
}

export async function saveChatMessage(
  userId: string,
  role: 'student' | 'tutor',
  content: string,
  attachment?: StoredChatMessageAttachment
): Promise<void> {
  if (!userId) {
    console.error("Cannot save chat message without userId.");
    return;
  }
  const messagesRef = ref(database, `userChatHistory/${userId}/messages`);
  const newMessageRef = push(messagesRef);
  const messageData: Omit<StoredChatMessage, 'id'> = {
    role,
    content,
    timestamp: serverTimestamp() as any, // Use server timestamp for ordering
    ...(attachment && { attachment }),
  };
  try {
    await set(newMessageRef, messageData);
  } catch (error) {
    console.error(`Error saving chat message for user ${userId}:`, error);
  }
}

// Chat history is not loaded in this version of chat-interface.
// export function loadChatHistory(
//   userId: string,
//   onMessagesLoaded: (messages: StoredChatMessage[]) => void
// ): () => void {
//   if (!userId) {
//     console.warn("Cannot load chat history without userId.");
//     onMessagesLoaded([]);
//     return () => {}; 
//   }

//   const messagesRef: DatabaseReference = query(
//     ref(database, `userChatHistory/${userId}/messages`),
//     orderByChild('timestamp') 
//   );

//   const listener = onValue(messagesRef, (snapshot) => {
//     const messages: StoredChatMessage[] = [];
//     if (snapshot.exists()) {
//       snapshot.forEach((childSnapshot) => {
//         messages.push({ id: childSnapshot.key!, ...childSnapshot.val() } as StoredChatMessage);
//       });
//     }
//     onMessagesLoaded(messages);
//   }, (error) => {
//     console.error(`Error loading chat history for user ${userId}:`, error);
//     onMessagesLoaded([]); 
//   });

//   return () => {
//     off(messagesRef, 'value', listener);
//   };
// }
