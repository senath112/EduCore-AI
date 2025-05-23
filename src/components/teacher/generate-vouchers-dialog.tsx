
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GenerateVouchersFormSchema, type GenerateVouchersFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createCreditVouchers, type CreditVoucher } from '@/services/voucher-service';
import { getClassesByTeacher, type ClassData } from '@/services/class-service';
import { generateVoucherSlipsPDF } from '@/lib/voucherUtils'; // Import the PDF utility
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, TicketPlus, Copy, Download, CalendarClock, CircleDollarSign, Users, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface GenerateVouchersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onVouchersGenerated?: (result: { vouchers: CreditVoucher[]; batchId: string }) => void;
}

const NO_RESTRICTION_VALUE = "__NO_RESTRICTION__";

export default function GenerateVouchersDialog({ 
  isOpen, 
  onOpenChange, 
  onVouchersGenerated 
}: GenerateVouchersDialogProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGeneratedVouchersAlert, setShowGeneratedVouchersAlert] = useState(false);
  const [generatedVouchersList, setGeneratedVouchersList] = useState<CreditVoucher[]>([]);
  const [lastGeneratedBatchId, setLastGeneratedBatchId] = useState<string | null>(null);
  
  const [myClasses, setMyClasses] = useState<ClassData[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const form = useForm<GenerateVouchersFormValues>({
    resolver: zodResolver(GenerateVouchersFormSchema),
    defaultValues: {
      creditsPerVoucher: 10,
      numberOfVouchers: 5,
      selectedClassId: "", 
    },
  });

  useEffect(() => {
    if (isOpen && user) {
      setLoadingClasses(true);
      getClassesByTeacher(user.uid)
        .then(setMyClasses)
        .catch(err => {
          console.error("Failed to fetch teacher's classes:", err);
          toast({ variant: "destructive", title: "Error", description: "Could not load your classes for restriction options."});
        })
        .finally(() => setLoadingClasses(false));
    }
  }, [isOpen, user, toast]);

  const onSubmit = async (values: GenerateVouchersFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in as a teacher." });
      return;
    }
    setIsProcessing(true);

    const totalCreditsRequired = values.creditsPerVoucher * values.numberOfVouchers;
    const currentTeacherCredits = typeof userProfile.credits === 'number' ? userProfile.credits : 0;
    const isTeacherAlsoAdmin = !!userProfile.isAdmin;

    if (!isTeacherAlsoAdmin && currentTeacherCredits < totalCreditsRequired) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `You need ${totalCreditsRequired} credits to generate these vouchers, but you only have ${currentTeacherCredits}. Admins can add credits to your account.`,
        duration: 7000,
      });
      setIsProcessing(false);
      return;
    }

    let classIdToSave: string | undefined = undefined;
    let classNameToSave: string | undefined = undefined;
    let friendlyClassIdToSave: string | undefined = undefined;
    const selectedClassObj = myClasses.find(c => c.id === values.selectedClassId);

    if (values.selectedClassId && values.selectedClassId !== NO_RESTRICTION_VALUE && selectedClassObj) {
        classIdToSave = selectedClassObj.id;
        classNameToSave = selectedClassObj.name;
        friendlyClassIdToSave = selectedClassObj.friendlyId;
    }

    try {
      const { vouchers, batchId } = await createCreditVouchers(
        user.uid,
        userProfile.displayName || user.email || "Unknown Teacher",
        values.creditsPerVoucher,
        values.numberOfVouchers,
        classIdToSave,
        classNameToSave,
        friendlyClassIdToSave
      );

      setGeneratedVouchersList(vouchers); 
      setLastGeneratedBatchId(batchId);
      
      if (vouchers && vouchers.length > 0 && userProfile.displayName) {
         generateVoucherSlipsPDF(vouchers, userProfile.displayName, batchId, toast);
      }
      setShowGeneratedVouchersAlert(true); 

      if (onVouchersGenerated) {
        onVouchersGenerated({ vouchers, batchId });
      }
      
      if (!isTeacherAlsoAdmin) { 
        await refreshUserProfile();
      }
      form.reset();
    } catch (error: any) {
      console.error("Error generating vouchers:", error);
      toast({ 
        variant: "destructive", 
        title: "Generation Failed", 
        description: error.message || "Could not generate vouchers.",
        duration: 7000 
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        toast({ title: "Copied!", description: `Voucher code ${code} copied.` });
      })
      .catch(err => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code." });
      });
  };
  
  const handleCopyAllVoucherCodes = () => {
    if (generatedVouchersList.length === 0) return;
    const allCodesText = generatedVouchersList.map(v => `Code: ${v.id}, Credits: ${v.credits}, Expires: ${v.expiryDate ? format(parseISO(v.expiryDate), 'PP') : 'N/A'}${v.restrictedToClassName ? `, For Class: ${v.restrictedToClassName}${v.restrictedToFriendlyClassId ? ` (ID: ${v.restrictedToFriendlyClassId})` : ''}` : ''}`).join('\n');
    navigator.clipboard.writeText(allCodesText)
      .then(() => {
        toast({ title: "All Codes Copied!", description: "All generated voucher codes and details copied to clipboard." });
      })
      .catch(err => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy all codes." });
      });
  };

  const handleReDownloadPDF = () => {
    if (generatedVouchersList.length > 0 && lastGeneratedBatchId && userProfile?.displayName) {
      generateVoucherSlipsPDF(generatedVouchersList, userProfile.displayName, lastGeneratedBatchId, toast);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not re-download PDF. Data missing." });
    }
  };

  const closeDialogsAndReset = () => {
    setShowGeneratedVouchersAlert(false);
    setLastGeneratedBatchId(null);
    setGeneratedVouchersList([]);
    onOpenChange(false); 
  };

  const currentTeacherCredits = (userProfile && typeof userProfile.credits === 'number') ? userProfile.credits : 0;
  const isTeacherAdmin = (userProfile?.isTeacher && userProfile?.isAdmin) || false;

  return (
    <>
      <Dialog open={isOpen && !showGeneratedVouchersAlert} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketPlus className="h-6 w-6" /> Generate Credit Vouchers
            </DialogTitle>
            <DialogDescription>
              Specify details for the voucher batch. Vouchers expire in 28 days. <br />
              {isTeacherAdmin ? (
                 <Badge variant="outline" className="mt-1">
                    <Info className="mr-1 h-3.5 w-3.5 text-primary"/> As Admin, credits will not be deducted.
                 </Badge>
              ) : userProfile?.isTeacher ? (
                 <Badge variant="outline" className="mt-1">
                    <CircleDollarSign className="mr-1 h-3.5 w-3.5 text-primary"/> Your Credits: {currentTeacherCredits}. Credits will be deducted.
                 </Badge>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="creditsPerVoucher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits Per Voucher</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfVouchers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Vouchers to Generate</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selectedClassId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground"/>
                        Restrict to Specific Class (Optional)
                    </FormLabel>
                    <Select
                      value={field.value === "" ? NO_RESTRICTION_VALUE : field.value}
                      onValueChange={(value) => {
                        field.onChange(value === NO_RESTRICTION_VALUE ? "" : value);
                      }}
                      disabled={isProcessing || loadingClasses}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select a class (optional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_RESTRICTION_VALUE}>No specific class (for any student in my classes)</SelectItem>
                        {myClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.friendlyId})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing || loadingClasses}>
                  {isProcessing ? <Loader2 className="animate-spin" /> : 'Generate Vouchers'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showGeneratedVouchersAlert && generatedVouchersList.length > 0 && lastGeneratedBatchId && (
        <AlertDialog open={showGeneratedVouchersAlert} onOpenChange={setShowGeneratedVouchersAlert}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Vouchers Generated & PDF Downloaded!</AlertDialogTitle>
              <AlertDialogDescription>
                Batch ID: <span className="font-semibold text-primary">{lastGeneratedBatchId}</span>.
                {generatedVouchersList.length} voucher(s) created with {generatedVouchersList[0]?.credits} credits each.
                They will expire on: {generatedVouchersList[0]?.expiryDate ? format(parseISO(generatedVouchersList[0]?.expiryDate), 'PPP') : 'N/A'}.
                {generatedVouchersList[0]?.restrictedToClassName && 
                    ` Restricted to class: "${generatedVouchersList[0].restrictedToClassName}${generatedVouchersList[0].restrictedToFriendlyClassId ? ` (ID: ${generatedVouchersList[0].restrictedToFriendlyClassId})` : ''}".`
                }
                The PDF with printable slips has been automatically downloaded. You can also copy individual codes or re-download below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="my-4 h-[200px] w-full rounded-md border p-3 bg-muted/50">
              <ul className="space-y-2">
                {generatedVouchersList.map((voucher) => (
                  <li key={voucher.id} className="text-sm">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-primary tracking-wider">{voucher.id}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyVoucherCode(voucher.id)} title="Copy code">
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CircleDollarSign className="h-3 w-3"/> Credits: {voucher.credits}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3"/> 
                        Expires: {voucher.expiryDate ? format(parseISO(voucher.expiryDate), 'PPp') : 'N/A'}
                    </div>
                    {voucher.restrictedToClassName && (
                         <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3"/>
                            For Class: {voucher.restrictedToClassName}{voucher.restrictedToFriendlyClassId ? ` (ID: ${voucher.restrictedToFriendlyClassId})` : ''}
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCopyAllVoucherCodes} className="w-full">
                  <Copy className="h-4 w-4 mr-2" /> Copy All Codes
              </Button>
              <Button type="button" variant="outline" onClick={handleReDownloadPDF} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Re-Download Slips PDF
              </Button>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogAction onClick={closeDialogsAndReset}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
