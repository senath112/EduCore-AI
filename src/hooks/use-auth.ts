
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';
import type { Auth } from 'firebase/auth'; // Ensure Auth type is available if needed by consumers

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
