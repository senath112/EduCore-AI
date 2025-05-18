
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const router = useRouter();

  const isLoading = loading || profileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user || !userProfile?.isAdmin) {
        // If not logged in, or not an admin, redirect to home.
        // You might want to show a toast message here as well.
        router.push('/');
      }
    }
  }, [user, userProfile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

  // This check handles the case where loading is complete, but user is not an admin.
  // The useEffect above will trigger a redirect, but this provides immediate feedback.
  if (!user || !userProfile?.isAdmin) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 text-center min-h-[calc(100vh-150px)]">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You do not have permission to view this page.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-[calc(100vh-150px)]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Welcome, Admin {userProfile?.displayName || user.email}!
        </p>
      </header>
      
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards for admin features */}
        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h2 className="text-xl font-semibold mb-3 text-card-foreground">User Management</h2>
          <p className="text-muted-foreground mb-4">View and manage user accounts.</p>
          <Button variant="outline" disabled>View Users (Coming Soon)</Button>
        </div>
        
        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h2 className="text-xl font-semibold mb-3 text-card-foreground">Content Moderation</h2>
          <p className="text-muted-foreground mb-4">Review flagged responses and content.</p>
          <Button variant="outline" disabled>Review Flags (Coming Soon)</Button>
        </div>

        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h2 className="text-xl font-semibold mb-3 text-card-foreground">Analytics</h2>
          <p className="text-muted-foreground mb-4">View application usage statistics.</p>
          <Button variant="outline" disabled>View Analytics (Coming Soon)</Button>
        </div>
      </section>
      
      <div className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <h2 className="text-xl font-semibold mb-3 text-card-foreground">System Information</h2>
        <p className="text-sm text-muted-foreground">
          More admin-specific components and data will go here.
        </p>
      </div>
    </div>
  );
}
