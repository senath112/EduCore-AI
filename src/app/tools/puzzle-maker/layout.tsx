
import type { ReactNode } from 'react';

export default function PuzzleMakerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto p-4 md:p-6 flex-grow flex flex-col">
      {/* This layout can be expanded later if needed for tool-specific sidebars, etc. */}
      {children}
    </div>
  );
}
