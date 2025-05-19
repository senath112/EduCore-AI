
"use client";

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
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

interface ViewFlaggedResponseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flaggedResponse: FlaggedResponseLogWithId | null;
}

export default function ViewFlaggedResponseDialog({
  isOpen,
  onOpenChange,
  flaggedResponse,
}: ViewFlaggedResponseDialogProps) {
  if (!flaggedResponse) {
    return null;
  }

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

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {/* Future actions like "Resolve Flag" or "Take Action" could go here */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
