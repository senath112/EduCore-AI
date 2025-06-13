
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';
import type { Auth } from 'firebase/auth'; 

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // The context type already defines deductCreditForAITutor as (amountToDeduct?: number) => Promise<boolean>
  // So, no change needed here to reflect the new signature, it's picked up from the context type.
  return context;
}
