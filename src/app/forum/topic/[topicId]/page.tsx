
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getForumTopicById, getForumPostsForTopic, createForumPost, type ForumTopic, type ForumPost } from '@/services/forum-service';
import { CreateForumPostSchema, type CreateForumPostFormValues } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, LogIn, ShieldAlert, CircleDollarSign, MessageSquareText, Send, UserCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

const MINIMUM_CREDITS_FOR_FORUM = 50;

export default function ForumTopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const { toast } = useToast();

  const { user, userProfile, loading: authLoading, profileLoading, recaptchaRef } = useAuth();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";

  const form = useForm<CreateForumPostFormValues>({
    resolver: zodResolver(CreateForumPostSchema),
    defaultValues: {
      text: '',
    },
  });

  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (!topicId) {
      toast({ variant: "destructive", title: "Error", description: "Topic ID is missing." });
      router.push('/forum');
      return;
    }

    if (!isLoading && !user) {
      // UI will prompt to log in
    } else if (user && userProfile) {
      const canAccessForum =
        userProfile.isAdmin ||
        userProfile.isTeacher ||
        (userProfile.credits !== undefined && userProfile.credits >= MINIMUM_CREDITS_FOR_FORUM);

      if (!canAccessForum) {
        // Handled by return statements below
        return;
      }

      setIsLoadingTopic(true);
      getForumTopicById(topicId)
        .then(fetchedTopic => {
          if (fetchedTopic) {
            setTopic(fetchedTopic);
          } else {
            toast({ variant: "destructive", title: "Topic Not Found", description: "The requested topic does not exist." });
            router.push('/forum');
          }
        })
        .catch(err => {
          console.error("Failed to fetch topic:", err);
          toast({ variant: "destructive", title: "Error", description: "Could not load the topic." });
          router.push('/forum');
        })
        .finally(() => setIsLoadingTopic(false));

      setIsLoadingPosts(true);
      const unsubscribe = getForumPostsForTopic(topicId, (fetchedPosts) => {
        setPosts(fetchedPosts);
        setIsLoadingPosts(false);
      });
      return () => unsubscribe(); 
    }
  }, [topicId, user, userProfile, isLoading, router, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [posts]);

  const handleCreatePost = async (values: CreateForumPostFormValues) => {
    if (!user || !userProfile || !topic) {
      toast({ variant: "destructive", title: "Error", description: "Cannot post. User or topic details missing." });
      return;
    }
    setIsPosting(true);

    if (isRecaptchaEnabled && recaptchaRef.current) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        if (!token) {
          toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Failed to verify reCAPTCHA. Please try again." });
          setIsPosting(false);
          recaptchaRef.current.reset();
          return;
        }
        console.warn(
          "reCAPTCHA v3 token obtained for Forum Post Creation:", token,
          "IMPORTANT: This token MUST be verified server-side with your secret key for security."
        );
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        toast({ variant: "destructive", title: "reCAPTCHA Error", description: "An error occurred during reCAPTCHA verification." });
        setIsPosting(false);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        return;
      }
    }

    try {
      await createForumPost(
        topic.id,
        user.uid,
        userProfile.displayName || user.email,
        values.text
      );
      form.reset();
      toast({ title: "Post Created!", description: "Your message has been added to the topic." });
    } catch (error: any) {
      console.error("Error creating forum post:", error);
      toast({ variant: "destructive", title: "Post Failed", description: error.message || "Could not create your post." });
    } finally {
      setIsPosting(false);
      if (isRecaptchaEnabled && recaptchaRef.current) recaptchaRef.current.reset();
    }
  };

  if (isLoading || isLoadingTopic) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Topic...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to view this forum topic.
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

  if (!topic) {
     return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center">
        <MessageSquareText className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Topic Not Found</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          The forum topic you are looking for could not be found or no longer exists.
        </p>
        <Button asChild variant="outline">
          <Link href="/forum">Back to Forum Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="my-auto flex flex-col flex-grow h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
      <Card className="shadow-xl flex flex-col flex-grow overflow-hidden">
        <CardHeader className="border-b">
          <Button variant="ghost" size="sm" asChild className="mb-2 self-start px-1 text-muted-foreground hover:text-primary">
            <Link href="/forum"><ArrowLeft className="h-4 w-4 mr-1"/> Back to All Topics</Link>
          </Button>
          <CardTitle className="text-2xl flex items-center gap-2">
            <MessageSquareText className="h-7 w-7 text-primary" />
            {topic.title}
          </CardTitle>
          <CardDescription>{topic.description}</CardDescription>
           <p className="text-xs text-muted-foreground pt-1">
            Created by {topic.createdByName} on {format(new Date(topic.createdAt), 'PP')}
          </p>
        </CardHeader>

        <CardContent className="p-0 flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            {isLoadingPosts ? (
              <div className="flex justify-center items-center h-full py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No posts in this topic yet. Be the first to contribute!</p>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Card key={post.id} className="shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {post.userName ? post.userName.charAt(0).toUpperCase() : <UserCircle2 size={20} />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-semibold">{post.userName || 'Anonymous'}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm whitespace-pre-wrap">{post.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreatePost)} className="w-full space-y-3">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="newPostText" className="sr-only">New Post</FormLabel>
                    <FormControl>
                      <Textarea
                        id="newPostText"
                        placeholder="Share your thoughts or ask a question related to this topic..."
                        className="min-h-[80px] resize-none"
                        disabled={isPosting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isPosting || !form.formState.isValid}>
                {isPosting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Post Reply
              </Button>
            </form>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
}
