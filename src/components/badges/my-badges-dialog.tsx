
"use client";

import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import BadgeIconRenderer from './badge-icon-renderer';
import { format } from 'date-fns';
import { Award } from 'lucide-react';

interface MyBadgesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MyBadgesDialog({ isOpen, onOpenChange }: MyBadgesDialogProps) {
  const { userProfile } = useAuth();

  const earnedBadgesArray = userProfile?.earnedBadges
    ? Object.values(userProfile.earnedBadges).sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            My Earned Badges
          </DialogTitle>
          <DialogDescription>
            Here are the badges you've collected on your learning journey!
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] my-4 pr-3">
          {earnedBadgesArray.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {earnedBadgesArray.map((badge) => (
                <Card key={badge.badgeId} className="shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3 p-4 space-y-0">
                    <BadgeIconRenderer iconName={badge.iconName} className="h-10 w-10 text-primary" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Earned: {format(new Date(badge.earnedAt), 'PP')}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              You haven't earned any badges yet. Keep learning and exploring!
            </p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
