
import { ref, set, get, push, serverTimestamp, query, orderByChild, onValue, off, type DatabaseReference, remove } from 'firebase/database';
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
  isAdmin?: boolean;
  isAccountDisabled?: boolean; // New field
}

export interface UserProfileWithId extends UserProfile {
  id: string;
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

export interface FlaggedResponseLogWithId extends FlaggedResponseLog {
  id: string;
}

export interface StoredChatMessageAttachment {
  name: string;
  type: 'image';
}

export interface StoredChatMessage {
  id?: string;
  role: 'student' | 'tutor';
  content: string;
  timestamp: string | object; // Can be serverTimestamp object before write
  attachment?: StoredChatMessageAttachment;
}

export interface SupportTicketLog {
  supportId: string;
  userId: string;
  userDisplayName: string | null;
  subject: string;
  language: string;
  timestamp: string; // ISO string
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

export async function getAllUserProfiles(): Promise<UserProfileWithId[]> {
  const usersRef = ref(database, 'users');
  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      return Object.keys(usersData).map(userId => ({
        id: userId,
        ...usersData[userId].profile,
      })).filter(profile => profile.email); // Ensure only profiles exist
    }
    return [];
  } catch (error) {
    console.error('Error fetching all user profiles:', error);
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
  } else if (existingProfile && typeof existingProfile.credits === 'number') {
    finalCredits = existingProfile.credits;
  } else {
    finalCredits = DEFAULT_INITIAL_CREDITS;
  }

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
    isAccountDisabled: typeof additionalData.isAccountDisabled === 'boolean' ? additionalData.isAccountDisabled : (existingProfile?.isAccountDisabled || false), // Initialize/preserve
  };

  const cleanedProfileData = Object.fromEntries(
    Object.entries(profileData).filter(([, value]) => value !== undefined)
  ) as Partial<UserProfile>;

  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid, 'Admin status:', cleanedProfileData.isAdmin);
    return cleanedProfileData as UserProfile;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

export async function adminUpdateUserProfile(
  targetUserId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'age' | 'alFacingYear' | 'phoneNumber' | 'credits' | 'isAdmin' | 'isAccountDisabled'>>
): Promise<void> {
  if (!targetUserId) throw new Error("Target User ID is required for admin update.");

  const userProfileRef = ref(database, `users/${targetUserId}/profile`);
  const snapshot = await get(userProfileRef);

  if (!snapshot.exists()) {
    throw new Error("User profile not found for admin update.");
  }

  const existingProfile = snapshot.val() as UserProfile;
  const now = new Date().toISOString();

  const updatedProfileData: UserProfile = {
    ...existingProfile,
    displayName: updates.displayName !== undefined ? (updates.displayName === "" ? null : updates.displayName) : existingProfile.displayName,
    age: updates.age !== undefined ? updates.age : existingProfile.age,
    alFacingYear: updates.alFacingYear !== undefined ? updates.alFacingYear : existingProfile.alFacingYear,
    phoneNumber: updates.phoneNumber !== undefined ? (updates.phoneNumber === "" ? null : updates.phoneNumber) : existingProfile.phoneNumber,
    credits: updates.credits !== undefined ? updates.credits : existingProfile.credits,
    isAdmin: typeof updates.isAdmin === 'boolean' ? updates.isAdmin : existingProfile.isAdmin,
    isAccountDisabled: typeof updates.isAccountDisabled === 'boolean' ? updates.isAccountDisabled : existingProfile.isAccountDisabled, // Update isAccountDisabled
    lastUpdatedAt: now,
    email: existingProfile.email, 
    photoURL: existingProfile.photoURL,
    createdAt: existingProfile.createdAt,
  };
  
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updatedProfileData).filter(([, value]) => value !== undefined)
  ) as UserProfile;

  try {
    await set(userProfileRef, cleanedUpdates);
    console.log(`Admin updated profile for UID: ${targetUserId}`);
  } catch (error) {
    console.error(`Error updating profile for UID ${targetUserId} by admin:`, error);
    throw error;
  }
}

export async function adminSetUserAccountDisabledStatus(userId: string, isDisabled: boolean): Promise<void> {
  if (!userId) throw new Error("User ID is required to update account disabled status.");
  
  const profileRef = ref(database, `users/${userId}/profile/isAccountDisabled`);
  const lastUpdatedRef = ref(database, `users/${userId}/profile/lastUpdatedAt`);
  
  try {
    await set(profileRef, isDisabled);
    await set(lastUpdatedRef, new Date().toISOString());
    console.log(`User ${userId} account disabled status (DB flag) set to: ${isDisabled}. REMINDER: Implement backend function to update Firebase Auth user state.`);
    // In a real application, you would now trigger a backend function:
    // await callBackendFunction('setFirebaseUserDisabledStatus', { userId, isDisabled });
  } catch (error) {
    console.error(`Error setting account disabled status (DB flag) for user ${userId}:`, error);
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

export async function getFlaggedResponses(): Promise<FlaggedResponseLogWithId[]> {
  const flaggedResponsesRef = ref(database, 'flaggedResponses');
  try {
    const snapshot = await get(flaggedResponsesRef);
    if (snapshot.exists()) {
      const data: Record<string, FlaggedResponseLog> = snapshot.val();
      return Object.entries(data)
        .map(([id, log]) => ({
          ...log,
          id,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by newest first
    }
    return [];
  } catch (error) {
    console.error('Error fetching flagged responses:', error);
    throw error;
  }
}

export async function deleteFlaggedResponse(flagId: string): Promise<void> {
  if (!flagId) {
    throw new Error("Flag ID is required to delete a flagged response.");
  }
  const flagRef = ref(database, `flaggedResponses/${flagId}`);
  try {
    await remove(flagRef);
    console.log(`Flagged response with ID ${flagId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting flagged response with ID ${flagId}:`, error);
    throw error;
  }
}


export async function saveChatMessage(
  userId: string,
  role: 'student' | 'tutor',
  content: string,
  attachment?: StoredChatMessageAttachment
): Promise<string | null> {
  if (!userId) {
    console.error("Cannot save chat message without userId.");
    return null;
  }
  const messagesRef = ref(database, `userChatHistory/${userId}/messages`);
  const newMessageRef = push(messagesRef);
  const messageData: Omit<StoredChatMessage, 'id'> = {
    role,
    content,
    timestamp: serverTimestamp(), 
    ...(attachment && { attachment }),
  };
  try {
    await set(newMessageRef, messageData);
    return newMessageRef.key; // Return the generated key/ID
  } catch (error) {
    console.error(`Error saving chat message for user ${userId}:`, error);
    return null;
  }
}

// Function to listen for chat history updates
// Returns an unsubscribe function
export function loadChatHistory(
  userId: string,
  onMessagesLoaded: (messages: StoredChatMessage[]) => void
): () => void {
  if (!userId) {
    onMessagesLoaded([]); 
    return () => {};
  }

  const messagesRef = query(ref(database, `userChatHistory/${userId}/messages`), orderByChild('timestamp'));
  
  const listener = onValue(messagesRef, (snapshot) => {
    const messages: StoredChatMessage[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        messages.push({ id: childSnapshot.key!, ...childSnapshot.val() } as StoredChatMessage);
      });
    }
    messages.sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
    onMessagesLoaded(messages);
  }, (error) => {
    console.error("Error loading chat history:", error);
    onMessagesLoaded([]); 
  });

  return () => {
    if (messagesRef) {
        off(messagesRef, 'value', listener);
    }
  };
}

export async function saveSupportTicket(ticketData: SupportTicketLog): Promise<void> {
  if (!ticketData || !ticketData.supportId || !ticketData.userId) {
    throw new Error("Invalid support ticket data provided.");
  }
  const ticketRef = ref(database, `supportTickets/${ticketData.supportId}`);
  try {
    await set(ticketRef, ticketData);
    console.log(`Support ticket ${ticketData.supportId} saved for user ${ticketData.userId}.`);
  } catch (error) {
    console.error(`Error saving support ticket ${ticketData.supportId}:`, error);
    throw error;
  }
}

export async function getSupportTickets(): Promise<SupportTicketLog[]> {
  const supportTicketsRef = ref(database, 'supportTickets');
  try {
    const snapshot = await get(supportTicketsRef);
    if (snapshot.exists()) {
      const data: Record<string, SupportTicketLog> = snapshot.val();
      // The key of each ticket object is already the supportId, so we can just extract the values
      return Object.values(data)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by newest first
    }
    return [];
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw error;
  }
}
