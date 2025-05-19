
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldAlert, Flag, MessageSquareText, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFlaggedResponses, type FlaggedResponseLogWithId, getAllUserProfiles, type UserProfileWithId } from '@/services/user-service';
import EditUserDialog from '@/components/admin/edit-user-dialog';
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
  const [users, setUsers] = useState<UserProfileWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfileWithId | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  const isLoading = loading || profileLoading;

  const fetchAdminData = useCallback(async () => {
    if (!userProfile?.isAdmin) return; // Ensure only admin fetches data
    setLoadingFlags(true);
    setLoadingUsers(true);
    try {
      const responses = await getFlaggedResponses();
      setFlaggedResponses(responses);
      const userProfiles = await getAllUserProfiles();
      setUsers(userProfiles);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load admin data.",
      });
    } finally {
      setLoadingFlags(false);
      setLoadingUsers(false);
    }
  }, [userProfile?.isAdmin, toast]);


  useEffect(() => {
    if (!isLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.push('/');
      } else {
        fetchAdminData();
      }
    }
  }, [user, userProfile, isLoading, router, fetchAdminData]);

  const handleEditUserClick = (userToEdit: UserProfileWithId) => {
    setSelectedUserForEdit(userToEdit);
    setIsEditUserDialogOpen(true);
  };

  const handleUserUpdateSuccess = () => {
    setIsEditUserDialogOpen(false);
    fetchAdminData(); // Re-fetch data to show updated user list
  };


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
          <Button variant="outline" asChild>
             <Link href="#user-management-section">View Users</Link>
          </Button>
        </div>
        
        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h2 className="text-xl font-semibold mb-3 text-card-foreground">Content Moderation</h2>
          <p className="text-muted-foreground mb-4">Review flagged responses and content.</p>
          <Button variant="outline" asChild>
            <Link href="#flagged-responses-section">Review Flags</Link>
          </Button>
        </div>

        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h2 className="text-xl font-semibold mb-3 text-card-foreground">Analytics</h2>
          <p className="text-muted-foreground mb-4">View application usage statistics.</p>
          <Button variant="outline" disabled>View Analytics (Coming Soon)</Button>
        </div>
      </section>

      <section id="user-management-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold text-card-foreground">User Management</h2>
        </div>
        {loadingUsers ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium truncate max-w-[100px]">{u.id}</TableCell>
                    <TableCell>{u.displayName || 'N/A'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{typeof u.credits === 'number' ? u.credits : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={u.isAdmin ? "default" : "outline"}>
                        {u.isAdmin ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.lastUpdatedAt ? format(new Date(u.lastUpdatedAt), 'PPp') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUserClick(u)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        View/Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section id="flagged-responses-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
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
      {selectedUserForEdit && (
        <EditUserDialog
          isOpen={isEditUserDialogOpen}
          onOpenChange={setIsEditUserDialogOpen}
          userToEdit={selectedUserForEdit}
          onUserUpdated={handleUserUpdateSuccess}
        />
      )}
    </div>
  );
}
