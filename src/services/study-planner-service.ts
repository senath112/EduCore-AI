
// src/services/study-planner-service.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  getFirestore
} from 'firebase/firestore';
import { app } from '@/lib/firebase'; // app is needed to get Firestore instance
import { formatISO, parseISO } from 'date-fns';

const db = getFirestore(app); // Initialize Firestore instance

export interface PlannerEntry {
  id: string; // Firestore document ID
  task: string;
  subject: string;
  dateTime: string; // Stored as ISO string in this interface, but Firestore Timestamp in DB
  durationMinutes?: number;
  notes?: string;
  isCompleted: boolean;
  createdAt: string; // Stored as ISO string in this interface, but Firestore Timestamp in DB
  userId: string; 
}

export async function addPlannerEntry(
  userId: string,
  entryData: Omit<PlannerEntry, 'id' | 'createdAt' | 'isCompleted' | 'userId'>
): Promise<string> {
  if (!userId) throw new Error("User ID is required to add a planner entry.");

  const plannerEntriesCollectionRef = collection(db, "users", userId, "plannerEntries");
  
  const firestoreEntryData = {
    ...entryData,
    dateTime: Timestamp.fromDate(parseISO(entryData.dateTime)), // Convert ISO string to Firestore Timestamp
    isCompleted: false,
    createdAt: Timestamp.now(), // Use Firestore server timestamp
    userId,
  };

  try {
    const docRef = await addDoc(plannerEntriesCollectionRef, firestoreEntryData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding planner entry to Firestore:", error);
    throw error;
  }
}

export function getUserPlannerEntries(
  userId: string,
  callback: (entries: PlannerEntry[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {}; 
  }

  const plannerEntriesCollectionRef = collection(db, "users", userId, "plannerEntries");
  const q = query(plannerEntriesCollectionRef, orderBy("dateTime", "asc")); // Order by planned date/time

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const entries: PlannerEntry[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      entries.push({
        id: docSnapshot.id,
        task: data.task,
        subject: data.subject,
        // Convert Firestore Timestamps back to ISO strings for UI compatibility
        dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate().toISOString() : (data.dateTime || new Date().toISOString()),
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        isCompleted: data.isCompleted,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        userId: data.userId,
      } as PlannerEntry);
    });
    // Entries are already sorted by Firestore query, but ensure if needed
    // entries.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    callback(entries);
  }, (error) => {
    console.error("Error fetching planner entries from Firestore:", error);
    callback([]);
  });

  return unsubscribe; // Return the unsubscribe function
}

export async function updatePlannerEntry(
  userId: string,
  entryId: string,
  updates: Partial<Pick<PlannerEntry, 'task' | 'subject' | 'dateTime' | 'durationMinutes' | 'notes' | 'isCompleted'>>
): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("User ID and Entry ID are required to update.");
  }
  const entryDocRef = doc(db, "users", userId, "plannerEntries", entryId);
  
  const firestoreUpdates: Record<string, any> = { ...updates };
  if (updates.dateTime) {
    firestoreUpdates.dateTime = Timestamp.fromDate(parseISO(updates.dateTime));
  }

  try {
    await updateDoc(entryDocRef, firestoreUpdates);
  } catch (error) {
    console.error("Error updating planner entry in Firestore:", error);
    throw error;
  }
}

export async function deletePlannerEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("User ID and Entry ID are required to delete.");
  }
  const entryDocRef = doc(db, "users", userId, "plannerEntries", entryId);
  try {
    await deleteDoc(entryDocRef);
  } catch (error) {
    console.error("Error deleting planner entry from Firestore:", error);
    throw error;
  }
}
