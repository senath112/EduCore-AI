
import { ref, set, get, push, serverTimestamp, query, orderByChild, onValue, off, type DatabaseReference, update, remove } from 'firebase/database';
import { getDatabase, type Database } from 'firebase/database';
import { app } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { sanitizeFirebaseKey } from '@/lib/supportUtils';

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
  isTeacher?: boolean; // New field for teacher role
  isAccountDisabled?: boolean;
  enrolledClassIds?: Record<string, boolean>;
}

export interface UserProfileWithId extends UserProfile {
  id: string;
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
  classContextId?: string;
  associatedTeacherId?: string;
}

export interface FlaggedResponseLogWithId extends FlaggedResponseLog {
  id: string;
}

export interface AIResponseFeedbackLog {
  timestamp: string; // ISO string
  userId: string;
  userDisplayName: string | null;
  messageId: string; // ID of the AI message that received feedback
  aiResponseContent: string; // Content of the AI message
  feedbackType: 'up' | 'down';
  subject: string; // Subject context
  language: string; // Language context
}

export type SupportTicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface SupportTicketLog {
  supportId: string;
  userId: string;
  userDisplayName: string | null;
  subject: string;
  language: string;
  timestamp: string; // ISO string of creation
  userComment?: string;
  status: SupportTicketStatus;
  adminResolutionMessage?: string;
  lastUpdatedAt?: string; // ISO string of last update (status change, resolution)
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
      })).filter(profile => profile.email); // Ensure profile has an email
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
    isTeacher: typeof additionalData.isTeacher === 'boolean' ? additionalData.isTeacher : (existingProfile?.isTeacher || false), // Initialize isTeacher
    isAccountDisabled: typeof additionalData.isAccountDisabled === 'boolean' ? additionalData.isAccountDisabled : (existingProfile?.isAccountDisabled || false),
    enrolledClassIds: additionalData.enrolledClassIds ?? existingProfile?.enrolledClassIds ?? {},
  };

  const cleanedProfileData = Object.fromEntries(
    Object.entries(profileData).filter(([, value]) => value !== undefined)
  ) as Partial<UserProfile>;

  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid, 'Admin status:', cleanedProfileData.isAdmin, 'Teacher status:', cleanedProfileData.isTeacher);
    return cleanedProfileData as UserProfile;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

export async function adminUpdateUserProfile(
  targetUserId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'age' | 'alFacingYear' | 'phoneNumber' | 'credits' | 'isAdmin' | 'isTeacher' | 'isAccountDisabled'>>
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
    isTeacher: typeof updates.isTeacher === 'boolean' ? updates.isTeacher : existingProfile.isTeacher, // Handle isTeacher
    isAccountDisabled: typeof updates.isAccountDisabled === 'boolean' ? updates.isAccountDisabled : existingProfile.isAccountDisabled,
    lastUpdatedAt: now,
    email: existingProfile.email,
    photoURL: existingProfile.photoURL,
    createdAt: existingProfile.createdAt,
    enrolledClassIds: existingProfile.enrolledClassIds,
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

  const profileRef = ref(database, `users/${userId}/profile`);
  const updates: Partial<UserProfile> = {
    isAccountDisabled: isDisabled,
    lastUpdatedAt: new Date().toISOString(),
  };

  try {
    await update(profileRef, updates);
    console.log(`User ${userId} account disabled status (DB flag) set to: ${isDisabled}. REMINDER: Implement backend function to update Firebase Auth user state.`);
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
  const profileRef = ref(database, `users/${userId}/profile`);
   const updates: Partial<UserProfile> = {
    credits: newCreditAmount,
    lastUpdatedAt: new Date().toISOString(),
  };
  try {
    await update(profileRef, updates);
    console.log(`Credits updated for user ${userId} to ${newCreditAmount}`);
  } catch (error) {
    console.error(`Error updating credits for user ${userId}:`, error);
    throw error;
  }
}

export async function saveFlaggedResponse(
  userId: string,
  userDisplayName: string | null,
  flaggedMessageId: string,
  flaggedMessageContent: string,
  subject: string,
  language: string,
  chatHistorySnapshot: Array<{ role: string; content: string }>,
  classContextId?: string // Optional class context
): Promise<void> {
  if (!userId || !flaggedMessageId || !flaggedMessageContent) {
    console.warn('Attempted to save flagged response with missing critical information.');
    return;
  }

  let associatedTeacherId: string | undefined = undefined;
  if (classContextId) {
    try {
      const classRef = ref(database, `classes/${classContextId}`);
      const classSnapshot = await get(classRef);
      if (classSnapshot.exists()) {
        const classData = classSnapshot.val();
        associatedTeacherId = classData.teacherId;
      }
    } catch (err) {
      console.error(`Error fetching teacherId for class ${classContextId}:`, err);
    }
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
    classContextId,
    associatedTeacherId,
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
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

export async function saveAIResponseFeedback(feedbackData: AIResponseFeedbackLog): Promise<void> {
  if (!feedbackData.userId || !feedbackData.messageId) {
    console.warn('Attempted to save AI response feedback with missing critical information.');
    return;
  }
  const feedbackRef = ref(database, 'aiResponseFeedback');
  const newFeedbackEntryRef = push(feedbackRef);
  try {
    await set(newFeedbackEntryRef, feedbackData);
  } catch (error) {
    console.error(`Error saving AI response feedback for user: ${feedbackData.userId}:`, error);
    throw error;
  }
}

export async function saveSupportTicket(ticketData: Omit<SupportTicketLog, 'status' | 'lastUpdatedAt'>): Promise<void> {
  if (!ticketData || !ticketData.supportId || !ticketData.userId) {
    throw new Error("Invalid support ticket data provided.");
  }
  const ticketRef = ref(database, `supportTickets/${ticketData.supportId}`);
  const now = new Date().toISOString();
  const fullTicketData: SupportTicketLog = {
    ...ticketData,
    status: 'Open',
    timestamp: ticketData.timestamp || now, 
    lastUpdatedAt: now,
  };
  try {
    await set(ticketRef, fullTicketData);
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
      return Object.values(data)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return [];
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw error;
  }
}

export async function resolveSupportTicket(
  supportId: string,
  adminResolutionMessage: string,
): Promise<void> {
  if (!supportId) {
    throw new Error("Support ID is required to resolve a ticket.");
  }
  const ticketRef = ref(database, `supportTickets/${supportId}`);
  try {
    const snapshot = await get(ticketRef);
    if (!snapshot.exists()) {
      throw new Error(`Support ticket with ID ${supportId} not found.`);
    }

    const updates: Partial<SupportTicketLog> = {
      status: 'Resolved',
      adminResolutionMessage,
      lastUpdatedAt: new Date().toISOString(),
    };
    await update(ticketRef, updates);
    console.log(`Support ticket ${supportId} has been resolved.`);

  } catch (error) {
    console.error(`Error resolving support ticket ${supportId}:`, error);
    throw error;
  }
}


export async function sendSupportClosureEmailToUser(
  userEmail: string,
  supportId: string,
  adminMessage: string
): Promise<void> {
  console.log(`SIMULATING EMAIL SEND:
    To: ${userEmail}
    Support Ticket ID: ${supportId}
    Admin Resolution Message: ${adminMessage}
    Status: Resolved
    ---
    In a real application, an actual email would be sent here via a backend service.
  `);
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Enroll in class
export async function enrollInClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to enroll.");
  }
  const userProfileRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await set(userProfileRef, true);
    // Update lastUpdatedAt on the main profile
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(`Error enrolling user ${userId} in class ${classId}:`, error);
    throw error;
  }
}

// Leave class
export async function leaveClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to leave class.");
  }
  const userProfileRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await remove(userProfileRef);
    // Update lastUpdatedAt on the main profile
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(`Error removing user ${userId} from class ${classId}:`, error);
    throw error;
  }
}

    