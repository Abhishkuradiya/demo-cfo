"use client";

import React, { useEffect } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { useThemeStore } from '@/store/theme-store';
import { CommandPalette } from '@/components/common/command-palette';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <CommandPalette />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryProvider>
  );
}
