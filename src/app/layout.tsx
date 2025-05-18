
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';
import MainLayout from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";
// Removed: import CompleteProfileDialog from '@/components/auth/complete-profile-dialog';
// Removed: import { useAuth } from '@/hooks/use-auth';
import ConditionalProfileDialogClient from '@/components/layout/conditional-profile-dialog-client'; // Import the new component

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

// Removed ConditionalProfileDialogClient function definition from here

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
            <ConditionalProfileDialogClient />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
