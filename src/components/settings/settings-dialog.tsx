
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
import EditProfileDialog from "./edit-profile-dialog"; // Import the new dialog
import { Button } from "../ui/button";
import { Separator } from '../ui/separator';
import { UserCog } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Application Settings</DialogTitle>
            <DialogDescription>
              Customize your application experience and manage your profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Appearance</h3>
              <ThemeToggle />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2">Account</h3>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setIsEditProfileOpen(true);
                  // Optionally, you could close the main settings dialog here if desired:
                  // onOpenChange(false); 
                }}
              >
                <UserCog className="mr-2 h-5 w-5" />
                Edit Profile Details
              </Button>
               <p className="text-sm text-muted-foreground mt-2 px-1">
                Update your age, A/L facing year, and phone number.
              </p>
            </div>
            
            {/* Add more settings sections here in the future */}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render the EditProfileDialog, controlled by its own state */}
      {isEditProfileOpen && ( // Conditionally render to ensure form resets correctly if profile data changes
        <EditProfileDialog 
          isOpen={isEditProfileOpen} 
          onOpenChange={setIsEditProfileOpen} 
        />
      )}
    </>
  );
}
