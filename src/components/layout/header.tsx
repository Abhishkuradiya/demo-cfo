"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';
import { useSidebarStore } from '@/store/sidebar-store';
import { Bell, Calendar, RefreshCw, Menu, Star, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function Header() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebarStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState("2 min ago");
  
  // Custom headers based on route path
  const getHeaderInfo = () => {
    switch (pathname) {
      case '/overview':
      case '/':
        return {
          title: "Xero Dashboard",
          subtitle: "Real-time overview of your Xero organization"
        };
      case '/sales':
        return {
          title: "Sales Dashboard",
          subtitle: "Real-time consolidated sales overview across all connected sources"
        };
      case '/cash-flow':
        return {
          title: "Cash Flow Analytics",
          subtitle: "Real-time monitor of receipts, payments, and liquidity"
        };
      case '/forecast':
        return {
          title: "Financial Forecast",
          subtitle: "Projected cash runway, burn rate, and scenario modeling"
        };
      case '/revenue':
        return {
          title: "Revenue Insights",
          subtitle: "Analyze revenue patterns and growth projections"
        };
      case '/customers':
        return {
          title: "Customers & Contacts",
          subtitle: "Manage accounts receivable and customer invoice logs"
        };
      case '/invoices':
        return {
          title: "Invoices Management",
          subtitle: "Draft, track, and reconcile user invoices"
        };
      case '/products':
        return {
          title: "Inventory & Products",
          subtitle: "Stock valuation, units sold, and pricing models"
        };
      case '/reports':
        return {
          title: "Financial Reports",
          subtitle: "Balance sheets, cash flow statements, and profit & loss logs"
        };
      case '/ai-insights':
        return {
          title: "AI CFO Insights",
          subtitle: "Machine learning anomalies, forecasts, and suggestions"
        };
      case '/alerts':
        return {
          title: "Threshold Alerts",
          subtitle: "Custom notifications for financial health parameters"
        };
      case '/automation':
        return {
          title: "Automation Workflows",
          subtitle: "Configure automatic bank reconciliation and email reminders"
        };
      case '/data-sources':
        return {
          title: "Connectors",
          subtitle: "Connect and manage your data sources. All your business data in one place."
        };
      case '/settings':
        return {
          title: "Configuration Settings",
          subtitle: "Manage company configurations, tax rules, and user accesses"
        };
      default:
        return {
          title: "Xero Dashboard",
          subtitle: "Real-time overview of your Xero organization"
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  const handleSync = () => {
    setIsSyncing(true);
    toast.loading("Syncing latest transactions from Xero...", { id: "sync-toast" });
    
    setTimeout(() => {
      setIsSyncing(false);
      setSyncTime("2 min ago");
      toast.success("Xero sync completed! Loaded 25,430 records.", { id: "sync-toast" });
    }, 1200);
  };

  const isSales = pathname === '/sales';

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-100 bg-white px-6 md:px-8">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger menu */}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 md:hidden cursor-pointer outline-none transition"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Title and Subtitle */}
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {isSales && (
              <button className="outline-none">
                <Star className="h-[15px] w-[15px] text-slate-350 hover:text-amber-400 cursor-pointer transition fill-none" />
              </button>
            )}
          </div>
          <p className="text-[12px] md:text-xs text-slate-400 font-normal mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range Picker */}
        <button className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer outline-none h-9.5">
          <span>01 Apr 2024 - 30 Apr 2024</span>
          <Calendar className="h-4 w-4 text-slate-450" />
        </button>

        {/* 1. Comparison dropdown for Sales dashboard */}
        {isSales && (
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-500 shadow-2xs transition cursor-pointer outline-none h-9.5">
            <span>Compare: <span className="text-slate-700 font-bold">Mar 1 - Mar 31, 2024</span></span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}

        {/* Sync Status Section */}
        <div className="flex items-center gap-1.5 select-none h-9.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
          <span className="text-[11px] text-slate-400 font-semibold leading-none">Updated {syncTime}</span>
        </div>

        {!isSales && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary text-xs font-bold text-primary bg-white hover:bg-primary/5 active:bg-primary/10 transition disabled:opacity-50 cursor-pointer outline-none shadow-2xs h-9.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {pathname === '/data-sources' ? 'Sync All' : 'Sync Now'}
          </button>
        )}

        {/* Funnel/Filter Icon for Sales dashboard */}
        {isSales && (
          <button className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer outline-none transition shadow-2xs">
            <Filter className="h-4 w-4 text-slate-450" />
          </button>
        )}

        {/* Notifications Popover */}
        <button className="relative flex h-9.5 w-9.5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 cursor-pointer outline-none transition shadow-2xs">
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8.5px] font-bold text-white border border-white">
            {isSales ? 12 : 5}
          </span>
        </button>

        <span className="h-6 w-px bg-slate-250/70 my-auto mx-1" />

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
