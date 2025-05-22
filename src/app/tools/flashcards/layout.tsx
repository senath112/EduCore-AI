
import type { ReactNode } from 'react';

export default function FlashcardsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto p-4 md:p-6 flex-grow flex flex-col">
      {children}
    </div>
  );
}
