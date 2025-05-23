
"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getForumTopics, type ForumTopic } from '@/services/forum-service';
import { Loader2, LogIn, MessageSquareText, ShieldAlert, CircleDollarSign, PlusCircle, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import CreateForumTopicDialog from '@/components/forum/create-forum-topic-dialog'; // Will create this

const MINIMUM_CREDITS_FOR_FORUM = 50;

export default function ForumHomePage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isCreateTopicDialogOpen, setIsCreateTopicDialogOpen] = useState(false);

  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      // UI will prompt to log in if user is null after loading.
    } else if (user && userProfile) {
      const canAccessForum =
        userProfile.isAdmin ||
        userProfile.isTeacher ||
        (userProfile.credits !== undefined && userProfile.credits >= MINIMUM_CREDITS_FOR_FORUM);

      if (canAccessForum) {
        fetchTopics();
      }
    }
  }, [user, userProfile, isLoading]);

  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const fetchedTopics = await getForumTopics();
      setTopics(fetchedTopics);
    } catch (error) {
      console.error("Failed to fetch forum topics:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load forum topics." });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleTopicCreated = () => {
    fetchTopics(); // Refresh the list of topics
    setIsCreateTopicDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Forum...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to access the Forum.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (!userProfile) {
     return (
      <div className="flex flex-col flex-grow items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your profile information...</p>
      </div>
    );
  }

  const canAccessForum =
    userProfile.isAdmin ||
    userProfile.isTeacher ||
    (userProfile.credits !== undefined && userProfile.credits >= MINIMUM_CREDITS_FOR_FORUM);

  if (!canAccessForum) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <div className="text-muted-foreground mt-2 mb-6 space-y-1">
          <p>
            You need at least {MINIMUM_CREDITS_FOR_FORUM} credits to access the Forum.
          </p>
          <p className="flex items-center justify-center gap-1">
             Your current balance is
             <CircleDollarSign className="h-4 w-4 text-primary inline-block"/>
             <span className="font-semibold text-primary">{userProfile.credits ?? 0}</span> credits.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="w-full max-w-4xl mx-auto my-auto flex flex-col flex-grow">
      <Card className="shadow-xl flex flex-col flex-grow overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
              <MessagesSquare className="h-7 w-7 text-primary" />
              EduCore AI Forum Topics
            </CardTitle>
            <Button onClick={() => setIsCreateTopicDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Topic
            </Button>
          </div>
          <CardDescription>
            Browse topics or create a new one to start a discussion.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 flex-grow overflow-y-auto">
          {isLoadingTopics ? (
            <div className="flex justify-center items-center h-full py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading topics...</p>
            </div>
          ) : topics.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No topics created yet. Be the first to create one!</p>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <Link key={topic.id} href={`/forum/topic/${topic.id}`} legacyBehavior>
                  <a className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card hover:bg-muted/30">
                    <h3 className="text-lg font-semibold text-primary">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{topic.description}</p>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Created by: {topic.createdByName}</span>
                      <span>Posts: {topic.postCount || 0}</span>
                      <span>Last Activity: {topic.lastActivityAt ? formatDistanceToNow(new Date(topic.lastActivityAt), { addSuffix: true }) : 'N/A'}</span>
                      <span>Created: {format(new Date(topic.createdAt), 'PP')}</span>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    <CreateForumTopicDialog
        isOpen={isCreateTopicDialogOpen}
        onOpenChange={setIsCreateTopicDialogOpen}
        onTopicCreated={handleTopicCreated}
    />
    </>
  );
}
