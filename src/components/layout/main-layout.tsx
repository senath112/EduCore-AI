
import type { ReactNode } from 'react';
import Header from './header';
import Dock from './dock'; // Added

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-col flex-grow pb-24"> {/* Added padding-bottom to avoid overlap */}
        {children}
      </main>
      <Dock />
    </div>
  );
}
