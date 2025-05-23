
// src/services/forum-service.ts
import { ref, push, set, get, query, orderByChild, limitToLast, onValue, off, equalTo } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import { formatISO } from 'date-fns';

const database: Database = getDatabase(app);

export interface ForumTopic {
  id: string; // Firebase push key
  title: string;
  description: string;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string; // ISO timestamp
  postCount?: number; // Optional: to display on topic list
  lastActivityAt?: string; // Optional: ISO timestamp of last post
}

export interface ForumPost {
  id: string; // Firebase push key
  topicId: string; // ID of the topic this post belongs to
  userId: string;
  userName: string | null; // User's display name or email
  text: string;
  timestamp: string; // ISO timestamp
}

/**
 * Creates a new forum topic.
 */
export async function createForumTopic(
  title: string,
  description: string,
  userId: string,
  userName: string | null
): Promise<string> {
  if (!title || !description || !userId) {
    throw new Error("Title, description, and user ID are required to create a topic.");
  }

  const topicsRef = ref(database, 'forumTopics');
  const newTopicRef = push(topicsRef);
  if (!newTopicRef.key) {
    throw new Error("Failed to generate a unique key for the new forum topic.");
  }
  const topicId = newTopicRef.key;

  const newTopicData: Omit<ForumTopic, 'id'> = {
    title,
    description,
    createdByUserId: userId,
    createdByName: userName || "Anonymous",
    createdAt: formatISO(new Date()),
    postCount: 0,
    lastActivityAt: formatISO(new Date()),
  };

  try {
    await set(newTopicRef, newTopicData);
    console.log(`Forum topic ${topicId} created by user ${userId}.`);
    return topicId;
  } catch (error) {
    console.error('Error creating forum topic:', error);
    throw error;
  }
}

/**
 * Fetches all forum topics, ordered by creation time descending.
 */
export async function getForumTopics(): Promise<ForumTopic[]> {
  const topicsRef = ref(database, 'forumTopics');
  // Order by createdAt, which is a string. For descending, we fetch and sort client-side.
  const dbQuery = query(topicsRef, orderByChild('createdAt'));
  try {
    const snapshot = await get(dbQuery);
    const topics: ForumTopic[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        topics.push({ id: key, ...data[key] });
      });
      // Sort topics: newest first based on createdAt
      topics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return topics;
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    throw error;
  }
}

/**
 * Fetches a single forum topic by its ID.
 */
export async function getForumTopicById(topicId: string): Promise<ForumTopic | null> {
  const topicRef = ref(database, `forumTopics/${topicId}`);
  try {
    const snapshot = await get(topicRef);
    if (snapshot.exists()) {
      return { id: topicId, ...snapshot.val() } as ForumTopic;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching forum topic ${topicId}:`, error);
    throw error;
  }
}


/**
 * Creates a new forum post within a specific topic.
 */
export async function createForumPost(
  topicId: string,
  userId: string,
  userName: string | null,
  text: string
): Promise<void> {
  if (!topicId || !userId || !text) {
    throw new Error("Topic ID, User ID, and post text are required to create a forum post.");
  }

  const postsRef = ref(database, 'forumPosts');
  const newPostRef = push(postsRef);
  if (!newPostRef.key) {
    throw new Error("Failed to generate a unique key for the new forum post.");
  }

  const now = formatISO(new Date());
  const newPostData: Omit<ForumPost, 'id'> = {
    topicId,
    userId,
    userName: userName || "Anonymous",
    text,
    timestamp: now,
  };

  try {
    await set(newPostRef, newPostData);
    // Update topic's last activity and post count
    const topicRef = ref(database, `forumTopics/${topicId}`);
    const topicSnapshot = await get(topicRef);
    if (topicSnapshot.exists()) {
      const topicData = topicSnapshot.val() as ForumTopic;
      const newPostCount = (topicData.postCount || 0) + 1;
      await set(topicRef, { ...topicData, postCount: newPostCount, lastActivityAt: now });
    }
    console.log(`Forum post ${newPostRef.key} created in topic ${topicId} by user ${userId}.`);
  } catch (error) {
    console.error('Error creating forum post:', error);
    throw error;
  }
}

/**
 * Fetches forum posts for a specific topic with real-time updates, ordered by timestamp.
 * @param topicId The ID of the topic to fetch posts for.
 * @param callback Function to call with the array of posts whenever data changes.
 * @returns A function to unsubscribe from the listener.
 */
export function getForumPostsForTopic(topicId: string, callback: (posts: ForumPost[]) => void): () => void {
  const postsRef = ref(database, 'forumPosts');
  const dbQuery = query(postsRef, orderByChild('topicId'), equalTo(topicId));

  const listener = onValue(dbQuery, (snapshot) => {
    const posts: ForumPost[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        // Client-side filter as orderByChild only guarantees the child is present
        if (data[key].topicId === topicId) {
          posts.push({ id: key, ...data[key] });
        }
      });
      // Sort posts: newest first based on timestamp
      posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    callback(posts);
  }, (error) => {
    console.error(`Error fetching forum posts for topic ${topicId}:`, error);
    callback([]); // Send empty array on error
  });

  // Return unsubscribe function
  return () => off(dbQuery, 'value', listener);
}
