"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRequiredConnector } from '@/lib/connector-guard';
import { toast } from 'sonner';
import { Lock, ShieldAlert } from 'lucide-react';

interface ConnectorRouteGuardProps {
  children: React.ReactNode;
}

export function ConnectorRouteGuard({ children }: ConnectorRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/connectors/status');
        if (res.ok && isMounted) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch connector status for route guard:', err);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const required = getRequiredConnector(pathname);

  // If status is loaded and route requires a connector that is NOT connected
  const isLocked = Boolean(
    required && status && status[required.connector] === false
  );

  useEffect(() => {
    if (isLocked && required) {
      toast.error(`Access Restricted: ${required.name} is not connected`, {
        description: `Redirecting you to the Connectors management page to connect your account.`,
        id: `guard-locked-${required.connector}`
      });
      router.replace(`/data-sources?connector=${required.connector}&error=locked`);
    }
  }, [isLocked, required, router]);

  // If redirecting, render a clean locked splash screen instead of flashing content
  if (isLocked) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg animate-pulse">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-white">Connector Not Connected</h3>
          <p className="text-xs text-slate-400">
            {required?.name} connector is currently not connected or requires re-authentication. Redirecting to Connectors page...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Redirecting to Connectors Page</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
