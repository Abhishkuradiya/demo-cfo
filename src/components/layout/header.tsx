"use client";

import React from 'react';
import { Breadcrumb } from './breadcrumb';
import { UserMenu } from './user-menu';
import { useSidebarStore } from '@/store/sidebar-store';
import { useNotificationStore } from '@/store/notification-store';
import { Bell, Search, Menu, Sparkles, Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, Theme } from '@/store/theme-store';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';

export function Header() {
  const { setOpenMobile } = useSidebarStore();
  const { theme, setTheme } = useThemeStore();
  const { notifications, getUnreadCount, markAllAsRead } = useNotificationStore();
  
  const unreadCount = getUnreadCount();

  const handleToggleTheme = (mode: Theme) => {
    setTheme(mode);
    toast.success(`Theme set to ${mode}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu */}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground md:hidden cursor-pointer outline-none"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global Search Button Placeholder (Clicking triggers Command Palette in future) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="flex h-9 w-40 lg:w-60 items-center justify-between rounded-md border bg-muted/50 hover:bg-muted text-muted-foreground px-3 text-xs outline-none cursor-pointer select-none transition"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search...
          </span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[9px] font-medium opacity-100">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Theme Toggler */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer outline-none transition">
              {theme === 'light' ? (
                <Sun className="h-4.5 w-4.5" />
              ) : theme === 'dark' ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Monitor className="h-4.5 w-4.5" />
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-32 rounded-md border bg-card p-1 shadow-md animate-in fade-in-80"
              align="end"
            >
              <DropdownMenu.Item
                onClick={() => handleToggleTheme('light')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer outline-none hover:bg-muted text-foreground"
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                Light
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => handleToggleTheme('dark')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer outline-none hover:bg-muted text-foreground"
              >
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                Dark
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => handleToggleTheme('system')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer outline-none hover:bg-muted text-foreground"
              >
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                System
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Notifications Popover */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer outline-none transition">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-pulse">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 w-80 rounded-lg border bg-card p-1 shadow-md animate-in fade-in-80"
              align="end"
              sideOffset={8}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-xs font-semibold">Alert Center</span>
                {unreadCount > 0 ? (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Mark all as read
                  </button>
                ) : null}
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No active threshold alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenu.Item
                      key={notif.id}
                      className="flex flex-col gap-0.5 px-3 py-2 text-xs outline-none hover:bg-muted rounded transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-foreground">{notif.title}</span>
                        <span className="text-[9px] text-muted-foreground font-normal">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">{notif.message}</p>
                    </DropdownMenu.Item>
                  ))
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <span className="h-6 w-px bg-border my-auto mx-1" />

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
