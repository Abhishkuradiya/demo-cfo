"use client";

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace frame */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar Header */}
        <Header />

        {/* Dynamic page content scrollable area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 bg-background">
          <div className="mx-auto max-w-[1600px] space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
