
import type { ReactNode } from 'react';

export default function ForumTopicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
      {children}
    </div>
  );
}
