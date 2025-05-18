
"use client";

import { useAuth } from '@/hooks/use-auth';
import CompleteProfileDialog from '@/components/auth/complete-profile-dialog';

export default function ConditionalProfileDialogClient() {
  const { user, promptForUserDetails, setPromptForUserDetails, profileLoading } = useAuth();

  // Don't show the dialog while profile is loading, or if no user, or if not prompting
  if (profileLoading || !user || !promptForUserDetails) {
    return null;
  }

  return (
    <CompleteProfileDialog
      isOpen={promptForUserDetails}
      onOpenChange={setPromptForUserDetails}
    />
  );
}
