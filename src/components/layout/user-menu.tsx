"use client";

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import { useAuth } from '@/providers/auth-provider';
import { LogOut, User, Settings, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-3 rounded-full p-1 text-left outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
          <Avatar.Root className="inline-flex h-9 w-9 select-none items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {user.avatarUrl ? (
              <Avatar.Image
                className="h-full w-full rounded-full object-cover"
                src={user.avatarUrl}
                alt={user.name}
              />
            ) : null}
            <Avatar.Fallback className="h-full w-full flex items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </Avatar.Fallback>
          </Avatar.Root>
          <div className="hidden md:block">
            <p className="text-xs font-semibold leading-none">{user.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user.role}</p>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-56 rounded-lg border bg-card p-1 shadow-md animate-in fade-in-80 slide-in-from-top-1"
          align="end"
          sideOffset={8}
        >
          <div className="px-2 py-1.5 border-b mb-1">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition cursor-pointer hover:bg-muted text-foreground"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition cursor-pointer hover:bg-muted text-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition cursor-pointer hover:bg-muted text-foreground"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          <DropdownMenu.Item
            onClick={logout}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive outline-none transition cursor-pointer hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
