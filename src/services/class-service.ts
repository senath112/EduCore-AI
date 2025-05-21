
// src/services/class-service.ts
import { ref, get, set, remove, update, push } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import { generateFriendlyClassId } from '@/lib/classUtils';

const database: Database = getDatabase(app);

export interface ClassData {
  id: string; // This is the Firebase push key
  name: string;
  description: string;
  instructorName: string;
  teacherId: string;
  friendlyId: string; // New user-friendly ID
}

// Check if a friendly ID is already taken
export async function isFriendlyIdTaken(friendlyId: string): Promise<boolean> {
  const mapRef = ref(database, `classFriendlyIdMap/${friendlyId.toUpperCase()}`);
  try {
    const snapshot = await get(mapRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking friendly ID:', error);
    throw error;
  }
}

// Get Firebase class key by friendly ID
export async function getFirebaseClassKeyByFriendlyId(friendlyId: string): Promise<string | null> {
  const mapRef = ref(database, `classFriendlyIdMap/${friendlyId.toUpperCase()}`);
  try {
    const snapshot = await get(mapRef);
    if (snapshot.exists()) {
      return snapshot.val() as string;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Firebase class key by friendly ID:', error);
    throw error;
  }
}

// Fetch a single class by its actual Firebase key (ID)
async function getClassById(classId: string): Promise<ClassData | null> {
  const classRef = ref(database, `classes/${classId}`);
  try {
    const snapshot = await get(classRef);
    if (snapshot.exists()) {
      return { id: classId, ...snapshot.val() } as ClassData;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching class with ID ${classId}:`, error);
    return null;
  }
}


// Fetch class data using a friendly ID
export async function getClassByFriendlyId(friendlyId: string): Promise<ClassData | null> {
  const firebaseClassKey = await getFirebaseClassKeyByFriendlyId(friendlyId.toUpperCase());
  if (firebaseClassKey) {
    return getClassById(firebaseClassKey);
  }
  return null;
}


// Fetch all classes
export async function getAllClasses(): Promise<ClassData[]> {
  const classesRef = ref(database, 'classes');
  try {
    const snapshot = await get(classesRef);
    if (snapshot.exists()) {
      const classesData = snapshot.val();
      return Object.keys(classesData).map(classId => ({
        id: classId,
        ...classesData[classId],
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching all classes:', error);
    throw error;
  }
}

// Fetch classes taught by a specific teacher
export async function getClassesByTeacher(teacherId: string): Promise<ClassData[]> {
  if (!teacherId) {
    console.warn("Teacher ID is required to fetch classes by teacher.");
    return [];
  }
  const classesRef = ref(database, 'classes');
  try {
    const snapshot = await get(classesRef);
    if (snapshot.exists()) {
      const classesData = snapshot.val();
      const teacherClasses: ClassData[] = [];
      Object.keys(classesData).forEach(classId => {
        if (classesData[classId].teacherId === teacherId) {
          teacherClasses.push({
            id: classId,
            ...classesData[classId],
          });
        }
      });
      return teacherClasses;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching classes for teacher ${teacherId}:`, error);
    throw error;
  }
}


// Enroll a user in a class
export async function enrollInClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to enroll.");
  }
  const userProfileEnrolledClassRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await set(userProfileEnrolledClassRef, true);
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
    console.log(`User ${userId} enrolled in class ${classId}`);
  } catch (error) {
    console.error(`Error enrolling user ${userId} in class ${classId}:`, error);
    throw error;
  }
}

// User leaves a class
export async function leaveClass(userId: string, classId: string): Promise<void> {
  if (!userId || !classId) {
    throw new Error("User ID and Class ID are required to leave class.");
  }
  const userProfileEnrolledClassRef = ref(database, `users/${userId}/profile/enrolledClassIds/${classId}`);
  try {
    await remove(userProfileEnrolledClassRef);
    const profileUpdateRef = ref(database, `users/${userId}/profile`);
    await update(profileUpdateRef, { lastUpdatedAt: new Date().toISOString() });
    console.log(`User ${userId} left class ${classId}`);
  } catch (error) {
    console.error(`Error removing user ${userId} from class ${classId}:`, error);
    throw error;
  }
}

// Teacher creates a class
export async function createClass(
  className: string,
  classDescription: string,
  teacherId: string,
  instructorName: string
): Promise<{ classId: string; friendlyId: string }> {
  if (!className || !classDescription || !teacherId || !instructorName) {
    throw new Error("All fields are required to create a class.");
  }

  let friendlyId = '';
  let idIsUnique = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while(!idIsUnique && attempts < MAX_ATTEMPTS) {
    friendlyId = generateFriendlyClassId();
    idIsUnique = !(await isFriendlyIdTaken(friendlyId));
    attempts++;
  }

  if (!idIsUnique) {
    throw new Error("Failed to generate a unique friendly Class ID after several attempts.");
  }

  const classesRef = ref(database, 'classes');
  const newClassRef = push(classesRef);
  if (!newClassRef.key) {
    throw new Error("Failed to get key for new class.");
  }
  const firebaseClassKey = newClassRef.key;

  const newClassData: Omit<ClassData, 'id'> = {
    name: className,
    description: classDescription,
    teacherId: teacherId,
    instructorName: instructorName,
    friendlyId: friendlyId.toUpperCase(),
  };

  try {
    await set(newClassRef, newClassData);
    const friendlyIdMapRef = ref(database, `classFriendlyIdMap/${friendlyId.toUpperCase()}`);
    await set(friendlyIdMapRef, firebaseClassKey);
    
    console.log(`Class created with ID: ${firebaseClassKey}, Friendly ID: ${friendlyId} by teacher ${teacherId}`);
    return { classId: firebaseClassKey, friendlyId: friendlyId };
  } catch (error) {
    console.error('Error creating class:', error);
    await remove(newClassRef).catch(e => console.error("Cleanup failed for newClassRef", e));
    await remove(ref(database, `classFriendlyIdMap/${friendlyId.toUpperCase()}`)).catch(e => console.error("Cleanup failed for friendlyIdMapRef", e));
    throw error;
  }
}

// Teacher deletes a class
export async function deleteClass(classId: string, currentTeacherId: string): Promise<void> {
  if (!classId || !currentTeacherId) {
    throw new Error("Class ID and Teacher ID are required to delete a class.");
  }

  const classData = await getClassById(classId);

  if (!classData) {
    throw new Error(`Class with ID ${classId} not found.`);
  }

  if (classData.teacherId !== currentTeacherId) {
    throw new Error("Unauthorized: You can only delete classes you have created.");
  }

  const classRef = ref(database, `classes/${classId}`);
  const friendlyIdMapRef = ref(database, `classFriendlyIdMap/${classData.friendlyId.toUpperCase()}`);

  try {
    await remove(classRef);
    await remove(friendlyIdMapRef);
    console.log(`Class ${classId} (Friendly ID: ${classData.friendlyId}) deleted by teacher ${currentTeacherId}.`);
    // Note: This does not automatically un-enroll students. Their profiles will still list this classId.
    // A more complex system might iterate through users and remove the classId from their enrolledClassIds.
  } catch (error) {
    console.error(`Error deleting class ${classId}:`, error);
    throw error;
  }
}
