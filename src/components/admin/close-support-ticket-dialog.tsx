
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SupportTicketLog } from '@/services/user-service';
import { resolveSupportTicket, sendSupportClosureEmailToUser } from '@/services/user-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Send, MessageSquareText } from 'lucide-react';

interface CloseSupportTicketDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ticketData: SupportTicketLog | null;
  userEmail: string | null;
  onTicketClosed: () => void; // Renamed for clarity, means ticket resolved
}

const ResolveTicketSchema = z.object({
  adminMessage: z.string().min(10, { message: "Resolution message must be at least 10 characters long." }).max(1000, { message: "Message cannot exceed 1000 characters." }),
});
type ResolveTicketFormValues = z.infer<typeof ResolveTicketSchema>;

export default function CloseSupportTicketDialog({ 
  isOpen, 
  onOpenChange, 
  ticketData, 
  userEmail, 
  onTicketClosed 
}: CloseSupportTicketDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<ResolveTicketFormValues>({
    resolver: zodResolver(ResolveTicketSchema),
    defaultValues: {
      adminMessage: '',
    },
  });

  const onSubmit = async (values: ResolveTicketFormValues) => {
    if (!ticketData || !userEmail) {
      toast({ variant: "destructive", title: "Error", description: "Ticket data or user email is missing." });
      return;
    }
    setIsProcessing(true);
    try {
      // Step 1: Update the ticket status to 'Resolved' and save admin message
      await resolveSupportTicket(ticketData.supportId, values.adminMessage);
      toast({
        title: "Ticket Resolved",
        description: `Support ticket ${ticketData.supportId} has been marked as Resolved.`,
      });

      // Step 2: Simulate sending email
      await sendSupportClosureEmailToUser(userEmail, ticketData.supportId, values.adminMessage);
      toast({
        title: "Closure Email Sent (Simulated)",
        description: `A resolution message has been 'sent' to ${userEmail} regarding support ticket ${ticketData.supportId}.`,
      });
      
      form.reset();
      onTicketClosed(); 
    } catch (error: any) {
      console.error("Error resolving support ticket:", error);
      toast({ 
        variant: "destructive", 
        title: "Operation Failed", 
        description: error.message || "Could not resolve the support ticket." 
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
          <DialogTitle>Resolve Support Ticket: {ticketData.supportId}</DialogTitle>
          <DialogDescription>
            User: {ticketData.userDisplayName || ticketData.userId} ({userEmail || 'No email found'}) <br />
            Status: <span className={`font-semibold ${ticketData.status === 'Resolved' ? 'text-green-600' : ticketData.status === 'In Progress' ? 'text-orange-500' : 'text-blue-600'}`}>{ticketData.status}</span>
          </DialogDescription>
        </DialogHeader>

        {ticketData.userComment && (
          <div className="my-3">
            <Label htmlFor="userCommentDisplay" className="font-semibold flex items-center gap-2 text-sm">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" /> User's Original Comment:
            </Label>
            <ScrollArea className="h-[80px] w-full rounded-md border p-2 mt-1 bg-muted/30 text-sm text-foreground">
                {ticketData.userComment}
            </ScrollArea>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="adminMessage"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="adminMessage">Resolution Message to User</Label>
                  <FormControl>
                    <Textarea
                      id="adminMessage"
                      placeholder="Enter your resolution message to the user..."
                      className="min-h-[100px]"
                      disabled={isProcessing || ticketData.status === 'Resolved'}
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
              <Button type="submit" disabled={isProcessing || !userEmail || ticketData.status === 'Resolved'}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send & Resolve Ticket
              </Button>
            </DialogFooter>
             {!userEmail && (
              <p className="text-xs text-destructive text-center pt-2">
                Cannot resolve ticket: User email is not available.
              </p>
            )}
            {ticketData.status === 'Resolved' && (
                <p className="text-xs text-green-600 text-center pt-2">
                    This ticket has already been resolved.
                </p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
