
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, Flag, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFlaggedResponses, type FlaggedResponseLogWithId } from '@/services/user-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const { user, userProfile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [flaggedResponses, setFlaggedResponses] = useState<FlaggedResponseLogWithId[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);

  const isLoading = loading || profileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.push('/');
      } else {
        // User is admin, fetch flagged responses
        const fetchFlags = async () => {
          setLoadingFlags(true);
          try {
            const responses = await getFlaggedResponses();
            setFlaggedResponses(responses);
          } catch (error) {
            console.error("Failed to fetch flagged responses:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not load flagged responses.",
            });
          } finally {
            setLoadingFlags(false);
          }
        };
        fetchFlags();
      }
    }
  }, [user, userProfile, isLoading, router, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-6 min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

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
      
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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

      <section className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <Flag className="h-7 w-7 text-destructive" />
          <h2 className="text-2xl font-semibold text-card-foreground">Flagged AI Responses</h2>
        </div>

        {loadingFlags ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading flagged responses...</p>
          </div>
        ) : flaggedResponses.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No flagged responses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Flagged Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedResponses.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>{format(new Date(flag.timestamp), 'PPp')}</TableCell>
                    <TableCell>{flag.userDisplayName || flag.userId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{flag.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{flag.language}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {flag.flaggedMessageContent}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => alert(`Viewing details for flag ID: ${flag.id}\nFull message: ${flag.flaggedMessageContent}\n\nChat History:\n${flag.chatHistorySnapshot.map(m => `${m.role}: ${m.content}`).join('\n')}`)}>
                        <MessageSquareText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
