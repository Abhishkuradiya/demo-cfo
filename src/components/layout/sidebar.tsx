"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebar-store';
import { useOrganizationStore, Organization } from '@/store/organization-store';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Users,
  ShoppingBag,
  DollarSign,
  Settings,
  Activity,
  Layers,
  Sparkles,
  Bell,
  Workflow,
  ChevronLeft,
  ChevronRight,
  Database,
  Building,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar, isOpenMobile, setOpenMobile } = useSidebarStore();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganizationStore();

  const sections: NavSection[] = [
    {
      title: 'Core Analytics',
      items: [
        { name: 'Overview', href: '/overview', icon: LayoutDashboard },
        { name: 'Cash Flow', href: '/cash-flow', icon: DollarSign },
        { name: 'Forecast', href: '/forecast', icon: TrendingUp },
      ],
    },
    {
      title: 'Revenue & Sales',
      items: [
        { name: 'Sales', href: '/sales', icon: ShoppingBag },
        { name: 'Revenue', href: '/revenue', icon: Activity },
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Invoices', href: '/invoices', icon: Receipt },
        { name: 'Products', href: '/products', icon: Layers },
      ],
    },
    {
      title: 'Intelligence & Operations',
      items: [
        { name: 'Reports', href: '/reports', icon: Receipt },
        { name: 'AI Insights', href: '/ai-insights', icon: Sparkles },
        { name: 'Alerts', href: '/alerts', icon: Bell },
        { name: 'Automation', href: '/automation', icon: Workflow },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'Organizations', href: '/organizations', icon: Building },
        { name: 'Data Sources', href: '/data-sources', icon: Database },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar-background border-r border-sidebar-border text-sidebar-foreground">
      {/* Header / Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/overview" className="flex items-center gap-2 font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <DollarSign className="h-5 w-5" />
          </div>
          {!isCollapsed && <span className="tracking-tight text-sm md:text-base">Antigravity CFO</span>}
        </Link>
        
        {/* Toggle Collapse on Desktop */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded border bg-card text-muted-foreground hover:text-foreground cursor-pointer outline-none"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Organization Switcher */}
      {!isCollapsed && currentOrganization ? (
        <div className="p-3 border-b border-sidebar-border">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex w-full items-center justify-between gap-2 rounded-md border bg-card p-2 text-left text-xs font-semibold outline-none hover:bg-muted cursor-pointer transition">
                <span className="truncate">{currentOrganization.name}</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded capitalize">
                  {currentOrganization.role}
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-52 rounded-md border bg-card p-1 shadow-md animate-in fade-in-80"
                align="start"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Switch Workspace
                </div>
                {organizations.map((org) => (
                  <DropdownMenu.Item
                    key={org.id}
                    onClick={() => setCurrentOrganization(org)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs outline-none transition cursor-pointer hover:bg-muted",
                      currentOrganization.id === org.id && "bg-primary/5 text-primary font-medium"
                    )}
                  >
                    <span>{org.name}</span>
                    {currentOrganization.id === org.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ) : null}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {section.title}
              </h4>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setOpenMobile(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium outline-none transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                          : "text-muted-foreground"
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:block h-screen shrink-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Radix-free portal trigger logic) */}
      {isOpenMobile ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setOpenMobile(false)}
          />
          {/* Content panel */}
          <div className="relative flex w-64 max-w-xs flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
            {/* Close button inside panel */}
            <div className="absolute top-2 right-2 flex items-center justify-center">
              <button
                onClick={() => setOpenMobile(false)}
                className="h-8 w-8 flex items-center justify-center rounded border bg-card text-muted-foreground hover:text-foreground cursor-pointer outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
