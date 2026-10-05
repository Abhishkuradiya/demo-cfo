"use client";

import React, { Suspense } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ConnectorRouteGuard } from './connector-route-guard';

import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isCopilotRoute = pathname?.startsWith('/cfo-copilot');

  if (isCopilotRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#090d16]">
        <Suspense fallback={<div className="h-screen w-screen bg-[#090d16] flex items-center justify-center text-slate-400 font-mono text-sm">Loading CFO Copilot...</div>}>
          <ConnectorRouteGuard>
            {children}
          </ConnectorRouteGuard>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace frame */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar Header */}
        <Suspense fallback={<div className="h-20 border-b border-slate-100 bg-white" />}>
          <Header />
        </Suspense>

        {/* Dynamic page content scrollable area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 bg-background">
          <div className="mx-auto max-w-[1600px] space-y-8">
            <Suspense fallback={<div className="text-xs font-bold text-slate-400 select-none">Loading dashboard contents...</div>}>
              <ConnectorRouteGuard>
                {children}
              </ConnectorRouteGuard>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
