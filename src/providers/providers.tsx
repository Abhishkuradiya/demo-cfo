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
    
    const applyTheme = (currentTheme: string) => {
      root.classList.remove('light', 'dark');
      
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(currentTheme);
      }
    };

    applyTheme(theme);

    // Sync if system theme preferences change
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        applyTheme('system');
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme]);

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
