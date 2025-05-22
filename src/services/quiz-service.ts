
// src/services/quiz-service.ts
import { ref, get, set, push, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import { formatISO } from 'date-fns';
import type { AddMCQQuestionFormValues } from '@/lib/schemas';

const database: Database = getDatabase(app);

export type MCQOptionId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface MCQOption {
  id: MCQOptionId;
  text: string;
}

export interface QuestionData {
  id: string; // Firebase push key for the question
  text: string;
  options: MCQOption[];
  correctAnswerId: MCQOptionId;
  type: 'MCQ'; // For future expansion to other question types
}

export interface QuizData {
  id: string; // Firebase push key for the quiz
  classId: string;
  className: string; // Name of the class for convenience
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  createdAt: string; // ISO timestamp
  lastUpdatedAt?: string; // ISO timestamp
  status: 'draft' | 'published';
  questions?: Record<string, QuestionData>; // Keyed by questionId
}

export interface QuizAttempt {
    userId: string;
    userDisplayName: string | null;
    quizId: string;
    quizTitle: string;
    answers: Record<string, string>; // questionId: selectedOptionId
    score: { correct: number; total: number };
    attemptedAt: string; // ISO timestamp
}


export async function createQuiz(data: {
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
}): Promise<{ quizId: string }> {
  const quizzesRef = ref(database, 'quizzes');
  const newQuizRef = push(quizzesRef);
  if (!newQuizRef.key) {
    throw new Error("Failed to generate a unique key for the new quiz.");
  }
  const quizId = newQuizRef.key;
  const now = formatISO(new Date());

  const quizData: Omit<QuizData, 'questions' | 'lastUpdatedAt'> = {
    id: quizId,
    ...data,
    createdAt: now,
    status: 'draft',
  };

  const updates: Record<string, any> = {};
  updates[`/quizzes/${quizId}`] = quizData;
  updates[`/classes/${data.classId}/quizzes/${quizId}`] = true;
  updates[`/teachers/${data.teacherId}/quizzes/${quizId}`] = true;

  try {
    await update(ref(database), updates);
    console.log(`Quiz created with ID: ${quizId} for class ${data.className} by teacher ${data.teacherName}`);
    return { quizId };
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
}

export async function updateQuizDetails(quizId: string, updates: { title: string; description: string }): Promise<void> {
  if (!quizId || !updates.title || !updates.description) {
    throw new Error("Quiz ID, title, and description are required to update quiz details.");
  }
  const quizRef = ref(database, `quizzes/${quizId}`);
  const dataToUpdate = {
    ...updates,
    lastUpdatedAt: formatISO(new Date()),
  };
  try {
    await update(quizRef, dataToUpdate);
    console.log(`Quiz details updated for ID: ${quizId}`);
  } catch (error) {
    console.error(`Error updating quiz details for ID ${quizId}:`, error);
    throw error;
  }
}

export async function getQuizzesForClass(classId: string): Promise<QuizData[]> {
  const classQuizRefsPath = `classes/${classId}/quizzes`;
  const classQuizRefsSnapshot = await get(ref(database, classQuizRefsPath));

  if (!classQuizRefsSnapshot.exists()) {
    return [];
  }

  const quizIds = Object.keys(classQuizRefsSnapshot.val());
  const quizzes: QuizData[] = [];

  for (const quizId of quizIds) {
    const quizSnapshot = await get(ref(database, `quizzes/${quizId}`));
    if (quizSnapshot.exists()) {
      const quizDataFromDb = quizSnapshot.val();
      const questions = quizDataFromDb.questions && typeof quizDataFromDb.questions === 'object' ? quizDataFromDb.questions : {};
      quizzes.push({ ...quizDataFromDb, id: quizId, questions } as QuizData); // Ensure id is part of the returned object
    }
  }
  return quizzes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQuizById(quizId: string): Promise<QuizData | null> {
    const quizRef = ref(database, `quizzes/${quizId}`);
    try {
        const snapshot = await get(quizRef);
        if (snapshot.exists()) {
            const quizDataFromDb = snapshot.val();
            const questions = quizDataFromDb.questions && typeof quizDataFromDb.questions === 'object' ? quizDataFromDb.questions : {};
            return { ...quizDataFromDb, id: quizId, questions } as QuizData;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching quiz with ID ${quizId}:`, error);
        throw error;
    }
}


async function saveSingleMCQQuestion(quizId: string, formData: AddMCQQuestionFormValues): Promise<{ success: boolean; questionId?: string; error?: string }> {
  const quizQuestionsRef = ref(database, `quizzes/${quizId}/questions`);
  const newQuestionRef = push(quizQuestionsRef);
  if (!newQuestionRef.key) {
    return { success: false, error: "Failed to generate a unique key for the new question." };
  }
  const questionId = newQuestionRef.key;

  const questionData: QuestionData = {
    id: questionId,
    text: formData.questionText,
    type: 'MCQ',
    options: [
      { id: 'A', text: formData.optionA },
      { id: 'B', text: formData.optionB },
      { id: 'C', text: formData.optionC },
      { id: 'D', text: formData.optionD },
      { id: 'E', text: formData.optionE },
    ],
    correctAnswerId: formData.correctAnswer,
  };

  try {
    await set(newQuestionRef, questionData);
    // Update quiz's lastUpdatedAt timestamp
    const quizRef = ref(database, `quizzes/${quizId}`);
    await update(quizRef, { lastUpdatedAt: formatISO(new Date()) });
    console.log(`MCQ Question ${questionId} added to quiz ${quizId}`);
    return { success: true, questionId };
  } catch (error: any) {
    console.error(`Error adding MCQ question to quiz ${quizId}:`, error);
    return { success: false, error: error.message || "Could not save the question." };
  }
}

export async function addMCQQuestionToQuiz(quizId: string, formData: AddMCQQuestionFormValues): Promise<{ questionId: string }> {
  const result = await saveSingleMCQQuestion(quizId, formData);
  if (result.success && result.questionId) {
    return { questionId: result.questionId };
  }
  throw new Error(result.error || "Failed to add question to the quiz.");
}

export async function bulkAddMCQQuestionsToQuiz(
  quizId: string,
  questionsData: AddMCQQuestionFormValues[]
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const questionFormValues of questionsData) {
    const result = await saveSingleMCQQuestion(quizId, questionFormValues);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      errors.push(result.error || `Failed to save question: ${questionFormValues.questionText.substring(0, 30)}...`);
    }
  }
  if (successCount > 0) {
     const quizRef = ref(database, `quizzes/${quizId}`);
     await update(quizRef, { lastUpdatedAt: formatISO(new Date()) });
  }
  console.log(`Bulk add to quiz ${quizId}: ${successCount} succeeded, ${errorCount} failed.`);
  return { successCount, errorCount, errors };
}

export async function publishQuiz(quizId: string): Promise<void> {
  if (!quizId) throw new Error("Quiz ID is required to publish a quiz.");
  const quizRef = ref(database, `quizzes/${quizId}`);
  try {
    await update(quizRef, { status: 'published', lastUpdatedAt: formatISO(new Date()) });
    console.log(`Quiz ${quizId} published successfully.`);
  } catch (error) {
    console.error(`Error publishing quiz ${quizId}:`, error);
    throw error;
  }
}

export async function unpublishQuiz(quizId: string): Promise<void> {
  if (!quizId) throw new Error("Quiz ID is required to unpublish a quiz.");
  const quizRef = ref(database, `quizzes/${quizId}`);
  try {
    await update(quizRef, { status: 'draft', lastUpdatedAt: formatISO(new Date()) });
    console.log(`Quiz ${quizId} unpublished successfully.`);
  } catch (error) {
    console.error(`Error unpublishing quiz ${quizId}:`, error);
    throw error;
  }
}

export async function submitQuizAttempt(
    userId: string,
    userDisplayName: string | null,
    quizId: string,
    quizTitle: string,
    answers: Record<string, string>,
    score: { correct: number; total: number }
): Promise<void> {
    const attemptRef = ref(database, `quizAttempts/${quizId}/${userId}`); // Store attempts per quiz, per user
    const newAttemptRef = push(attemptRef); // Allows multiple attempts per user

    if (!userDisplayName) {
        console.warn(`Attempting to save quiz attempt for userId ${userId} without a displayName.`);
        // userDisplayName = "Anonymous"; // Or handle as per your app's logic
    }

    const attemptData: QuizAttempt = {
        userId,
        userDisplayName, // This can be null if profile isn't complete
        quizId,
        quizTitle,
        answers,
        score,
        attemptedAt: formatISO(new Date()),
    };

    try {
        await set(newAttemptRef, attemptData);
        console.log(`Quiz attempt for quiz ${quizId} by user ${userId} saved.`);
    } catch (error) {
        console.error("Error saving quiz attempt:", error);
        throw error;
    }
}

export async function getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
  const quizAttemptsRootRef = ref(database, `quizAttempts/${quizId}`);
  try {
    const snapshot = await get(quizAttemptsRootRef);
    if (!snapshot.exists()) {
      return []; // No attempts for this quiz
    }
    const allAttempts: QuizAttempt[] = [];
    const usersData = snapshot.val(); // This is an object where keys are userIds

    Object.keys(usersData).forEach(userId => {
      const userAttemptsData = usersData[userId]; // This is an object where keys are attemptIds (push keys)
      if (userAttemptsData && typeof userAttemptsData === 'object') {
        Object.keys(userAttemptsData).forEach(attemptId => {
          allAttempts.push({
            ...userAttemptsData[attemptId],
          } as QuizAttempt);
        });
      }
    });

    // Sort attempts: highest score (percentage) first, then newest attempt first for ties
    allAttempts.sort((a, b) => {
      const scorePercentA = a.score.total > 0 ? a.score.correct / a.score.total : 0;
      const scorePercentB = b.score.total > 0 ? b.score.correct / b.score.total : 0;

      if (scorePercentB !== scorePercentA) {
        return scorePercentB - scorePercentA; // Higher score percentage first
      }
      // If scores are tied, sort by newest attempt first
      return new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime();
    });

    return allAttempts;
  } catch (error) {
    console.error(`Error fetching attempts for quiz ${quizId}:`, error);
    throw error;
  }
}
