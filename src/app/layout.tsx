
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';
import MainLayout from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";
import CompleteProfileDialog from '@/components/auth/complete-profile-dialog';
import { useAuth } from '@/hooks/use-auth'; // This import is fine at the top level

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EduCore AI',
  description: 'AI-powered multilingual tutoring and concept explanation.',
};

// Create a new Client Component to handle the conditional dialog
function ConditionalProfileDialogClient() {
  "use client"; // Mark this component as a Client Component
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
            {/* Render the new client component here */}
            <ConditionalProfileDialogClient />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
