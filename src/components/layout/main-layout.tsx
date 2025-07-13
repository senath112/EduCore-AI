
import type { ReactNode } from 'react';
import Header from './header';
import Dock from './dock'; 
import Footer from './footer'; // Import the new Footer component

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-col flex-grow pb-24"> 
        {children}
      </main>
      <Dock />
      <Footer /> {/* Add the Footer component here */}
    </div>
  );
}
