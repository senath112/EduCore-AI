
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldAlert, Flag, MessageSquareText, UserCog, Users, KeyRound, UserX, UserCheck, Ticket, FileText, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFlaggedResponses, type FlaggedResponseLogWithId, getAllUserProfiles, type UserProfileWithId, adminSetUserAccountDisabledStatus, getSupportTickets, type SupportTicketLog } from '@/services/user-service';
import EditUserDialog from '@/components/admin/edit-user-dialog';
import ViewFlaggedResponseDialog from '@/components/admin/view-flagged-response-dialog';
import CloseSupportTicketDialog from '@/components/admin/close-support-ticket-dialog';
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
  const [usersList, setUsersList] = useState<UserProfileWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [supportTickets, setSupportTickets] = useState<SupportTicketLog[]>([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState(true);

  const [isSendingResetEmailFor, setIsSendingResetEmailFor] = useState<string | null>(null);
  const [togglingAccountStatusFor, setTogglingAccountStatusFor] = useState<string | null>(null);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfileWithId | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  const [selectedFlagForView, setSelectedFlagForView] = useState<FlaggedResponseLogWithId | null>(null);
  const [isViewFlagDialogOpen, setIsViewFlagDialogOpen] = useState(false);

  const [selectedTicketForClosure, setSelectedTicketForClosure] = useState<SupportTicketLog | null>(null);
  const [isCloseTicketDialogOpen, setIsCloseTicketDialogOpen] = useState(false);


  const isLoading = loading || profileLoading;

  const fetchAdminData = useCallback(async () => {
    if (!userProfile?.isAdmin) return;
    setLoadingFlags(true);
    setLoadingUsers(true);
    setLoadingSupportTickets(true);
    try {
      const [responses, userProfilesData, tickets] = await Promise.all([
        getFlaggedResponses(),
        getAllUserProfiles(),
        getSupportTickets(),
      ]);
      setFlaggedResponses(responses);
      setUsersList(userProfilesData);
      setSupportTickets(tickets);
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
      setLoadingSupportTickets(false);
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
      fetchAdminData(); // Refresh data after toggling
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
    fetchAdminData();
    setIsViewFlagDialogOpen(false);
  };

  const handleOpenCloseTicketDialog = (ticket: SupportTicketLog) => {
    setSelectedTicketForClosure(ticket);
    setIsCloseTicketDialogOpen(true);
  };

  const handleTicketClosedSuccess = () => {
    fetchAdminData();
    setIsCloseTicketDialogOpen(false);
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

  const getUserEmailById = (userId: string): string | null => {
    const targetUser = usersList.find(u => u.id === userId);
    return targetUser?.email || null;
  };


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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-card-foreground">User Management</h2>
            <Users className="h-6 w-6 text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{loadingUsers ? <Loader2 className="h-7 w-7 animate-spin" /> : usersList.length}</p>
          <p className="text-muted-foreground mb-4">Total Registered Users</p>
          <Button variant="outline" asChild>
             <Link href="#user-management-section">View Users</Link>
          </Button>
        </div>

        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-card-foreground">Content Moderation</h2>
            <Flag className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-3xl font-bold text-destructive">{loadingFlags ? <Loader2 className="h-7 w-7 animate-spin" /> : flaggedResponses.length}</p>
          <p className="text-muted-foreground mb-4">Flagged AI Responses</p>
          <Button variant="outline" asChild>
            <Link href="#flagged-responses-section">Review Flags</Link>
          </Button>
        </div>

        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-card-foreground">Support Tickets</h2>
            <Ticket className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{loadingSupportTickets ? <Loader2 className="h-7 w-7 animate-spin" /> : supportTickets.filter(ticket => ticket.supportId).length}</p>
          <p className="text-muted-foreground mb-4">Open Support Tickets</p>
          <Button variant="outline" asChild>
            <Link href="#support-tickets-section">View Tickets</Link>
          </Button>
        </div>
      </section>

      <section id="user-management-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold text-card-foreground">User Management ({usersList.length})</h2>
        </div>
        {loadingUsers ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading users...</p>
          </div>
        ) : usersList.length === 0 ? (
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
                {usersList.map((u) => (
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
                        title="Edit User Details"
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
          <h2 className="text-2xl font-semibold text-card-foreground">Flagged AI Responses ({flaggedResponses.length})</h2>
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
                      <Button variant="ghost" size="sm" onClick={() => handleViewFlagDetails(flag)} title="View Flag Details">
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

      <section id="support-tickets-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <Ticket className="h-7 w-7 text-blue-600" />
          <h2 className="text-2xl font-semibold text-card-foreground">Support Tickets ({supportTickets.filter(ticket => ticket.supportId).length})</h2>
        </div>
        {loadingSupportTickets ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading support tickets...</p>
          </div>
        ) : supportTickets.filter(ticket => ticket.supportId).length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No support tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Support ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportTickets.map((ticket) => {
                  const userForTicket = usersList.find(u => u.id === ticket.userId);
                  return (
                    <TableRow key={ticket.supportId}>
                      <TableCell className="font-medium truncate max-w-[100px]">{ticket.supportId}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{ticket.userId}</TableCell>
                      <TableCell>{ticket.userDisplayName || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ticket.language}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(ticket.timestamp), 'PPp')}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (userForTicket) {
                              handlePasswordReset(userForTicket.email, userForTicket.id);
                            } else {
                              toast({ variant: "destructive", title: "User Not Found", description: "Could not find user details for this ticket to reset password." });
                            }
                          }}
                          disabled={!userForTicket?.email || isSendingResetEmailFor === ticket.userId || togglingAccountStatusFor === ticket.userId}
                          title={!userForTicket?.email ? "User email not available" : "Send Password Reset Email"}
                        >
                          {isSendingResetEmailFor === ticket.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                              <KeyRound className="h-4 w-4 mr-1" />
                          )}
                          Reset Pwd
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCloseTicketDialog(ticket)}
                          disabled={!userForTicket?.email || isSendingResetEmailFor === ticket.userId || togglingAccountStatusFor === ticket.userId}
                          title={!userForTicket?.email ? "Cannot close: User email not available" : "Close Support Ticket"}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Close Ticket
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      {selectedTicketForClosure && (
        <CloseSupportTicketDialog
          isOpen={isCloseTicketDialogOpen}
          onOpenChange={setIsCloseTicketDialogOpen}
          ticketData={selectedTicketForClosure}
          userEmail={getUserEmailById(selectedTicketForClosure.userId)}
          onTicketClosed={handleTicketClosedSuccess}
        />
      )}
    </div>
  );
}

    