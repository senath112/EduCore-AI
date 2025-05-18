
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';
import MainLayout from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";
import CompleteProfileDialog from '@/components/auth/complete-profile-dialog'; // Import the new dialog
import { useAuth } from '@/hooks/use-auth'; // We'll need a client component to use this hook

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

// Client component to conditionally render the dialog
function ConditionalProfileDialog() {
  const { user, promptForUserDetails, setPromptForUserDetails, profileLoading } = useAuth();

  // Don't show the dialog while profile is loading, or if no user
  if (profileLoading || !user) {
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
            <ConditionalProfileDialog /> {/* Conditionally render the dialog here */}
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
