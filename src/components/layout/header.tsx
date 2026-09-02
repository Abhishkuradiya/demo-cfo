"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserMenu } from './user-menu';
import { useSidebarStore } from '@/store/sidebar-store';
import { Bell, Calendar, RefreshCw, Menu, Star, Filter, ChevronDown, Trash2, Building2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DateRangePicker } from '../ui/date-range-picker';
import { cn } from '@/lib/utils';

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never synced";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

export function Header() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebarStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [syncTime, setSyncTime] = useState("Never synced");
  const lastSyncedRef = useRef<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [tempFromDate, setTempFromDate] = useState<string>('');
  const [tempToDate, setTempToDate] = useState<string>('');

  // Xero connections and organisation switcher state
  const [connections, setConnections] = useState<{ xeroTenantId: string; name: string }[]>([]);
  const [activeXeroTenantId, setActiveXeroTenantId] = useState<string | null>(null);
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Default computed date ranges from API fallback
  const [defaultStart, setDefaultStart] = useState<string | null>(null);
  const [defaultEnd, setDefaultEnd] = useState<string | null>(null);

  // Close switcher and date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowOrgSwitcher(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  const formatDateLabel = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const currentMonthEnd = now.toISOString().slice(0, 10);

  const activeStart = fromDate || defaultStart || currentMonthStart;
  const activeEnd = toDate || defaultEnd || currentMonthEnd;

  const dateRangeLabel = (activeStart && activeEnd)
    ? `${formatDateLabel(activeStart)} – ${formatDateLabel(activeEnd)}`
    : `${formatDateLabel(currentMonthStart)} – ${formatDateLabel(currentMonthEnd)}`;

  const updateUrl = (from: Date, to: Date) => {
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const params = new URLSearchParams(window.location.search);
    params.set('from_date', fromStr);
    params.set('to_date', toStr);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const updateSyncLabel = () => {
    if (lastSyncedRef.current) {
      setSyncTime(formatTimeAgo(lastSyncedRef.current));
    } else {
      setSyncTime("Never synced");
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/xero');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setConnections(data.connections || []);
          setActiveXeroTenantId(data.activeXeroTenantId || null);
          setActiveOrgName(data.organisation || null);
          
          setDefaultStart(data.startDate || null);
          setDefaultEnd(data.endDate || null);
          
          if (data.lastSyncedAt) {
            lastSyncedRef.current = data.lastSyncedAt;
            setSyncTime(formatTimeAgo(data.lastSyncedAt));
          } else {
            lastSyncedRef.current = null;
            setSyncTime("Never synced");
          }
        } else {
          setConnections([]);
          setActiveXeroTenantId(null);
          setActiveOrgName(null);
          setDefaultStart(null);
          setDefaultEnd(null);
          lastSyncedRef.current = null;
          setSyncTime("Never synced");
        }
      }
    } catch (err) { }
  };

  const handleSwitchOrg = async (id: string, name: string) => {
    if (id === activeXeroTenantId) return;
    setIsSwitchingOrg(true);
    setShowOrgSwitcher(false);
    toast.loading(`Switching organization to ${name}...`, { id: "switch-toast" });

    try {
      const res = await fetch('/api/xero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ switchXeroTenantId: id, organisationName: name })
      });

      if (res.ok) {
        toast.success(`Switched to ${name}! Clearing cache and fetching fresh data...`, { id: "switch-toast" });
        setActiveXeroTenantId(id);
        setActiveOrgName(name);
        
        // Dispatch event so other components know connection changed
        window.dispatchEvent(new CustomEvent('xero-sync-complete'));
        
        // Trigger automatic sync for the new organization
        await handleSync();
        
        // Refresh router/server page data
        router.refresh();
      } else {
        toast.error("Failed to switch organization.", { id: "switch-toast" });
      }
    } catch (err) {
      toast.error("Error switching organization.", { id: "switch-toast" });
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    const handleSyncComplete = () => {
      fetchSyncStatus();
    };

    window.addEventListener('xero-sync-complete', handleSyncComplete);
    const interval = setInterval(updateSyncLabel, 15000);

    return () => {
      window.removeEventListener('xero-sync-complete', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  // Custom headers based on route path
  const getHeaderInfo = () => {
    switch (pathname) {
      case '/overview':
      case '/':
        return {
          title: "Xero Analytics",
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
      case '/reports/account-receivable':
      case '/reports/aged-receivables':
      case '/reports/invoice-status-summary':
        return {
          title: "Account Receivable",
          subtitle: "Real-time overview of your outstanding invoices and collections"
        };
      case '/bills':
      case '/reports/account-payable':
      case '/reports/aged-payables':
      case '/reports/bill-status-summary':
        return {
          title: "Account Payable",
          subtitle: "Real-time overview of your vendor bills and payment obligations"
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
          title: "Xero Analytics",
          subtitle: "Real-time overview of your Xero organization"
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  const handleSync = async () => {
    setIsSyncing(true);
    toast.loading("Syncing latest transactions from Xero...", { id: "sync-toast" });

    try {
      const res = await fetch('/api/xero', { method: 'POST' });
      if (res.ok) {
        toast.success("Xero sync completed successfully!", { id: "sync-toast" });
        setSyncTime("Just now");
        window.dispatchEvent(new CustomEvent('xero-sync-complete'));
      } else {
        toast.error("Xero sync failed. Please check credentials.", { id: "sync-toast" });
      }
    } catch (err) {
      toast.error("Error triggering Xero sync.", { id: "sync-toast" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    toast.loading("Clearing dashboard caches...", { id: "cache-toast" });
    try {
      const res = await fetch('/api/xero/clear-cache', { method: 'POST' });
      if (res.ok) {
        toast.success("Cache cleared successfully! Pulling fresh data...", { id: "cache-toast" });
        window.dispatchEvent(new CustomEvent('xero-sync-complete'));
        router.refresh();
      } else {
        toast.error("Failed to clear cache.", { id: "cache-toast" });
      }
    } catch (err) {
      toast.error("Error clearing cache.", { id: "cache-toast" });
    } finally {
      setIsClearingCache(false);
    }
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

        {/* Organisation Switcher */}
        {connections.length > 0 && (
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => !isSwitchingOrg && setShowOrgSwitcher(!showOrgSwitcher)}
              disabled={isSwitchingOrg}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-750 shadow-2xs transition cursor-pointer outline-none h-9.5 disabled:opacity-60"
            >
              {isSwitchingOrg ? (
                <Loader2 className="h-3.5 w-3.5 text-slate-500 animate-spin" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-slate-450" />
              )}
              <span className="truncate max-w-[130px] font-bold text-slate-700">{activeOrgName || "Select Company"}</span>
              {connections.length > 1 && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            </button>

            {showOrgSwitcher && connections.length > 1 && (
              <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Switch Organisation
                </div>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {connections.map((conn) => {
                    const isActive = conn.xeroTenantId === activeXeroTenantId;
                    return (
                      <button
                        key={conn.xeroTenantId}
                        onClick={() => handleSwitchOrg(conn.xeroTenantId, conn.name)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer outline-none ${
                          isActive
                            ? "bg-slate-50 font-bold text-slate-900"
                            : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate pr-2">{conn.name}</span>
                        {isActive && <Check className="h-3.5 w-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date Range Picker for Overview / Reports */}
        {(pathname === '/overview' || isSales || pathname.startsWith('/reports')) && (
          <div className="relative shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer outline-none h-9.5"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>{dateRangeLabel}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", showDatePicker && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 px-1">Quick Select</span>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(now.getFullYear(), now.getMonth(), 1);
                      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      updateUrl(from, to);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const to = new Date(now.getFullYear(), now.getMonth(), 0);
                      updateUrl(from, to);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    Last Month
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                      const to = now;
                      updateUrl(from, to);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    Last 3 Months
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(now.getFullYear(), 0, 1);
                      const to = new Date(now.getFullYear(), 11, 31);
                      updateUrl(from, to);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    This Year
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block px-1">Custom Range</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9.5px] font-bold text-slate-400 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={tempFromDate || activeStart}
                        onChange={(e) => setTempFromDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-bold text-slate-400 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={tempToDate || activeEnd}
                        onChange={(e) => setTempToDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (tempFromDate && tempToDate) {
                        updateUrl(new Date(tempFromDate), new Date(tempToDate));
                        setShowDatePicker(false);
                      }
                    }}
                    className="w-full py-2 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    Apply Date Range
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
          <>
            <button
              onClick={handleClearCache}
              disabled={isClearingCache}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-655 bg-white hover:bg-slate-50 transition disabled:opacity-55 cursor-pointer outline-none shadow-2xs h-9.5"
              title="Clear local database cache"
            >
              <Trash2 className={`h-3.5 w-3.5 ${isClearingCache ? 'animate-pulse text-red-500' : 'text-slate-450'}`} />
              <span>Clear Cache</span>
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary text-xs font-bold text-primary bg-white hover:bg-primary/5 active:bg-primary/10 transition disabled:opacity-50 cursor-pointer outline-none shadow-2xs h-9.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {pathname === '/data-sources' ? 'Sync All' : 'Sync Now'}
            </button>
          </>
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
