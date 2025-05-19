
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldAlert, Flag, MessageSquareText, UserCog, Users, KeyRound, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFlaggedResponses, type FlaggedResponseLogWithId, getAllUserProfiles, type UserProfileWithId, adminSetUserAccountDisabledStatus } from '@/services/user-service';
import EditUserDialog from '@/components/admin/edit-user-dialog';
import ViewFlaggedResponseDialog from '@/components/admin/view-flagged-response-dialog';
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
import { sendPasswordResetEmail } from 'firebase/auth'; 

export default function AdminDashboardPage() {
  const { user, userProfile, loading, profileLoading, authInstance } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();

  const [flaggedResponses, setFlaggedResponses] = useState<FlaggedResponseLogWithId[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [users, setUsers] = useState<UserProfileWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSendingResetEmailFor, setIsSendingResetEmailFor] = useState<string | null>(null);
  const [togglingAccountStatusFor, setTogglingAccountStatusFor] = useState<string | null>(null);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfileWithId | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  const [selectedFlagForView, setSelectedFlagForView] = useState<FlaggedResponseLogWithId | null>(null);
  const [isViewFlagDialogOpen, setIsViewFlagDialogOpen] = useState(false);

  const isLoading = loading || profileLoading;

  const fetchAdminData = useCallback(async () => {
    if (!userProfile?.isAdmin) return; 
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
    fetchAdminData(); 
  };

  const handlePasswordReset = async (email: string | null, userId: string) => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User email is not available to send a password reset.",
      });
      return;
    }
    if (!authInstance) {
       toast({ variant: "destructive", title: "Authentication Error", description: "Auth service not available." });
       return;
    }

    setIsSendingResetEmailFor(userId);
    try {
      await sendPasswordResetEmail(authInstance, email);
      toast({
        title: "Password Reset Email Sent",
        description: `An email has been sent to ${email} with instructions to reset their password.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: error.message || "Could not send password reset email.",
      });
    } finally {
      setIsSendingResetEmailFor(null);
    }
  };

  const handleToggleAccountStatus = async (targetUser: UserProfileWithId) => {
    if (!targetUser) return;
    const newDisabledStatus = !targetUser.isAccountDisabled;
    const action = newDisabledStatus ? "Disabling" : "Enabling";
    const statusNoun = newDisabledStatus ? "disabled" : "enabled";

    setTogglingAccountStatusFor(targetUser.id);
    try {
      await adminSetUserAccountDisabledStatus(targetUser.id, newDisabledStatus);
      toast({
        title: `Account Status Updated`,
        description: `Account for ${targetUser.displayName || targetUser.email} has been ${statusNoun}. (DB flag updated)`,
      });
      fetchAdminData(); // Refresh the user list
    } catch (error: any) {
      console.error(`Error ${action.toLowerCase()} account:`, error);
      toast({
        variant: "destructive",
        title: `Failed to Update Status`,
        description: `Could not update account status for ${targetUser.displayName || targetUser.email}.`,
      });
    } finally {
      setTogglingAccountStatusFor(null);
    }
  };

  const handleViewFlagDetails = (flag: FlaggedResponseLogWithId) => {
    setSelectedFlagForView(flag);
    setIsViewFlagDialogOpen(true);
  };

  const handleFlagActionCompleted = () => {
    fetchAdminData(); // Refresh the list of flagged responses
    setIsViewFlagDialogOpen(false); // Close the dialog
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
                  <TableHead>Status</TableHead> 
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
                    <TableCell>
                      <Badge variant={u.isAccountDisabled ? "destructive" : "secondary"}>
                        {u.isAccountDisabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.lastUpdatedAt ? format(new Date(u.lastUpdatedAt), 'PPp') : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditUserClick(u)} 
                        disabled={isSendingResetEmailFor === u.id || togglingAccountStatusFor === u.id}
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePasswordReset(u.email, u.id)}
                        disabled={!u.email || isSendingResetEmailFor === u.id || togglingAccountStatusFor === u.id}
                        title={!u.email ? "User email not available" : "Send Password Reset Email"}
                      >
                        {isSendingResetEmailFor === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <KeyRound className="h-4 w-4 mr-1" />
                        )}
                        Reset Pwd
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAccountStatus(u)}
                        disabled={togglingAccountStatusFor === u.id || isSendingResetEmailFor === u.id}
                        title={u.isAccountDisabled ? "Enable Account (DB flag)" : "Disable Account (DB flag)"}
                      >
                        {togglingAccountStatusFor === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : u.isAccountDisabled ? (
                          <UserCheck className="h-4 w-4 mr-1 text-green-600" /> 
                        ) : (
                          <UserX className="h-4 w-4 mr-1 text-red-600" />
                        )}
                        {u.isAccountDisabled ? 'Enable' : 'Disable'}
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
                      <Button variant="ghost" size="sm" onClick={() => handleViewFlagDetails(flag)}>
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
      {selectedFlagForView && (
        <ViewFlaggedResponseDialog
          isOpen={isViewFlagDialogOpen}
          onOpenChange={setIsViewFlagDialogOpen}
          flaggedResponse={selectedFlagForView}
          onFlagActionCompleted={handleFlagActionCompleted}
        />
      )}
    </div>
  );
}
