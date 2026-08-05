"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebar-store';
import {
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  ShoppingBag,
  Landmark,
  BookOpen,
  Users,
  Package,
  FileText,
  LineChart,
  Database,
  Cpu,
  Settings,
  ChevronDown,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  hasDropdown?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar, isOpenMobile, setOpenMobile } = useSidebarStore();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
 
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/woosh.mp3');
      audio.volume = 0.25;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
  }, []);
 
  const playWoosh = () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch (e) {}
    }
  };

  const toggleSubmenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const menuItems: MenuItem[] = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Xero Dashboard', href: '/overview', icon: LayoutGrid, badge: 'New' },
    { name: 'Sales Dashboard', href: '/sales', icon: BarChart3 },
    { name: 'Purchases', href: '/revenue', icon: ShoppingBag, hasDropdown: true },
    { name: 'Banking', href: '/cash-flow', icon: Landmark, hasDropdown: true },
    { name: 'Accounting', href: '/reports', icon: BookOpen, hasDropdown: true },
    { name: 'Contacts', href: '/customers', icon: Users, hasDropdown: true },
    { name: 'Inventory', href: '/products', icon: Package, hasDropdown: true },
    { name: 'Reports', href: '/reports', icon: FileText, hasDropdown: true },
    { name: 'Analytics', href: '/revenue', icon: LineChart, hasDropdown: true },
    { name: 'Connectors', href: '/data-sources', icon: Database },
    { name: 'Automation', href: '/automation', icon: Cpu, hasDropdown: true },
    { name: 'Settings', href: '/settings', icon: Settings, hasDropdown: true },
  ];

  const sidebarContent = (
    <div className={cn(
      "flex h-full flex-col bg-sidebar-background text-sidebar-foreground select-none border-r border-sidebar-border no-scrollbar",
      isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
    )}>
      {/* Brand Header */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-sidebar-border/30",
        isCollapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <div 
          onClick={isCollapsed ? toggleSidebar : undefined}
          className={cn("flex items-center gap-3 font-semibold text-white", isCollapsed && "cursor-pointer")}
          title={isCollapsed ? "Expand Sidebar" : undefined}
        >
          {/* Cyan Circular Xero-style logo */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00b7e2] shrink-0 shadow-sm hover:scale-105 transition-transform duration-200">
            <span className="font-sans text-[13px] font-light tracking-tighter text-white lowercase">xero</span>
          </div>
          {!isCollapsed && (
            <Link href="/overview" className="text-[15px] font-semibold tracking-tight text-white">
              Virtual CFO
            </Link>
          )}
        </div>
        
        {/* Toggle Collapse for Desktop */}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md border border-sidebar-border/40 bg-sidebar-accent/30 text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent transition cursor-pointer outline-none"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
      </div>
 
      {/* Navigation Menu List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Exact match for active styling
          const isActive = pathname === item.href && (item.name === 'Overview' ? pathname === '/overview' : true);
 
          if (isCollapsed) {
            return (
              <div 
                key={item.name} 
                className="py-0.5 relative"
                onMouseEnter={() => {
                  setHoveredItem(item.name);
                  playWoosh();
                }}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpenMobile(false)}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-lg mx-auto transition-all duration-200 outline-none hover:bg-sidebar-accent hover:text-white",
                    isActive ? "bg-[#133863] text-white" : "text-sidebar-foreground/80"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.75 bg-[#00b7e2] rounded-r" />
                  )}
                  <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isActive ? "text-[#00b7e2]" : "text-sidebar-foreground/60")} />
                </Link>
 
                {/* Swipe-up Left-to-Right Animated Tooltip Popup */}
                {hoveredItem === item.name && (
                  <div className="absolute left-[54px] top-1/2 z-50 pointer-events-none whitespace-nowrap animate-tooltip-swipe">
                    <div className="bg-[#0b1329]/95 backdrop-blur-xs text-white text-[11.5px] font-bold py-1.5 px-3.5 rounded-lg border border-slate-700/50 shadow-md flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00b7e2]" />
                      <span>{item.name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
 
          return (
            <div key={item.name} className="space-y-0.5">
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.hasDropdown && !isCollapsed) {
                    e.preventDefault();
                    toggleSubmenu(item.name);
                  }
                  setOpenMobile(false);
                }}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[13px] font-normal transition-all duration-200 outline-none hover:bg-sidebar-accent hover:text-white",
                  isActive
                    ? "bg-[#133863] text-white font-medium shadow-sm border-l-3 border-[#00b7e2]"
                    : "text-sidebar-foreground/80"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isActive ? "text-[#00b7e2]" : "text-sidebar-foreground/60")} />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[9px] font-semibold bg-[#22c55e]/90 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                      {item.badge}
                    </span>
                  )}
                  {item.hasDropdown && (
                    <ChevronDown className={cn("h-3 w-3 text-sidebar-foreground/40 transition-transform duration-200", expandedMenus[item.name] && "rotate-180")} />
                  )}
                </div>
              </Link>
              
              {/* Dropdown Menu Sub-items mock rendering for realism */}
              {item.hasDropdown && expandedMenus[item.name] && (
                <div className="pl-11 pr-2 py-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                  <Link href={item.href} className="block py-1.5 text-[12px] text-sidebar-foreground/60 hover:text-white transition">Dashboard</Link>
                  <Link href={item.href} className="block py-1.5 text-[12px] text-sidebar-foreground/60 hover:text-white transition">Detailed Transactions</Link>
                  <Link href={item.href} className="block py-1.5 text-[12px] text-sidebar-foreground/60 hover:text-white transition">Analytics & Logs</Link>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Blocks (Connected, Plan & Support) */}
      {!isCollapsed && (
        <div className="p-4 space-y-3.5 border-t border-sidebar-border/30 bg-black/10 shrink-0">
          {/* Plan Card */}
          <div className="rounded-lg border border-sidebar-border/35 bg-sidebar-accent/10 p-3 space-y-2">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-sidebar-foreground/40">Plan: Premium</div>
              <div className="text-[11px] text-sidebar-foreground/70 truncate">Renews on 12 May 2024</div>
            </div>
            <button className="w-full text-center py-1.5 px-2.5 rounded border border-sidebar-border/50 text-[11px] font-medium text-sidebar-foreground hover:text-white hover:bg-sidebar-accent hover:border-white transition cursor-pointer outline-none">
              Manage Subscription
            </button>
          </div>

          {/* Help Block */}
          <Link href="/support" className="flex items-center gap-2.5 text-[12px] text-sidebar-foreground/70 hover:text-white transition py-1">
            <HelpCircle className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
            <span>Need Help? Go to Support</span>
          </Link>
        </div>
      )}
 
      {/* Dynamic Keyframe Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tooltipSwipe {
          0% {
            opacity: 0;
            transform: translate(0px, -35%) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate(8px, -50%) scale(1);
          }
        }
        .animate-tooltip-swipe {
          animation: tooltipSwipe 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:block h-screen shrink-0 transition-all duration-300",
        isCollapsed ? "w-16 overflow-visible" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setOpenMobile(false)}
          />
          {/* Content panel */}
          <div className="relative flex w-64 max-w-xs flex-col animate-in slide-in-from-left duration-250">
            {sidebarContent}
            {/* Close button inside panel */}
            <div className="absolute top-3.5 right-3.5 flex items-center justify-center z-50">
              <button
                onClick={() => setOpenMobile(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-sidebar-border bg-sidebar-background text-sidebar-foreground hover:text-white cursor-pointer outline-none"
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
