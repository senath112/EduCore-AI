
import type { ReactNode } from 'react';
import Header from './header';
import CopyrightYear from './copyright-year'; // Import the new component

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-col flex-grow">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        © <CopyrightYear /> EduCore AI. All rights reserved.
      </footer>
    </div>
  );
}
