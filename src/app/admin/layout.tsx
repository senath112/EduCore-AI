
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // This layout can be customized in the future for admin-specific navigation or branding.
  // For now, it simply renders the children, inheriting the main application layout (header, footer).
  return (
    <>
      {children}
    </>
  );
}
