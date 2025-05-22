
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ThemeToggle from "./theme-toggle";
import EditProfileDialog from "./edit-profile-dialog";
import { Button } from "../ui/button";
import { Separator } from '../ui/separator';
import { UserCog, Palette, BookOpen } from 'lucide-react'; // Added Palette, BookOpen
import { useSettings, type LearningMode } from '@/hooks/use-settings'; // Import LearningMode
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { learningMode, setLearningMode } = useSettings();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Application Settings</DialogTitle>
            <DialogDescription>
              Customize your application experience, manage your profile, and set learning preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </h3>
              <ThemeToggle />
            </div>

            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Learning Mode
              </h3>
              <RadioGroup
                value={learningMode}
                onValueChange={(value) => setLearningMode(value as LearningMode)}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personality" id="mode-personality" />
                  <Label htmlFor="mode-personality" className="font-normal">Personality Tutor Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">Engage with AI tutors who have distinct personalities based on the subject.</p>
                
                <div className="flex items-center space-x-2 pt-2">
                  <RadioGroupItem value="deep" id="mode-deep" />
                  <Label htmlFor="mode-deep" className="font-normal">Deep Learner Mode</Label>
                </div>
                 <p className="text-xs text-muted-foreground pl-6">Get direct, in-depth technical explanations without tutor personas.</p>
              </RadioGroup>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Account
              </h3>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setIsEditProfileOpen(true);
                }}
              >
                <UserCog className="mr-2 h-5 w-5" />
                Edit Profile Details
              </Button>
               <p className="text-sm text-muted-foreground mt-2 px-1">
                Update your age, A/L facing year, and phone number.
              </p>
            </div>
            
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditProfileOpen && (
        <EditProfileDialog 
          isOpen={isEditProfileOpen} 
          onOpenChange={setIsEditProfileOpen} 
        />
      )}
    </>
  );
}
