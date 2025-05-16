import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/contexts/settings-context';
import MainLayout from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SettingsProvider>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </SettingsProvider>
      </body>
    </html>
  );
}
