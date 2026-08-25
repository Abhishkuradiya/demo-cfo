"use client";
 
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Database,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Settings,
  MoreVertical,
  ExternalLink,
  FileText,
  PlayCircle,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  FolderSync,
  X,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Info,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
 
interface Connector {
  id: string;
  name: string;
  subtitle: string;
  status: 'Connected' | 'Disconnected' | 'Not Connected';
  lastSync: string;
  syncDesc: string;
  syncedTypes: string;
  records: string;
  logoColor: string;
  logo: React.ReactNode;
}
 
export default function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState<'All' | 'Connected' | 'Available' | 'Disconnected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [xeroData, setXeroData] = useState<any>(null);
 
  // Xero Modal & Credentials Configuration States
  const [isXeroModalOpen, setIsXeroModalOpen] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [oauthStep, setOauthStep] = useState<'idle' | 'redirecting'>('idle');
  const isAuthFlowActive = useRef(false); // Track if user is actively authenticating
  const hasShownConnectionToast = useRef(false); // Prevent duplicate toasts
 
  const [xeroConfig, setXeroConfig] = useState({
    clientId: '',
    clientSecret: '',
    launcherUrl: '',
    redirectUri: 'http://localhost:3000/api/xero/callback'
  });
 
  // Polling effect to dynamically update connection state from the database
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/xero');
        if (res.ok) {
          const data = await res.json();
          setXeroData(data);
          if (data.connected) {
            setConnectors(prev => {
              const isReconnecting = isAuthFlowActive.current;
              
              // Only show toast if user was actively authenticating (clicked Save & Authenticate)
              if (isReconnecting && !hasShownConnectionToast.current) {
                hasShownConnectionToast.current = true;
                isAuthFlowActive.current = false;
                setIsXeroModalOpen(false);
                setOauthStep('idle');
                toast.success(`Xero connected/reconnected successfully to ${data.organisation}!`);
              }
              
              return prev.map(c => {
                if (c.id === 'xero') {
                  return {
                    ...c,
                    subtitle: data.organisation,
                    status: 'Connected',
                    lastSync: 'Just now',
                    syncDesc: 'Auto sync enabled',
                    records: data.records.toLocaleString(),
                    syncedTypes: '4 / 14'
                  };
                }
                return c;
              });
            });
          } else {
            setXeroData(null);
            hasShownConnectionToast.current = false; // Reset so future connections can toast
            setConnectors(prev =>
              prev.map(c => {
                if (c.id === 'xero' && c.status === 'Connected') {
                  return {
                    ...c,
                    subtitle: 'Not connected',
                    status: 'Not Connected',
                    lastSync: '─',
                    syncDesc: 'Never synced',
                    records: '0',
                    syncedTypes: '0 / 14'
                  };
                }
                return c;
              })
            );
          }
        }
      } catch (err) {}
    };
 
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);
 
  // State-driven connectors for real-time interactive toggling
  // Initially, Xero is not connected - no dummy data!
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: 'xero',
      name: 'Xero',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 14',
      records: '0',
      logoColor: 'bg-[#00b7e2]',
      logo: (
        <span className="font-sans text-[11px] font-light tracking-tighter text-white lowercase">xero</span>
      )
    }
    /*
    ,
    {
      id: 'shopify',
      name: 'Shopify',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 10',
      records: '0',
      logoColor: 'bg-[#96bf48]',
      logo: (
        <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.8 6.4c-.2-.6-.7-.9-1.3-1l-3.3-.5c-.2 0-.4-.2-.4-.4l-.8-3c-.1-.6-.6-1.1-1.2-1.1s-1.1.5-1.2 1.1l-.8 3c0 .2-.2.4-.4.4l-3.3.5c-.6.1-1.1.5-1.3 1L3.1 19c-.2.6 0 1.2.5 1.6.4.4.9.6 1.5.6h13.8c.6 0 1.1-.2 1.5-.6.5-.4.7-1 .5-1.6l-2.1-12.6z" />
        </svg>
      )
    },
    {
      id: 'amazon',
      name: 'Amazon Seller Central',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 12',
      records: '0',
      logoColor: 'bg-[#ff9900]',
      logo: (
        <span className="text-[10px] font-black text-black">a</span>
      )
    },
    {
      id: 'stripe',
      name: 'Stripe',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 8',
      records: '0',
      logoColor: 'bg-[#635bff]',
      logo: (
        <span className="font-extrabold text-[12px] text-white">S</span>
      )
    },
    {
      id: 'zoho',
      name: 'Zoho Books',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 10',
      records: '0',
      logoColor: 'bg-[#e51a27]',
      logo: (
        <span className="font-black text-[12px] text-white">Z</span>
      )
    },
    {
      id: 'qbo',
      name: 'QuickBooks Online',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 12',
      records: '0',
      logoColor: 'bg-[#2ca01c]',
      logo: (
        <span className="font-bold text-[12px] text-white">qb</span>
      )
    },
    {
      id: 'woo',
      name: 'WooCommerce',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 8',
      records: '0',
      logoColor: 'bg-[#96588a]',
      logo: (
        <span className="font-extrabold text-[11px] text-white">W</span>
      )
    },
    {
      id: 'ga4',
      name: 'Google Analytics 4',
      subtitle: 'Not connected',
      status: 'Not Connected',
      lastSync: '─',
      syncDesc: 'Never synced',
      syncedTypes: '0 / 6',
      records: '0',
      logoColor: 'bg-[#e37400]',
      logo: (
        <span className="font-bold text-[11px] text-white">G4</span>
      )
    }
    */
  ]);
 
  // Toggle other connections, redirect Xero clicks to modal
  const handleActionClick = async (id: string, currentStatus: string) => {
    if (id === 'xero') {
      // Load saved credentials from database when opening modal
      try {
        const res = await fetch('/api/xero/credentials');
        if (res.ok) {
          const data = await res.json();
          if (data.clientId) {
            setXeroConfig(prev => ({
              ...prev,
              clientId: data.clientId || '',
              clientSecret: data.clientSecret || ''
            }));
          }
        }
      } catch (err) {
        // Silently fail - user can still enter credentials manually
      }
      setIsXeroModalOpen(true);
    } else {
      toast.info(`Configuring connection parameter for ${id.toUpperCase()} is mocked. Only Xero connection flow is active for user developer app configurations.`);
    }
  };
 
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
 
  // Initiate Real OAuth Connection
  const startOAuthConnection = async () => {
    if (!xeroConfig.clientId.trim() || !xeroConfig.clientSecret.trim()) {
      toast.error('Please enter the Client ID and Client Secret generated from Xero developer app portal.');
      return;
    }
    
    try {
      // Save client credentials to database first
      const saveRes = await fetch('/api/xero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: xeroConfig.clientId,
          clientSecret: xeroConfig.clientSecret
        })
      });
 
      if (!saveRes.ok) {
        toast.error('Failed to save Xero client configuration.');
        return;
      }
 
      // Set modal to waiting state and mark auth flow as active
      setOauthStep('redirecting');
      isAuthFlowActive.current = true;
      hasShownConnectionToast.current = false;
 
      // Open new tab to local Next.js redirect handler
      window.open('/api/xero/redirect', '_blank');
      
      toast.info('Xero Login screen opened in a new tab. Please complete authentication and select your organization.');
    } catch (err) {
      toast.error('Error initiating Xero OAuth flow.');
    }
  };

  const quickReconnect = () => {
    setOauthStep('redirecting');
    isAuthFlowActive.current = true;
    hasShownConnectionToast.current = false;
    window.open('/api/xero/redirect', '_blank');
    toast.info('Reconnecting with your saved Xero developer application credentials...');
  };
 
  const disconnectXero = async () => {
    try {
      const res = await fetch('/api/xero', {
        method: 'DELETE'
      });
      if (res.ok) {
        setConnectors(prev =>
          prev.map(c => {
            if (c.id === 'xero') {
              return {
                ...c,
                subtitle: 'Not connected',
                status: 'Not Connected',
                lastSync: '─',
                syncDesc: 'Never synced',
                records: '0',
                syncedTypes: '0 / 14'
              };
            }
            return c;
          })
         );
         setXeroConfig(prev => ({ ...prev, clientId: '', clientSecret: '' }));
         setIsXeroModalOpen(false);
         toast.success('Xero integration disconnected and database cache cleared.');
       } else {
         toast.error('Failed to disconnect Xero from integration platform.');
       }
     } catch (err) {
       toast.error('Error contacting integration platform to disconnect.');
     }
  };
 
  // Trigger general sync process
  const triggerSyncAll = async () => {
    const isConnected = connectors.find(c => c.id === 'xero')?.status === 'Connected';
    if (!isConnected) {
      toast.error('Please connect Xero before starting data synchronization.');
      return;
    }
 
    setIsSyncingAll(true);
    toast.promise(
      (async () => {
        const res = await fetch('/api/xero', {
          method: 'POST'
        });
        setIsSyncingAll(false);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Sync failed');
        }
        
        const data = await res.json() as { counts: Record<string, number> };
        // Refresh list data immediately
        const totalRecords = Object.values(data.counts).reduce((a: number, b: number) => a + b, 0);
        
        setConnectors(prev =>
          prev.map(c => {
            if (c.id === 'xero') {
              return {
                ...c,
                lastSync: 'Just now',
                records: totalRecords.toLocaleString()
              };
            }
            return c;
          })
        );
        return `Sync successful! Synced ${totalRecords} records across database schemas.`;
      })(),
      {
        loading: 'Syncing data with Xero API...',
        success: (msg) => msg,
        error: (err) => err.message || 'Synchronization failed.'
      }
    );
  };
 
  // Count stats based on connector state
  const stats = useMemo(() => {
    const total = connectors.length;
    const connected = connectors.filter(c => c.status === 'Connected').length;
    const failed = connectors.filter(c => c.status === 'Disconnected').length;
    const pct = total > 0 ? ((connected / total) * 100).toFixed(1) : '0';
    return { total, connected, failed, pct };
  }, [connectors]);
 
  // Filtered connectors list
  const filteredConnectors = useMemo(() => {
    return connectors.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'Connected') return matchesSearch && c.status === 'Connected';
      if (activeTab === 'Disconnected') return matchesSearch && c.status === 'Disconnected';
      if (activeTab === 'Available') return matchesSearch && c.status === 'Not Connected';
      return matchesSearch;
    });
  }, [connectors, activeTab, searchQuery]);
 
  return (
    <div className="space-y-6 max-w-full pb-10">
      {/* 1. Sub Navigation Tabs & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200/80 pb-0.5 select-none w-full gap-4">
        {/* Pills */}
        <div className="flex gap-6">
          {([
            { id: 'All', label: 'All Connectors' },
            { id: 'Connected', label: 'Connected' },
            { id: 'Available', label: 'Available' },
            { id: 'Disconnected', label: 'Disconnected' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-1 pb-3 text-[12.5px] font-semibold transition outline-none cursor-pointer border-b-2 -mb-[2px]",
                activeTab === tab.id
                  ? "border-[#0064eb] text-[#0064eb] font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-650"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
 
        {/* Actions Toolbar */}
        <div className="flex items-center gap-2.5 pb-2.5 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search connectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-8.5 pr-3 py-1.5 text-[10.5px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 transition h-8"
            />
          </div>
 
          <button
            onClick={() => toast.success("Filters popover active")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200/80 text-[10.5px] font-bold text-slate-650 hover:bg-slate-50 h-8 cursor-pointer outline-none"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-450" />
            <span>Filters</span>
          </button>
 
          <button
            onClick={() => toast.success("Add Connector catalog opened")}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0064eb] hover:bg-[#0052c2] text-[10.5px] font-bold text-white h-8 cursor-pointer outline-none shadow-3xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5 text-blue-100" />
            <span>Add Connector</span>
          </button>
        </div>
      </div>
 
      {/* 2. Summary Cards 1x6 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 select-none">
        {[
          { title: 'Total Connectors', val: stats.total, sub: 'All time', icon: <Database className="h-4.5 w-4.5 text-[#0064eb]" />, bg: 'bg-blue-50 border-blue-100/50' },
          { title: 'Connected', val: stats.connected, sub: `${stats.pct}% of total`, icon: <Link2 className="h-4.5 w-4.5 text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-100/50' },
          { title: 'Sync Successful', val: stats.connected > 0 ? '100.0%' : '0.0%', sub: 'Last 30 days', icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-100/50' },
          { title: 'Failed Sync', val: stats.failed, sub: 'Last 30 days', icon: <AlertTriangle className="h-4.5 w-4.5 text-red-500" />, bg: 'bg-red-50 border-red-100/50' },
          { title: 'Data Sources', val: stats.connected > 0 ? '4' : '0', sub: 'Across all connectors', icon: <Layers className="h-4.5 w-4.5 text-purple-500" />, bg: 'bg-purple-50 border-purple-100/50' },
          { title: 'Last Sync', val: stats.connected > 0 ? 'Just now' : '─', sub: 'All connectors', icon: <Clock className="h-4.5 w-4.5 text-blue-500" />, bg: 'bg-blue-50 border-blue-100/50' }
        ].map((stat, idx) => (
          <div key={idx} className="flex items-center gap-3.5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 h-[96px]">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-3xs", stat.bg)}>
              {stat.icon}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider truncate">{stat.title}</span>
              <h4 className="text-[17px] font-extrabold text-slate-850 tracking-tight leading-none mt-1.5 truncate">{stat.val}</h4>
              <p className="text-[9.5px] font-bold text-slate-455 mt-1.5 leading-none whitespace-nowrap truncate">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>
 
      {/* 3. Split Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Section: My Connectors Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[500px]">
          <div className="flex flex-col pb-3 mb-2 border-b border-slate-100 select-none">
            <h3 className="text-[13.5px] font-bold text-slate-800">My Connectors</h3>
          </div>
 
          <div className="flex-1 overflow-x-auto no-scrollbar py-0.5">
            <table className="w-full text-left border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase py-2.5">
                  <th className="py-2.5 px-2">Connector</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">Last Sync</th>
                  <th className="py-2.5 px-2">Data Synced</th>
                  <th className="py-2.5 px-2 text-right">Records</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredConnectors.length > 0 ? (
                  filteredConnectors.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      {/* Logo and Label */}
                      <td className="py-3 px-2 font-bold text-slate-700">
                        <div className="flex items-center gap-2.5 min-w-[150px]">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-3xs border border-white/10", row.logoColor)}>
                            {row.logo}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11.5px] text-slate-800 font-bold leading-tight truncate">{row.name}</span>
                            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">{row.subtitle}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status badge pill */}
                      <td className="py-3 px-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold border",
                          row.status === 'Connected' && "bg-emerald-50/70 text-emerald-600 border-emerald-100",
                          row.status === 'Disconnected' && "bg-red-50/70 text-red-500 border-red-100",
                          row.status === 'Not Connected' && "bg-slate-50 text-slate-400 border-slate-150"
                        )}>
                          <span className={cn(
                            "h-1 w-1 rounded-full shrink-0",
                            row.status === 'Connected' && "bg-emerald-500",
                            row.status === 'Disconnected' && "bg-red-500",
                            row.status === 'Not Connected' && "bg-slate-350"
                          )} />
                          {row.status}
                        </span>
                      </td>
 
                      {/* Last Sync Info */}
                      <td className="py-3 px-2 text-slate-500 font-bold">
                        <div className="flex items-center gap-1.5 min-w-[110px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-slate-750 font-bold truncate">{row.lastSync}</span>
                            <span className="text-[8.5px] text-slate-400 font-medium leading-none mt-0.5 truncate">{row.syncDesc}</span>
                          </div>
                        </div>
                      </td>
 
                      {/* Synced Ratio */}
                      <td className="py-3 px-2 text-slate-500 font-bold">
                        <div className="flex items-center gap-1.5">
                          <FolderSync className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-slate-750 font-bold">{row.syncedTypes}</span>
                            <span className="text-[8.5px] text-slate-400 font-medium leading-none mt-0.5">Data Types</span>
                          </div>
                        </div>
                      </td>
 
                      {/* Total Records */}
                      <td className="py-3 px-2 text-right font-extrabold text-slate-800 text-[11px] shrink-0">
                        <div className="flex flex-col">
                          <span>{row.records}</span>
                          <span className="text-[8.5px] text-slate-400 font-medium leading-none mt-0.5">Records</span>
                        </div>
                      </td>
 
                      {/* Connect / Settings Button */}
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5 select-none">
                          <button
                            onClick={() => handleActionClick(row.id, row.status)}
                            className={cn(
                              "px-3 py-1 rounded text-[9.5px] font-bold border transition cursor-pointer outline-none h-7 shrink-0",
                              row.status === 'Connected'
                                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-[#0064eb]"
                            )}
                          >
                            {row.status === 'Connected' ? 'Settings' : 'Connect'}
                          </button>
                          
                          <button
                            onClick={() => toast.success(`Opening options for ${row.name}`)}
                            className="p-1 rounded text-slate-400 hover:text-slate-650 outline-none cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold select-none">
                      No connectors matched the search queries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
 
        {/* Right Section: Connector Health & FAQ widgets */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between select-none">
          {/* Card 1: Connector Health Radial Chart */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[210px]">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50 shrink-0">
              <h4 className="text-[11.5px] font-bold text-slate-800">Connector Health</h4>
              <button onClick={() => toast.success("Opening detailed health diagnostic reports")} className="text-[9.5px] font-bold text-slate-400 hover:text-slate-650 flex items-center gap-0.5">
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
 
            <div className="flex items-center gap-4 flex-1 py-1.5">
              {/* SVG Health Ring Chart on Left */}
              <div className="h-20 w-20 relative flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100" strokeWidth="3" stroke="currentColor" />
                  {/* Active Percentage Circle */}
                  <circle cx="18" cy="18" r="16" fill="none" className={cn(stats.connected > 0 ? "text-emerald-500" : "text-slate-300")} strokeWidth="3" strokeDasharray={stats.connected > 0 ? `${stats.pct}, 100` : "0, 100"} strokeLinecap="round" stroke="currentColor" />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[13.5px] font-extrabold text-slate-800 leading-none">{stats.connected > 0 ? `${stats.pct}%` : '0%'}</div>
                  <div className={cn("text-[7.5px] font-bold leading-none mt-1", stats.connected > 0 ? "text-emerald-500" : "text-slate-400")}>{stats.connected > 0 ? 'Healthy' : 'Inactive'}</div>
                </div>
              </div>
 
              {/* Legends on Right */}
              <div className="flex-1 space-y-1.5 text-[9px] font-bold">
                <div className="flex justify-between items-center text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Healthy</span>
                  </div>
                  <span className="text-slate-850">{stats.connected}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Warning</span>
                  </div>
                  <span className="text-slate-850">0</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Error</span>
                  </div>
                  <span className="text-slate-850">{stats.failed}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Disconnected</span>
                  </div>
                  <span className="text-slate-850">{stats.total - stats.connected}</span>
                </div>
              </div>
            </div>
          </div>
 
          {/* Card 2: Common Data Types */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[210px]">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50 shrink-0">
              <h4 className="text-[11.5px] font-bold text-slate-800">Common Data Types</h4>
              <button onClick={() => toast.success("Redirecting to data schema tables")} className="text-[9.5px] font-bold text-slate-400 hover:text-slate-650 flex items-center gap-0.5">
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
 
            <div className="flex-1 space-y-1.5 py-2 overflow-y-auto no-scrollbar text-[9px] font-bold text-slate-500">
              {[
                { name: 'Invoices', count: xeroData?.connected ? (xeroData.invoices || 0).toLocaleString() : '0' },
                { name: 'Customers', count: xeroData?.connected ? (xeroData.contacts || 0).toLocaleString() : '0' },
                { name: 'Products', count: xeroData?.connected ? (xeroData.accounts || 0).toLocaleString() : '0' },
                { name: 'Payments', count: xeroData?.connected ? (xeroData.payments || 0).toLocaleString() : '0' },
                { name: 'Orders', count: xeroData?.connected ? ((xeroData.bankTransactions || 0) + (xeroData.prepayments || 0) + (xeroData.overpayments || 0)).toLocaleString() : '0' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                  <span>{item.name}</span>
                  <span className="text-slate-800 font-extrabold">{item.count} <span className="text-slate-400 font-medium">records</span></span>
                </div>
              ))}
            </div>
          </div>
 
          {/* Card 3: Need Help FAQ links */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[210px]">
            <div className="pb-1 border-b border-slate-50 shrink-0">
              <h4 className="text-[11.5px] font-bold text-slate-800">Need Help?</h4>
              <p className="text-[8.5px] text-slate-400 font-semibold mt-0.5">Learn how to connect your data sources</p>
            </div>
 
            <div className="flex-1 flex flex-col justify-center space-y-2.5 py-1 text-[10px] font-bold">
              <Link href="/docs" className="flex items-center justify-between text-[#0064eb] hover:underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>View Documentation</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-blue-450" />
              </Link>
              <Link href="/video-guide" className="flex items-center justify-between text-[#0064eb] hover:underline">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-blue-500" />
                  <span>Watch Video Guide</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-blue-450" />
              </Link>
              <Link href="/support" className="flex items-center justify-between text-[#0064eb] hover:underline">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span>Contact Support</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-blue-450" />
              </Link>
            </div>
          </div>
        </div>
      </div>
 
      {/* ======================================================================= */}
      {/* 5. INTERACTIVE DYNAMIC XERO CONFIGURATION MODAL & OAUTH SYSTEM LAYOUTS */}
      {/* ======================================================================= */}
      {isXeroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsXeroModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 outline-none cursor-pointer z-10 p-1 hover:bg-slate-50 rounded-full"
            >
              <X className="h-4.5 w-4.5" />
            </button>
 
            {/* Left Form Column (60% width) */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto no-scrollbar flex flex-col space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00b7e2] shrink-0 text-white shadow-sm font-sans font-light text-[12px] lowercase select-none">
                  xero
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800 leading-tight">Xero Developer Configuration</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Setup application credentials to sync organisation records.</p>
                </div>
              </div>
 
              {/* Fields */}
              <div className="space-y-4 text-[10.5px] font-bold text-slate-700">
                {/* Connections Badge count */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Connection Status</span>
                  </div>
                  <span className="text-[9px] bg-slate-200 text-slate-650 px-2 py-0.5 rounded-full">
                    {connectors.find(c => c.id === 'xero')?.status === 'Connected' ? '1 of 5 connections active' : '0 of 5 connections active'}
                  </span>
                </div>
 
                {/* Redirect URI (OAuth Callback) - READ-ONLY & COPYABLE */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Redirect URI (OAuth Callback)</span>
                    <span className="text-[9px] text-[#0064eb] font-semibold">Copy this URL</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={xeroConfig.redirectUri}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-3 pr-12 py-1.5 text-[10px] font-medium text-slate-500 focus:outline-none h-8 select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(xeroConfig.redirectUri)}
                      className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-650 rounded cursor-pointer outline-none"
                      title="Copy Redirect URI"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[8.5px] text-slate-400 font-semibold leading-normal">
                    Copy this callback URL and paste it under **Redirect URIs** inside your Xero Developer Portal app settings.
                  </p>
                </div>
 
                {/* Client ID - USER INPUT */}
                <div className="space-y-1.5">
                  <span>Client ID</span>
                  <div className="relative flex items-center">
                    <input
                      type={showClientId ? 'text' : 'password'}
                      value={xeroConfig.clientId}
                      onChange={(e) => setXeroConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Enter Client ID (obtained from Xero Developer Portal)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-1.5 text-[10px] font-medium tracking-wide focus:outline-none focus:border-primary/50 h-8"
                    />
                    <button 
                      onClick={() => setShowClientId(!showClientId)}
                      className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-650 rounded cursor-pointer outline-none"
                    >
                      {showClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
 
                {/* Client Secret - USER INPUT */}
                <div className="space-y-1.5">
                  <span>Client Secret</span>
                  <div className="relative flex items-center">
                    <input
                      type={showClientSecret ? 'text' : 'password'}
                      value={xeroConfig.clientSecret}
                      onChange={(e) => setXeroConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder="Enter Client Secret (generated in Xero Developer Portal)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-1.5 text-[10px] font-medium tracking-wide focus:outline-none focus:border-primary/50 h-8"
                    />
                    <button 
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-650 rounded cursor-pointer outline-none"
                    >
                      {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
 
                {/* Launcher Login URL (Optional) */}
                <div className="space-y-1.5">
                  <span>Login URL for launcher (optional)</span>
                  <input
                    type="text"
                    value={xeroConfig.launcherUrl}
                    onChange={(e) => setXeroConfig(prev => ({ ...prev, launcherUrl: e.target.value }))}
                    placeholder="Enter launcher login redirection URL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-medium focus:outline-none focus:border-primary/50 h-8"
                  />
                  <p className="text-[8.5px] text-slate-400 font-semibold mt-0.5 leading-none">
                    URL will be used by launcher to log in to app. <span className="text-[#0064eb] cursor-pointer hover:underline">Find out about launcher</span>
                  </p>
                </div>
              </div>
            </div>
 
            {/* Right Guide Column (40% width) */}
            <div className="w-full md:w-[320px] bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-150 p-6 md:p-8 flex flex-col justify-between select-none">
              <div className="space-y-4">
                <div className="pb-1 border-b border-slate-150">
                  <h4 className="text-[11.5px] font-bold text-slate-800">Connection Checklist</h4>
                  <p className="text-[8.5px] text-slate-400 font-semibold mt-0.5">Steps to configure Xero API successfully</p>
                </div>
 
                <div className="space-y-3.5 text-[9.5px] font-semibold text-slate-500 leading-relaxed">
                  <div className="flex gap-2">
                    <span className="h-4.5 w-4.5 rounded-full bg-slate-200/80 text-slate-650 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>Go to the <Link href="https://developer.xero.com/" target="_blank" className="text-[#0064eb] font-bold hover:underline flex inline-flex items-center gap-0.5">Xero Developer Console <ExternalLink className="h-2.5 w-2.5" /></Link> and sign in.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="h-4.5 w-4.5 rounded-full bg-slate-200/80 text-slate-650 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>Click <strong className="font-bold text-slate-700">New App</strong> and configure a <strong className="font-bold text-slate-700">Web App</strong> pipeline.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="h-4.5 w-4.5 rounded-full bg-slate-200/80 text-slate-650 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>Copy the <strong className="font-bold text-slate-700">Redirect URI</strong> shown on the left and paste it into your Xero Developer App settings.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="h-4.5 w-4.5 rounded-full bg-slate-200/80 text-slate-650 font-bold flex items-center justify-center shrink-0">4</span>
                    <p>Generate app credentials. Paste the <strong className="font-bold text-slate-700">Client ID</strong> and <strong className="font-bold text-slate-700">Client Secret</strong> into the inputs form.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="h-4.5 w-4.5 rounded-full bg-slate-200/80 text-slate-650 font-bold flex items-center justify-center shrink-0">5</span>
                    <p>Click <strong className="font-bold text-slate-700">Save & Authenticate</strong> to login to your live Xero dashboard organization.</p>
                  </div>
                </div>
              </div>
 
              {/* Bottom Action buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={startOAuthConnection}
                  className="w-full text-center py-2 px-3 rounded-lg bg-[#0064eb] hover:bg-[#0052c2] text-[10.5px] font-bold text-white shadow-3xs cursor-pointer outline-none transition"
                >
                  Save & Authenticate
                </button>

                {connectors.find(c => c.id === 'xero')?.status === 'Connected' && (
                  <button
                    onClick={quickReconnect}
                    className="w-full text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10.5px] font-bold text-white shadow-3xs cursor-pointer outline-none transition"
                  >
                    Quick Reconnect (Same Credentials)
                  </button>
                )}
 
                {connectors.find(c => c.id === 'xero')?.status === 'Connected' && (
                  <button
                    onClick={disconnectXero}
                    className="w-full text-center py-2 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[10.5px] font-bold text-red-650 cursor-pointer outline-none transition"
                  >
                    Disconnect Integration
                  </button>
                )}
 
                <button
                  onClick={() => setIsXeroModalOpen(false)}
                  className="w-full text-center py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10.5px] font-bold text-slate-600 cursor-pointer outline-none transition"
                >
                  Cancel
                </button>
              </div>
            </div>
 
            {/* ======================================================================= */}
            {/* OAUTH MOCK POPUPS (SIMULATING PIPELINE LOGIN & CONSENT) */}
            {/* ======================================================================= */}
            {oauthStep === 'redirecting' && (
              <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00b7e2] text-white font-sans text-[14px] lowercase animate-bounce select-none">
                  xero
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#00b7e2]" />
                    <span className="text-[12px] font-bold text-slate-700">Waiting for Xero authorization...</span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-semibold mt-1">Please complete authentication in the new browser tab.</p>
                </div>
                <button
                  onClick={() => setOauthStep('idle')}
                  className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg cursor-pointer outline-none transition mt-2 shadow-3xs"
                >
                  Cancel
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
