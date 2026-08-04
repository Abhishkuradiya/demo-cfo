"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserStore, UserProfile } from '@/store/user-store';
import { Permission, hasPermission } from '@/auth/permissions';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
  checkPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, setUser, logout: clearStore } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Perform initial hydration checks/JWT validation
    const token = localStorage.getItem('cfo_auth_token');
    if (!token || !user) {
      clearStore();
    }
    setIsLoading(false);
  }, [user, clearStore]);

  const login = (token: string, profile: UserProfile) => {
    localStorage.setItem('cfo_auth_token', token);
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('cfo_auth_token');
    clearStore();
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
