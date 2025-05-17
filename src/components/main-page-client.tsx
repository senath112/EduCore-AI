
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from "@/components/tutor/chat-interface";
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function MainPageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col flex-grow w-full items-center justify-center p-4 md:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow w-full p-4 md:p-6 lg:p-8">
      <div className="flex-grow flex flex-col">
        <ChatInterface />
      </div>
    </div>
  );
}
