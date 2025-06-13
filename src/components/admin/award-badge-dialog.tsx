
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfileWithId } from '@/services/user-service';
import { awardBadge } from '@/services/user-service';
import { ALL_BADGES, type BadgeDefinition } from '@/lib/badge-constants';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Award as AwardIcon } from 'lucide-react';

interface AwardBadgeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userToAward: UserProfileWithId | null;
  onBadgeAwarded: () => void;
}

const AwardBadgeFormSchema = z.object({
  selectedBadgeId: z.string().min(1, { message: "Please select a badge to award." }),
});
type AwardBadgeFormValues = z.infer<typeof AwardBadgeFormSchema>;

export default function AwardBadgeDialog({
  isOpen,
  onOpenChange,
  userToAward,
  onBadgeAwarded,
}: AwardBadgeDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableBadges, setAvailableBadges] = useState<BadgeDefinition[]>([]);

  const form = useForm<AwardBadgeFormValues>({
    resolver: zodResolver(AwardBadgeFormSchema),
    defaultValues: {
      selectedBadgeId: '',
    },
  });

  useEffect(() => {
    if (userToAward && isOpen) {
      const earnedBadgeIds = Object.keys(userToAward.earnedBadges || {});
      const unearnedBadges = ALL_BADGES.filter(badge => !earnedBadgeIds.includes(badge.id));
      setAvailableBadges(unearnedBadges);
      form.reset({ selectedBadgeId: '' }); // Reset form when dialog opens or user changes
    }
  }, [userToAward, isOpen, form]);

  const onSubmit = async (values: AwardBadgeFormValues) => {
    if (!userToAward || !values.selectedBadgeId) {
      toast({ variant: "destructive", title: "Error", description: "User or badge not selected." });
      return;
    }
    setIsLoading(true);
    try {
      const wasBadgeAwarded = await awardBadge(userToAward.id, values.selectedBadgeId);
      if (wasBadgeAwarded) {
        const awardedBadge = ALL_BADGES.find(b => b.id === values.selectedBadgeId);
        toast({ title: "Badge Awarded!", description: `${awardedBadge?.name || 'Badge'} awarded to ${userToAward.displayName || userToAward.email}.` });
      } else {
        toast({ title: "Badge Info", description: "User already has this badge or an error occurred.", variant: "default" });
      }
      onBadgeAwarded(); // This will refresh the user list & close dialog via parent
    } catch (error: any) {
      console.error("Error awarding badge:", error);
      toast({ variant: "destructive", title: "Failed to Award Badge", description: error.message || "Could not award the badge." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userToAward) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AwardIcon className="h-5 w-5" />
            Award Badge to {userToAward.displayName || userToAward.email}
          </DialogTitle>
          <DialogDescription>
            Select a badge to manually award to this user. Only unearned badges are shown.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="selectedBadgeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Badge</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || availableBadges.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={availableBadges.length === 0 ? "No unearned badges" : "Choose a badge..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBadges.length > 0 ? (
                        availableBadges.map(badge => (
                          <SelectItem key={badge.id} value={badge.id}>
                            {badge.name} - ({badge.description.substring(0, 30)}...)
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-badges" disabled>User has all badges or no badges defined.</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || availableBadges.length === 0}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm Award Badge'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
