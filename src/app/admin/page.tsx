
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, ShieldAlert, Flag, MessageSquareText, UserCog, Users, KeyRound, UserX, UserCheck, Ticket, FileText, Sigma, Settings2, Tags, Award, BookOpenCheck, Download, Users2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { getFlaggedResponses, type FlaggedResponseLogWithId, getAllUserProfiles, type UserProfileWithId, adminSetUserAccountDisabledStatus, getSupportTickets, type SupportTicketLog, type SupportTicketStatus } from '@/services/user-service';
import { getAllCreditVouchers, type CreditVoucher } from '@/services/voucher-service';
import { getAllClasses, type ClassData } from '@/services/class-service';
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
import { format, isPast, parseISO, subDays, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import jsPDF from 'jspdf';

interface TeacherVoucherStat {
  teacherId: string;
  teacherName: string;
  totalGenerated: number;
  totalRedeemed: number;
  totalActive: number;
  totalExpired: number;
}

export default function AdminDashboardPage() {
  const { user, userProfile, loading: authLoading, profileLoading, authInstance } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [flaggedResponses, setFlaggedResponses] = useState<FlaggedResponseLogWithId[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [usersList, setUsersList] = useState<UserProfileWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [supportTickets, setSupportTickets] = useState<SupportTicketLog[]>([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState(true);
  const [creditVouchers, setCreditVouchers] = useState<CreditVoucher[]>([]);
  const [loadingCreditVouchers, setLoadingCreditVouchers] = useState(true);
  const [teacherVoucherStats, setTeacherVoucherStats] = useState<TeacherVoucherStat[]>([]);
  const [loadingTeacherStats, setLoadingTeacherStats] = useState(true);
  const [allSystemClasses, setAllSystemClasses] = useState<ClassData[]>([]);
  const [loadingAllClasses, setLoadingAllClasses] = useState(true);


  const [isSendingResetEmailFor, setIsSendingResetEmailFor] = useState<string | null>(null);
  const [togglingAccountStatusFor, setTogglingAccountStatusFor] = useState<string | null>(null);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfileWithId | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  const [selectedFlagForView, setSelectedFlagForView] = useState<FlaggedResponseLogWithId | null>(null);
  const [isViewFlagDialogOpen, setIsViewFlagDialogOpen] = useState(false);

  const [selectedTicketForClosure, setSelectedTicketForClosure] = useState<SupportTicketLog | null>(null);
  const [isCloseTicketDialogOpen, setIsCloseTicketDialogOpen] = useState(false);

  const isLoading = authLoading || profileLoading;

  const fetchAdminData = useCallback(async () => {
    if (!userProfile?.isAdmin) return;
    setLoadingFlags(true);
    setLoadingUsers(true);
    setLoadingSupportTickets(true);
    setLoadingCreditVouchers(true);
    setLoadingTeacherStats(true);
    setLoadingAllClasses(true);
    try {
      const [responses, userProfilesData, tickets, vouchers, classes] = await Promise.all([
        getFlaggedResponses(),
        getAllUserProfiles(),
        getSupportTickets(),
        getAllCreditVouchers(),
        getAllClasses(),
      ]);
      setFlaggedResponses(responses);
      setUsersList(userProfilesData);
      setSupportTickets(tickets);
      setCreditVouchers(vouchers.map(v => ({
        ...v,
        status: v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)) ? 'expired' : v.status
      })));
      setAllSystemClasses(classes);
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
      setLoadingCreditVouchers(false);
      setLoadingAllClasses(false);
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

  useEffect(() => {
    if (!loadingUsers && !loadingCreditVouchers && usersList.length > 0 && creditVouchers.length > 0) {
      setLoadingTeacherStats(true);
      const teachers = usersList.filter(u => u.isTeacher);
      const stats: TeacherVoucherStat[] = teachers.map(teacher => {
        const allTeacherVouchers = creditVouchers.filter(v => v.generatedByTeacherId === teacher.id);
        const totalGenerated = allTeacherVouchers.length;
        const totalRedeemed = allTeacherVouchers.filter(v => v.status === 'redeemed').length;
        
        const totalActive = allTeacherVouchers.filter(v => 
            v.status === 'active' && 
            v.expiryDate && 
            !isPast(parseISO(v.expiryDate))
        ).length;
        
        const totalExpired = allTeacherVouchers.filter(v => 
            v.status === 'expired' || 
            (v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)))
        ).length;
        
        return {
          teacherId: teacher.id,
          teacherName: teacher.displayName || teacher.email || 'Unknown Teacher',
          totalGenerated,
          totalRedeemed,
          totalActive,
          totalExpired,
        };
      });
      setTeacherVoucherStats(stats);
      setLoadingTeacherStats(false);
    } else if (!loadingUsers && !loadingCreditVouchers) {
      setTeacherVoucherStats([]);
      setLoadingTeacherStats(false);
    }
  }, [usersList, creditVouchers, loadingUsers, loadingCreditVouchers]);


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
      fetchAdminData(); 
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

  const handleOpenResolveTicketDialog = (ticket: SupportTicketLog) => {
    setSelectedTicketForClosure(ticket);
    setIsCloseTicketDialogOpen(true);
  };

  const handleTicketResolvedSuccess = () => {
    fetchAdminData();
    setIsCloseTicketDialogOpen(false);
  };
  
  const anyDataStillLoading = useMemo(() => {
    return loadingFlags || loadingUsers || loadingSupportTickets || loadingCreditVouchers || loadingTeacherStats || loadingAllClasses;
  }, [loadingFlags, loadingUsers, loadingSupportTickets, loadingCreditVouchers, loadingTeacherStats, loadingAllClasses]);

  const handleDownloadTeacherReport = (teacherInfo: TeacherVoucherStat) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const subSectionSpacing = 5;
    const itemSpacing = 5;
    const generationTimestamp = new Date();
    const thirtyDaysAgo = subDays(generationTimestamp, 30);

    doc.setFontSize(18);
    doc.text("EduCore AI - System Generated Report", pageWidth / 2, yPos, { align: 'center' });
    yPos += lineSpacing;
    doc.setFontSize(10);
    doc.text(`Generated: ${format(generationTimestamp, 'PPP p')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing * 1.5;

    doc.setFontSize(16);
    doc.text(`Report for Teacher: ${teacherInfo.teacherName}`, margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(12);
    doc.text(`Teacher ID: ${teacherInfo.teacherId}`, margin, yPos);
    yPos += sectionSpacing;

    doc.setFontSize(14);
    doc.text("Classes Taught:", margin, yPos);
    yPos += lineSpacing;
    const teacherClasses = allSystemClasses.filter(cls => cls.teacherId === teacherInfo.teacherId);
    if (teacherClasses.length > 0) {
      teacherClasses.forEach(cls => {
        if (yPos + sectionSpacing > pageHeight - margin) { doc.addPage(); yPos = margin; }
        doc.setFontSize(12);
        doc.text(`- ${cls.name} (ID: ${cls.friendlyId || 'N/A'})`, margin + 5, yPos);
        yPos += lineSpacing * 0.8;
        
        doc.setFontSize(10);
        doc.text("Enrolled Students:", margin + 10, yPos);
        yPos += lineSpacing * 0.7;
        const enrolledStudents = usersList.filter(u => u.enrolledClassIds && u.enrolledClassIds[cls.id]);
        if (enrolledStudents.length > 0) {
          enrolledStudents.forEach(student => {
            if (yPos > pageHeight - margin - lineSpacing) { doc.addPage(); yPos = margin; }
            doc.text(`  • ${student.displayName || student.email}`, margin + 15, yPos);
            yPos += itemSpacing;
          });
        } else {
          if (yPos > pageHeight - margin - lineSpacing) { doc.addPage(); yPos = margin; }
          doc.text("  No students currently enrolled in this class.", margin + 15, yPos);
          yPos += itemSpacing;
        }
        yPos += subSectionSpacing;
      });
    } else {
      if (yPos > pageHeight - margin - lineSpacing) { doc.addPage(); yPos = margin; }
      doc.setFontSize(10);
      doc.text("No classes found for this teacher.", margin + 5, yPos);
      yPos += lineSpacing;
    }
    yPos += sectionSpacing / 2;

    const teacherVouchersAllTime = creditVouchers.filter(v => v.generatedByTeacherId === teacherInfo.teacherId);
    const teacherVouchersLast30Days = teacherVouchersAllTime.filter(v => 
        v.createdAt && isAfter(parseISO(v.createdAt), thirtyDaysAgo)
    );

    const generatedLast30Days = teacherVouchersLast30Days.length;
    const redeemedLast30Days = teacherVouchersLast30Days.filter(v => v.status === 'redeemed').length;
    const activeLast30Days = teacherVouchersLast30Days.filter(v => v.status === 'active' && v.expiryDate && !isPast(parseISO(v.expiryDate))).length;
    const expiredLast30Days = teacherVouchersLast30Days.filter(v => v.status === 'expired' || (v.status === 'active' && v.expiryDate && isPast(parseISO(v.expiryDate)))).length;

    if (yPos + sectionSpacing > pageHeight - margin) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text("Voucher Generation Summary (Last 30 Days):", margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(10);
    if (yPos > pageHeight - margin - (lineSpacing*4)) { doc.addPage(); yPos = margin; }
    doc.text(`- Total Vouchers Generated: ${generatedLast30Days}`, margin + 5, yPos); yPos += lineSpacing;
    doc.text(`- Total Vouchers Redeemed: ${redeemedLast30Days}`, margin + 5, yPos); yPos += lineSpacing;
    doc.text(`- Total Vouchers Active: ${activeLast30Days}`, margin + 5, yPos); yPos += lineSpacing;
    doc.text(`- Total Vouchers Expired: ${expiredLast30Days}`, margin + 5, yPos); yPos += lineSpacing;
    yPos += sectionSpacing / 2;

    if (yPos + sectionSpacing > pageHeight - margin) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.text("Detailed Voucher List (Last 30 Days):", margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(8); 
    if (teacherVouchersLast30Days.length > 0) {
      teacherVouchersLast30Days.forEach(voucher => {
        if (yPos > pageHeight - margin - lineSpacing) { 
          doc.addPage();
          yPos = margin;
          doc.setFontSize(10); 
          doc.text("Detailed Voucher List (Last 30 Days - Continued)", margin, yPos);
          yPos += lineSpacing;
          doc.setFontSize(8); 
        }
        let voucherLine = `Code: ${voucher.id} | Credits: ${voucher.credits} | Status: ${voucher.status}`;
        voucherLine += ` | Created: ${format(parseISO(voucher.createdAt), 'PPp')} | Expires: ${voucher.expiryDate ? format(parseISO(voucher.expiryDate), 'PPp') : 'N/A'}`;
        if (voucher.restrictedToClassName) {
            voucherLine += ` | For Class: ${voucher.restrictedToClassName}`;
        }
        doc.text(voucherLine, margin + 5, yPos);
        yPos += lineSpacing * 0.8;
      });
    } else {
      if (yPos > pageHeight - margin - lineSpacing) { doc.addPage(); yPos = margin; }
      doc.setFontSize(10); 
      doc.text("No vouchers generated by this teacher in the last 30 days.", margin + 5, yPos);
      yPos += lineSpacing;
    }
    
    let signatureYPos = pageHeight - margin - 15; 
    if (yPos > signatureYPos - (lineSpacing * 2)) { 
        doc.addPage();
        signatureYPos = pageHeight - margin - 15;
    } else {
      yPos = signatureYPos;
    }
    doc.setLineDashPattern([1, 1], 0); 
    doc.line(margin, yPos, margin + (contentWidth / 2), yPos); 
    doc.setLineDashPattern([], 0); 
    doc.setFontSize(10);
    doc.text("Admin Signature", margin, yPos + lineSpacing);

    doc.save(`teacher_report_${teacherInfo.teacherId}_${format(generationTimestamp, 'yyyyMMdd_HHmm')}.pdf`);
    toast({ title: "Report Downloaded", description: `Report for ${teacherInfo.teacherName} generated.` });
  };

  const handleDownloadAllVouchersReport = () => {
    if (creditVouchers.length === 0) {
      toast({ title: "No Vouchers", description: "There are no vouchers in the system to report." });
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPos = margin;
    const lineSpacing = 6;
    const sectionSpacing = 10;
    const generationTimestamp = new Date();

    doc.setFontSize(18);
    doc.text("EduCore AI - All Credit Vouchers Report", pageWidth / 2, yPos, { align: 'center' });
    yPos += lineSpacing;
    doc.setFontSize(10);
    doc.text(`Generated: ${format(generationTimestamp, 'PPP p')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing * 1.5;

    doc.setFontSize(8);

    creditVouchers.forEach((voucher, index) => {
      if (yPos > pageHeight - margin - (lineSpacing * 7)) { // Estimate space needed for one entry
        doc.addPage();
        yPos = margin;
        doc.setFontSize(12);
        doc.text("All Credit Vouchers Report (Continued)", pageWidth / 2, yPos, {align: 'center'});
        yPos += sectionSpacing;
        doc.setFontSize(8);
      }

      doc.text(`Voucher Code: ${voucher.id}`, margin, yPos); yPos += lineSpacing;
      doc.text(`  Credits: ${voucher.credits}`, margin, yPos); yPos += lineSpacing;
      doc.text(`  Status: ${voucher.status}`, margin, yPos); yPos += lineSpacing;
      doc.text(`  Generated By: ${voucher.generatedByTeacherName} (ID: ${voucher.generatedByTeacherId.substring(0,6)}...)`, margin, yPos); yPos += lineSpacing;
      doc.text(`  Created At: ${voucher.createdAt ? format(parseISO(voucher.createdAt), 'PPp') : 'N/A'}`, margin, yPos); yPos += lineSpacing;
      doc.text(`  Expires At: ${voucher.expiryDate ? format(parseISO(voucher.expiryDate), 'PPp') : 'N/A'}`, margin, yPos); yPos += lineSpacing;
      if (voucher.restrictedToClassName) {
        doc.text(`  Restricted to Class: ${voucher.restrictedToClassName}`, margin, yPos); yPos += lineSpacing;
      }
      if (voucher.redeemedByUserId) {
        doc.text(`  Redeemed By User ID: ${voucher.redeemedByUserId}`, margin, yPos); yPos += lineSpacing;
        doc.text(`  Redeemed At: ${voucher.redeemedAt ? format(parseISO(voucher.redeemedAt), 'PPp') : 'N/A'}`, margin, yPos); yPos += lineSpacing;
      }
      yPos += lineSpacing * 0.5; 
      if(index < creditVouchers.length -1) {
        doc.setLineDashPattern([0.5, 0.5],0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        doc.setLineDashPattern([],0);
        yPos += lineSpacing * 0.5;
      }
    });
    
    doc.save(`all_vouchers_report_${format(generationTimestamp, 'yyyyMMdd_HHmm')}.pdf`);
    toast({ title: "Report Downloaded", description: "Report of all credit vouchers generated." });
  };


  if (isLoading || (userProfile?.isAdmin && anyDataStillLoading && !teacherVoucherStats.length && !flaggedResponses.length && !usersList.length && !supportTickets.length && !creditVouchers.length && !allSystemClasses.length)) {
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

  const getStatusBadgeVariant = (status: SupportTicketStatus) => {
    switch (status) {
      case 'Open':
        return 'default'; 
      case 'In Progress':
        return 'secondary'; 
      case 'Resolved':
        return 'outline'; 
      default:
        return 'outline';
    }
  };
  
  const getVoucherStatusBadgeVariant = (status: CreditVoucher['status']) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'redeemed':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <div className="container mx-auto p-6 min-h-[calc(100vh-150px)]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Welcome, Admin {userProfile?.displayName || user.email}!
        </p>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
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
            <Ticket className="h-6 w-6 text-accent" />
          </div>
          <p className="text-3xl font-bold text-accent">{loadingSupportTickets ? <Loader2 className="h-7 w-7 animate-spin" /> : supportTickets.filter(ticket => ticket.status !== 'Resolved').length}</p>
          <p className="text-muted-foreground mb-4">Open/In Progress Tickets</p>
          <Button variant="outline" asChild>
            <Link href="#support-tickets-section">View Tickets</Link>
          </Button>
        </div>

        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-card-foreground">Credit Vouchers</h2>
            <Tags className="h-6 w-6 text-secondary" />
          </div>
          <p className="text-3xl font-bold text-secondary">{loadingCreditVouchers ? <Loader2 className="h-7 w-7 animate-spin" /> : creditVouchers.length}</p>
          <p className="text-muted-foreground mb-4">Total Vouchers Generated</p>
          <Button variant="outline" asChild>
            <Link href="#credit-vouchers-section">View Vouchers</Link>
          </Button>
        </div>
        
        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-card-foreground">System Classes</h2>
            <BookOpenCheck className="h-6 w-6 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-indigo-500">{loadingAllClasses ? <Loader2 className="h-7 w-7 animate-spin" /> : allSystemClasses.length}</p>
          <p className="text-muted-foreground mb-4">Total Classes Created</p>
          <Button variant="outline" asChild>
            <Link href="#all-classes-section">View Classes</Link>
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
                  <TableHead>Teacher</TableHead>
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
                      <Badge variant={u.isTeacher ? "default" : "outline"}>
                        {u.isTeacher ? 'Yes' : 'No'}
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
                        <UserCog className="h-4 w-4 mr-1" />
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
                    <TableCell>{flag.timestamp ? format(new Date(flag.timestamp), 'PPp') : 'N/A'}</TableCell>
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
                        <MessageSquareText className="h-4 w-4 mr-1" />
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
          <Ticket className="h-7 w-7 text-accent" />
          <h2 className="text-2xl font-semibold text-card-foreground">Support Tickets ({supportTickets.length})</h2>
        </div>
        {loadingSupportTickets ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading support tickets...</p>
          </div>
        ) : supportTickets.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No support tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Support ID</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportTickets.map((ticket) => {
                  const userForTicket = usersList.find(u => u.id === ticket.userId);
                  return (
                    <TableRow key={ticket.supportId}>
                      <TableCell className="font-medium truncate max-w-[100px]">{ticket.supportId}</TableCell>
                      <TableCell>{ticket.userDisplayName || ticket.userId}</TableCell>
                       <TableCell>
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ticket.language}</Badge>
                      </TableCell>
                      <TableCell>{ticket.timestamp ? format(new Date(ticket.timestamp), 'PPp') : 'N/A'}</TableCell>
                      <TableCell>{ticket.lastUpdatedAt ? format(new Date(ticket.lastUpdatedAt), 'PPp') : 'N/A'}</TableCell>
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
                          onClick={() => handleOpenResolveTicketDialog(ticket)}
                          disabled={!userForTicket?.email || isSendingResetEmailFor === ticket.userId || togglingAccountStatusFor === ticket.userId || ticket.status === 'Resolved'}
                          title={!userForTicket?.email ? "Cannot resolve: User email not available" : ticket.status === 'Resolved' ? "Ticket already resolved" : "Resolve Support Ticket"}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {ticket.status === 'Resolved' ? 'View Resolution' : 'Resolve'}
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

      <section id="credit-vouchers-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center justify-between gap-3 mb-6">
            <div className='flex items-center gap-3'>
                <Tags className="h-7 w-7 text-secondary" />
                <h2 className="text-2xl font-semibold text-card-foreground">All Credit Vouchers ({creditVouchers.length})</h2>
            </div>
            <Button variant="outline" onClick={handleDownloadAllVouchersReport} disabled={creditVouchers.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
            </Button>
        </div>
        {loadingCreditVouchers ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading credit vouchers...</p>
          </div>
        ) : creditVouchers.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No credit vouchers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher Code</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Restricted to Class</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Redeemed By (User ID)</TableHead>
                  <TableHead>Redeemed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium font-mono">{voucher.id}</TableCell>
                    <TableCell>{voucher.credits}</TableCell>
                    <TableCell>{voucher.generatedByTeacherName} ({voucher.generatedByTeacherId.substring(0,6)}...)</TableCell>
                    <TableCell>{voucher.restrictedToClassName || 'N/A'}</TableCell>
                    <TableCell>{voucher.createdAt ? format(new Date(voucher.createdAt), 'PPp') : 'N/A'}</TableCell>
                    <TableCell>{voucher.expiryDate ? format(new Date(voucher.expiryDate), 'PPp') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getVoucherStatusBadgeVariant(voucher.status)}>
                        {voucher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate max-w-[100px]">{voucher.redeemedByUserId || 'N/A'}</TableCell>
                    <TableCell>{voucher.redeemedAt ? format(new Date(voucher.redeemedAt), 'PPp') : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section id="teacher-voucher-summary-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <Award className="h-7 w-7 text-green-600" />
          <h2 className="text-2xl font-semibold text-card-foreground">Teacher Voucher Generation Summary</h2>
        </div>
        {loadingTeacherStats ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading teacher voucher statistics...</p>
          </div>
        ) : teacherVoucherStats.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No teacher voucher data available or no teachers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Teacher ID</TableHead>
                  <TableHead className="text-center">Total Generated</TableHead>
                  <TableHead className="text-center">Total Redeemed</TableHead>
                  <TableHead className="text-center">Total Active</TableHead>
                  <TableHead className="text-center">Total Expired</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherVoucherStats.map((stat) => (
                  <TableRow key={stat.teacherId}>
                    <TableCell>{stat.teacherName}</TableCell>
                    <TableCell className="font-mono truncate max-w-[100px]">{stat.teacherId}</TableCell>
                    <TableCell className="text-center">{stat.totalGenerated}</TableCell>
                    <TableCell className="text-center">{stat.totalRedeemed}</TableCell>
                    <TableCell className="text-center">{stat.totalActive}</TableCell>
                    <TableCell className="text-center">{stat.totalExpired}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadTeacherReport(stat)}
                        title="Download Teacher Report"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

       <section id="all-classes-section" className="mt-10 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-3 mb-6">
          <BookOpenCheck className="h-7 w-7 text-indigo-500" />
          <h2 className="text-2xl font-semibold text-card-foreground">All System Classes ({allSystemClasses.length})</h2>
        </div>
        {loadingAllClasses ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading all classes...</p>
          </div>
        ) : allSystemClasses.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No classes found in the system.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Class ID</TableHead>
                  <TableHead>Friendly ID</TableHead>
                  <TableHead>Instructor Name</TableHead>
                  <TableHead>Teacher ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSystemClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>{cls.name}</TableCell>
                    <TableCell className="font-mono truncate max-w-[100px]">{cls.id}</TableCell>
                    <TableCell className="font-medium">{cls.friendlyId || 'N/A'}</TableCell>
                    <TableCell>{cls.instructorName}</TableCell>
                    <TableCell className="font-mono truncate max-w-[100px]">{cls.teacherId}</TableCell>
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
      {selectedTicketForClosure && (
        <CloseSupportTicketDialog
          isOpen={isCloseTicketDialogOpen}
          onOpenChange={setIsCloseTicketDialogOpen}
          ticketData={selectedTicketForClosure}
          userEmail={getUserEmailById(selectedTicketForClosure.userId)}
          onTicketClosed={handleTicketResolvedSuccess}
        />
      )}
    </div>
  );
}
    
