
import type { ReactNode } from 'react';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  // This layout can be customized in the future for teacher-specific navigation or branding.
  // For now, it simply renders the children, inheriting the main application layout.
  return (
    <>
      {children}
    </>
  );
}

    