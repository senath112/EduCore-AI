
// src/services/user-service.ts
import { ref, set, get, push, serverTimestamp, query, orderByChild, onValue, off, type DatabaseReference, update, remove } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { format, parseISO, isSameDay, isYesterday, subDays, formatISO } from 'date-fns';
import { ALL_BADGES, type BadgeDefinition } from '@/lib/badge-constants'; // Import ALL_BADGES

const DEFAULT_INITIAL_CREDITS = 10;
const database: Database = getDatabase(app);

export interface EarnedBadge {
  badgeId: string;
  name: string;
  description: string;
  iconName: string;
  earnedAt: string; // ISO timestamp
}

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
  isTeacher?: boolean;
  isAccountDisabled?: boolean;
  enrolledClassIds?: Record<string, boolean>;
  currentStreak?: number;
  lastActivityDate?: string; // YYYY-MM-DD
  earnedBadges?: Record<string, EarnedBadge>;
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
}

export interface FlaggedResponseLogWithId extends FlaggedResponseLog {
  id: string;
}

export interface AIResponseFeedbackLog {
  timestamp: string; // ISO string
  userId: string;
  userDisplayName: string | null;
  messageId: string;
  aiResponseContent: string;
  feedbackType: 'up' | 'down';
  subject: string;
  language: string;
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
  lastUpdatedAt?: string; // ISO string of last update
}

export interface MarkEntry {
  id: string; // Firebase push key
  subjectName: string;
  markObtained: number;
  totalMarks: number;
  percentage: number;
  dateEntered: string; // ISO timestamp
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
      })).filter(profile => profile.email);
    }
    return [];
  } catch (error) {
    console.error('Error fetching all user profiles:', error);
    throw error;
  }
}

export async function saveUserData(user: User, additionalData: Partial<UserProfile> = {}): Promise<UserProfile> {
  if (!user) throw new Error("User object is required to save user data.");

  const userProfileRef = ref(database, `users/${user.uid}/profile`);
  let existingProfile: UserProfile | null = null;

  try {
    const snapshot = await get(userProfileRef);
    if (snapshot.exists()) {
      existingProfile = snapshot.val() as UserProfile;
    }
  } catch (error) {
    console.error("Error fetching existing user profile during saveUserData:", error);
    // Continue, as we can still create a new profile
  }

  const now = new Date().toISOString();
  let finalCredits: number;
  const earnedBadges: Record<string, EarnedBadge> = additionalData.earnedBadges ?? existingProfile?.earnedBadges ?? {};

  if (existingProfile) {
    // User exists, preserve credits unless explicitly overridden by additionalData
    finalCredits = additionalData.credits ?? existingProfile.credits ?? DEFAULT_INITIAL_CREDITS;
  } else {
    // New user
    finalCredits = additionalData.credits ?? DEFAULT_INITIAL_CREDITS;
    console.log(`Assigning initial credits (${finalCredits}) to new user: ${user.uid}`);

    // Award "Early Adopter" badge to the first 103 users
    try {
      // Fetch all users to get the count *before* this new user is fully saved
      const allUsersSnapshot = await get(ref(database, 'users'));
      const userCount = allUsersSnapshot.exists() ? Object.keys(allUsersSnapshot.val()).length : 0;
                                        
      console.log(`Current user count (for Early Adopter check): ${userCount}`);
      if (userCount < 103) { 
        const earlyAdopterBadgeDef = ALL_BADGES.find(b => b.id === 'early_adopter_103');
        if (earlyAdopterBadgeDef) {
          earnedBadges[earlyAdopterBadgeDef.id] = {
            badgeId: earlyAdopterBadgeDef.id,
            name: earlyAdopterBadgeDef.name,
            description: earlyAdopterBadgeDef.description,
            iconName: earlyAdopterBadgeDef.iconName,
            earnedAt: now,
          };
          console.log(`Awarded "Early Adopter" badge to user ${user.uid}. User count at time of awarding (approx): ${userCount}`);
        }
      }
    } catch (badgeError) {
      console.error("Error during early adopter badge awarding:", badgeError);
      // Continue saving user data even if badge awarding fails
    }
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
    isTeacher: typeof additionalData.isTeacher === 'boolean' ? additionalData.isTeacher : (existingProfile?.isTeacher || false),
    isAccountDisabled: typeof additionalData.isAccountDisabled === 'boolean' ? additionalData.isAccountDisabled : (existingProfile?.isAccountDisabled || false),
    enrolledClassIds: additionalData.enrolledClassIds ?? existingProfile?.enrolledClassIds ?? {},
    currentStreak: additionalData.currentStreak ?? existingProfile?.currentStreak ?? 0,
    lastActivityDate: additionalData.lastActivityDate ?? existingProfile?.lastActivityDate ?? '',
    earnedBadges: earnedBadges,
  };

  const cleanedProfileData = Object.fromEntries(
    Object.entries(profileData).filter(([, value]) => value !== undefined && value !== null) // Also filter out nulls
  ) as Partial<UserProfile>;


  try {
    await set(userProfileRef, cleanedProfileData);
    console.log('User data saved successfully for UID:', user.uid, 'Credits:', cleanedProfileData.credits);
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
    isTeacher: typeof updates.isTeacher === 'boolean' ? updates.isTeacher : existingProfile.isTeacher,
    isAccountDisabled: typeof updates.isAccountDisabled === 'boolean' ? updates.isAccountDisabled : existingProfile.isAccountDisabled,
    lastUpdatedAt: now,
    email: existingProfile.email, // Ensure email and other non-editable fields are preserved
    photoURL: existingProfile.photoURL,
    createdAt: existingProfile.createdAt,
    enrolledClassIds: existingProfile.enrolledClassIds,
    currentStreak: existingProfile.currentStreak,
    lastActivityDate: existingProfile.lastActivityDate,
    earnedBadges: existingProfile.earnedBadges,
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
): Promise<void> {
  console.log('Attempting to save flagged response. UserID:', userId, 'MessageID:', flaggedMessageId, 'Content snippet:', flaggedMessageContent.substring(0, 50));
  
  if (!userId) {
    const errorMsg = "Cannot save flag: User ID is missing.";
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }
  if (!flaggedMessageId) {
    const errorMsg = "Cannot save flag: Flagged Message ID is missing.";
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }
  if (!flaggedMessageContent) {
    const errorMsg = "Cannot save flag: Flagged Message Content is missing.";
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  const flaggedResponsesRef = ref(database, 'flaggedResponses');
  const newFlagRef = push(flaggedResponsesRef);
  if (!newFlagRef.key) {
    const dbErrorMsg = 'Firebase Realtime Database failed to generate a push key for the new flagged response.';
    console.error(dbErrorMsg);
    throw new Error(dbErrorMsg);
  }

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
    console.log(`Flagged response ${newFlagRef.key} saved successfully for user: ${userId}`);
  } catch (error) {
    const firebaseError = error as Error;
    console.error(`Error saving flagged response (ID: ${newFlagRef.key}) for user: ${userId} to Firebase. Error:`, firebaseError.message, firebaseError.stack);
    throw firebaseError; 
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
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
}

export async function enrollInClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to enroll.");
  }
  const userProfileRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await set(userProfileRef, true);
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(`Error enrolling user ${userId} in class ${classId}:`, error);
    throw error;
  }
}

export async function leaveClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to leave class.");
  }
  const userProfileRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await remove(userProfileRef);
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(`Error removing user ${userId} from class ${classId}:`, error);
    throw error;
  }
}

export async function updateUserActivityAndStreak(userId: string): Promise<void> {
  if (!userId) return;

  const userProfileRef = ref(database, `users/${userId}/profile`);
  try {
    const snapshot = await get(userProfileRef);
    if (!snapshot.exists()) {
      console.warn(`User profile not found for streak update: ${userId}`);
      return;
    }
    const profile = snapshot.val() as UserProfile;

    const todayStr = format(new Date(), 'yyyy-MM-dd'); 
    let newStreak = profile.currentStreak || 0; 
    let lastActivityDateFromProfile = profile.lastActivityDate || ''; 

    if (!lastActivityDateFromProfile) {
      newStreak = 1;
    } else {
      const lastActivity = parseISO(lastActivityDateFromProfile); 

      if (!isSameDay(new Date(), lastActivity)) {
        if (isYesterday(lastActivity)) {
          newStreak = (profile.currentStreak || 0) + 1;
        } else {
          newStreak = 1; 
        }
      }
    }

    if (newStreak !== (profile.currentStreak || 0) || todayStr !== profile.lastActivityDate) {
      await update(userProfileRef, {
        currentStreak: newStreak,
        lastActivityDate: todayStr, 
        lastUpdatedAt: new Date().toISOString(),
      });
      console.log(`User ${userId} streak updated to ${newStreak}, last activity ${todayStr}`);

      if (newStreak === 3) await awardBadge(userId, 'streak_3_days');
      if (newStreak === 100) await awardBadge(userId, 'streak_100_days');
      if (newStreak === 200) await awardBadge(userId, 'streak_200_days');
      if (newStreak === 365) await awardBadge(userId, 'streak_365_days');
    }
  } catch (error) {
    console.error(`Error updating streak for user ${userId}:`, error);
  }
}

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  if (!userId || !badgeId) {
    console.warn("User ID and Badge ID are required to award a badge.");
    return false;
  }

  const userProfileRef = ref(database, `users/${userId}/profile`);
  try {
    const snapshot = await get(userProfileRef);
    if (!snapshot.exists()) {
      console.warn(`User profile not found for user ${userId}. Cannot award badge.`);
      return false;
    }

    const profile = snapshot.val() as UserProfile;
    const earnedBadges = profile.earnedBadges || {};

    if (earnedBadges[badgeId]) {
      console.log(`User ${userId} already has badge ${badgeId}.`);
      return false; // Badge already earned
    }

    const badgeDefinition = ALL_BADGES.find(b => b.id === badgeId);
    if (!badgeDefinition) {
      console.warn(`Badge definition not found for badgeId: ${badgeId}.`);
      return false;
    }

    const newBadge: EarnedBadge = {
      badgeId: badgeDefinition.id,
      name: badgeDefinition.name,
      description: badgeDefinition.description,
      iconName: badgeDefinition.iconName,
      earnedAt: new Date().toISOString(),
    };

    earnedBadges[badgeId] = newBadge;

    await update(userProfileRef, {
      earnedBadges: earnedBadges,
      lastUpdatedAt: new Date().toISOString(),
    });

    console.log(`Badge "${badgeDefinition.name}" awarded to user ${userId}.`);
    return true; // Badge was newly awarded
  } catch (error) {
    console.error(`Error awarding badge ${badgeId} to user ${userId}:`, error);
    return false;
  }
}

// --- Marks Tracker Functions ---

export async function addMarkEntry(
  userId: string,
  data: { subjectName: string; markObtained: number; totalMarks: number }
): Promise<string> {
  if (!userId) throw new Error("User ID is required to add a mark entry.");

  const percentage = (data.markObtained / data.totalMarks) * 100;
  const dateEntered = formatISO(new Date());

  const marksRef = ref(database, `userMarks/${userId}/entries`);
  const newMarkRef = push(marksRef);
  if (!newMarkRef.key) {
    throw new Error("Failed to generate a unique key for the new mark entry.");
  }

  const newEntry: MarkEntry = {
    id: newMarkRef.key,
    ...data,
    percentage,
    dateEntered,
  };

  await set(newMarkRef, newEntry);
  return newMarkRef.key;
}

export async function getUserMarkEntries(userId: string): Promise<MarkEntry[]> {
  if (!userId) return [];
  const marksRef = ref(database, `userMarks/${userId}/entries`);
  const dbQuery = query(marksRef, orderByChild('dateEntered'));

  try {
    const snapshot = await get(dbQuery);
    const entries: MarkEntry[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        entries.push({ id: key, ...data[key] });
      });
      // Sort descending by date (newest first)
      entries.sort((a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime());
    }
    return entries;
  } catch (error) {
    console.error("Error fetching mark entries:", error);
    throw error;
  }
}

export async function deleteUserMarkEntry(userId: string, markEntryId: string): Promise<void> {
  if (!userId || !markEntryId) {
    throw new Error("User ID and Mark Entry ID are required to delete an entry.");
  }
  const markEntryRef = ref(database, `userMarks/${userId}/entries/${markEntryId}`);
  await remove(markEntryRef);
}
