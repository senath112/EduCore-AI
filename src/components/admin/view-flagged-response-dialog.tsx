
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FlaggedResponseLogWithId } from "@/services/user-service";
import { deleteFlaggedResponse } from "@/services/user-service"; // Import delete function
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react"; // Icons for buttons

interface ViewFlaggedResponseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flaggedResponse: FlaggedResponseLogWithId | null;
  onFlagActionCompleted: () => void; // Callback to refresh list and close dialog
}

export default function ViewFlaggedResponseDialog({
  isOpen,
  onOpenChange,
  flaggedResponse,
  onFlagActionCompleted,
}: ViewFlaggedResponseDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!flaggedResponse) {
    return null;
  }

  const handleAcceptFlag = async () => {
    if (!flaggedResponse) return;
    setIsProcessing(true);
    // In a real application, this would trigger a backend process
    // For example: updateFlagStatusInDB(flaggedResponse.id, 'accepted');
    console.log("Flag accepted (simulated):", flaggedResponse.id);
    toast({
      title: "Flag Accepted",
      description: `Flag for message ID ${flaggedResponse.flaggedMessageId} has been marked as accepted (action pending implementation).`,
    });
    // onOpenChange(false); // Close the dialog
    onFlagActionCompleted(); // Signal parent to refresh and close
    setIsProcessing(false);
  };

  const handleIgnoreFlag = async () => {
    if (!flaggedResponse) return;
    setIsProcessing(true);
    try {
      await deleteFlaggedResponse(flaggedResponse.id);
      toast({
        title: "Flag Ignored & Deleted",
        description: `Flag for message ID ${flaggedResponse.flaggedMessageId} has been successfully deleted.`,
      });
      onFlagActionCompleted(); // Signal parent to refresh and close
    } catch (error) {
      console.error("Error deleting flagged response:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the flagged response.",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Flagged Response Details</DialogTitle>
          <DialogDescription>
            Review the details of the flagged AI response and the associated chat context.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 overflow-y-auto pr-2">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="font-semibold text-sm">User:</span>
            <span className="col-span-2 text-sm">{flaggedResponse.userDisplayName || flaggedResponse.userId}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="font-semibold text-sm">Date:</span>
            <span className="col-span-2 text-sm">{format(new Date(flaggedResponse.timestamp), 'PPpp')}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="font-semibold text-sm">Subject:</span>
            <span className="col-span-2 text-sm"><Badge variant="outline">{flaggedResponse.subject}</Badge></span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="font-semibold text-sm">Language:</span>
            <span className="col-span-2 text-sm"><Badge variant="secondary">{flaggedResponse.language}</Badge></span>
          </div>

          <div>
            <h4 className="font-semibold text-md mb-1 mt-3">Flagged AI Message:</h4>
            <p className="text-sm p-3 bg-destructive/10 border border-destructive/30 rounded-md whitespace-pre-wrap">
              {flaggedResponse.flaggedMessageContent}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-md mb-1 mt-3">Chat History Snapshot:</h4>
            <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/50">
              {flaggedResponse.chatHistorySnapshot.map((msg, index) => (
                <div key={index} className={`mb-2 text-sm ${msg.role === 'tutor' ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}`}>
                  <span className="font-semibold capitalize">{msg.role}: </span>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleIgnoreFlag} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Ignore & Delete Flag
          </Button>
          <Button onClick={handleAcceptFlag} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Accept Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
