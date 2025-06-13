
import type { ReactNode } from 'react';

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto p-4 md:p-6 flex-grow flex flex-col">
      {/* This layout can be expanded later if needed for planner-specific sidebars, etc. */}
      {children}
    </div>
  );
}
