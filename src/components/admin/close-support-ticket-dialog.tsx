
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SupportTicketLog } from '@/services/user-service';
import { deleteSupportTicket, sendSupportClosureEmailToUser } from '@/services/user-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Send } from 'lucide-react';

interface CloseSupportTicketDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ticketData: SupportTicketLog | null;
  userEmail: string | null;
  onTicketClosed: () => void;
}

const CloseTicketSchema = z.object({
  adminMessage: z.string().min(10, { message: "Message must be at least 10 characters long." }).max(1000, { message: "Message cannot exceed 1000 characters." }),
});
type CloseTicketFormValues = z.infer<typeof CloseTicketSchema>;

export default function CloseSupportTicketDialog({ 
  isOpen, 
  onOpenChange, 
  ticketData, 
  userEmail, 
  onTicketClosed 
}: CloseSupportTicketDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<CloseTicketFormValues>({
    resolver: zodResolver(CloseTicketSchema),
    defaultValues: {
      adminMessage: '',
    },
  });

  const onSubmit = async (values: CloseTicketFormValues) => {
    if (!ticketData || !userEmail) {
      toast({ variant: "destructive", title: "Error", description: "Ticket data or user email is missing." });
      return;
    }
    setIsProcessing(true);
    try {
      // Step 1: Simulate sending email
      await sendSupportClosureEmailToUser(userEmail, ticketData.supportId, values.adminMessage);
      toast({
        title: "Email Sent (Simulated)",
        description: `A message has been 'sent' to ${userEmail} regarding support ticket ${ticketData.supportId}.`,
      });

      // Step 2: Delete the support ticket
      await deleteSupportTicket(ticketData.supportId);
      toast({
        title: "Ticket Closed & Deleted",
        description: `Support ticket ${ticketData.supportId} has been successfully closed and deleted.`,
      });

      form.reset();
      onTicketClosed(); 
    } catch (error: any) {
      console.error("Error closing support ticket:", error);
      toast({ 
        variant: "destructive", 
        title: "Operation Failed", 
        description: error.message || "Could not close and delete the support ticket." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!ticketData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Support Ticket: {ticketData.supportId}</DialogTitle>
          <DialogDescription>
            Send a final message to the user and delete this ticket. User: {ticketData.userDisplayName || ticketData.userId} ({userEmail || 'No email found'})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="adminMessage"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="adminMessage">Message to User</Label>
                  <FormControl>
                    <Textarea
                      id="adminMessage"
                      placeholder="Enter your closing message to the user..."
                      className="min-h-[100px]"
                      disabled={isProcessing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing || !userEmail}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send & Close Ticket
              </Button>
            </DialogFooter>
             {!userEmail && (
              <p className="text-xs text-destructive text-center pt-2">
                Cannot close ticket: User email is not available.
              </p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
