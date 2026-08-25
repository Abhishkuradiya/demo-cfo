'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  FileText, 
  FileSpreadsheet, 
  ChevronDown, 
  SlidersHorizontal,
  RefreshCw, 
  BookOpen,
  Clock,
  Building,
  HelpCircle,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Users,
  UserPlus,
  FileDown,
  FileUp,
  MoreVertical,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/common/page-container';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ContactItem {
  id: string;
  name: string;
  type: 'Customer' | 'Supplier';
  email: string;
  phone: string;
  outstanding: number;
}

interface ContactsData {
  connected: boolean;
  summary: {
    customers: number;
    suppliers: number;
    totalOutstanding: number;
    arTotal: number;
    apTotal: number;
  };
  contacts: ContactItem[];
  meta: {
    currency: string;
    calculatedAt: string;
  };
}

export default function ContactsPage() {
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  
  const [data, setData] = useState<ContactsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs & Search & Filters
  const [activeTab, setActiveTab] = useState<'All' | 'Customer' | 'Supplier'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('All');
  const [contactGroupFilter, setContactGroupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/contacts?date=${date}`);
      if (!res.ok) {
        throw new Error('Failed to load Contacts Statement');
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load Contacts Statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [date]);

  const currencyCode = data?.meta?.currency || 'USD';

  const getCurrencySymbol = (code: string) => {
    try {
      const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
      return parts.find(p => p.type === 'currency')?.value || '';
    } catch {
      return code === 'GBP' ? '£' : (code === 'EUR' ? '€' : (code === 'INR' ? '₹' : '$'));
    }
  };

  const currencySymbol = getCurrencySymbol(currencyCode);

  const formatAmount = (val: number) => {
    const prefix = val < 0 ? '-' : '';
    const absVal = Math.abs(val);
    return `${prefix}${currencySymbol}${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  const getFilteredContacts = () => {
    if (!data || !data.contacts) return [];
    return data.contacts.filter(c => {
      // 1. Tab match
      let matchTab = true;
      if (activeTab !== 'All') {
        matchTab = c.type === activeTab;
      }

      // 2. Search match
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Dropdown Type Filter
      let matchTypeFilter = true;
      if (contactTypeFilter !== 'All') {
        matchTypeFilter = c.type === contactTypeFilter;
      }

      // 4. Payment Status Filter
      let matchPayment = true;
      if (paymentStatusFilter === 'Overdue') {
        matchPayment = Math.abs(c.outstanding) > 1000; // Mock overdue definition
      } else if (paymentStatusFilter === 'Paid') {
        matchPayment = c.outstanding === 0;
      }

      return matchTab && matchSearch && matchTypeFilter && matchPayment;
    });
  };

  const filteredContacts = getFilteredContacts();
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / itemsPerPage));
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ECharts Donuts Configs
  const outstandingByTypeOption = {
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${currencySymbol}${params.value.toLocaleString()} (${params.percent}%)`
    },
    legend: { show: false },
    series: [
      {
        name: 'Outstanding',
        type: 'pie',
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.summary?.totalOutstanding || 0;
            return `${currencySymbol}${sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}\nTotal Outstanding`;
          },
          textStyle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: [
          { value: data?.summary?.arTotal || 0, name: 'Customers', itemStyle: { color: '#8b5cf6' } },
          { value: data?.summary?.apTotal || 0, name: 'Suppliers', itemStyle: { color: '#3b82f6' } }
        ]
      }
    ]
  };

  const distributionOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} contacts ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#64748b' } },
    series: [
      {
        name: 'Contact Types',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.contacts?.length || 0;
            return `${sum}\nTotal Contacts`;
          },
          textStyle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: [
          { value: data?.summary?.customers || 0, name: 'Customers', itemStyle: { color: '#8b5cf6' } },
          { value: data?.summary?.suppliers || 0, name: 'Suppliers', itemStyle: { color: '#3b82f6' } }
        ]
      }
    ]
  };

  // Top Customers and Suppliers lists
  const getTopCustomers = () => {
    if (!data || !data.contacts) return [];
    return data.contacts
      .filter(c => c.type === 'Customer' && c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 4);
  };

  const getTopSuppliers = () => {
    if (!data || !data.contacts) return [];
    return data.contacts
      .filter(c => c.type === 'Supplier' && c.outstanding < 0)
      .sort((a, b) => a.outstanding - b.outstanding) // Negative values, so smaller means higher absolute payable
      .slice(0, 4);
  };

  const topCustomers = getTopCustomers();
  const topSuppliers = getTopSuppliers();

  return (
    <PageContainer>
      {/* ─── Breadcrumbs ─── */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium select-none mb-3">
        <Link href="/overview" className="hover:text-slate-600 text-slate-400 transition">Dashboard</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <Link href="/reports" className="hover:text-slate-600 text-slate-400 transition">Accounting</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <span className="text-slate-600 font-semibold">Contacts</span>
      </div>

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Contacts</h1>
            <HelpCircle className="h-4 w-4 text-slate-350 hover:text-slate-500 cursor-pointer transition" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Manage your customers, suppliers and track outstanding balances.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          {/* As at selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:bg-slate-50/85 transition">
            <span className="text-xs font-semibold text-slate-500">As at:</span>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-250 bg-white hover:bg-emerald-50/20 text-emerald-600 transition cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50/20 text-purple-600 transition cursor-pointer">
            <FileUp className="h-3.5 w-3.5" />
            <span>Import Contacts</span>
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-3 select-none text-[11px] font-semibold text-slate-500">
        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Contact Type</span>
          <select 
            value={contactTypeFilter}
            onChange={(e) => setContactTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All Contacts</option>
            <option value="Customer">Customers</option>
            <option value="Supplier">Suppliers</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Contact Group</span>
          <select 
            value={contactGroupFilter}
            onChange={(e) => setContactGroupFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All Groups</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Status</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="Active">Active</option>
            <option value="All">All</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Payment Status</span>
          <select 
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All</option>
            <option value="Overdue">Overdue</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 w-[160px] md:w-[200px] ml-auto">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Search</span>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 w-full focus:bg-white focus:border-slate-350 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* ─── Error handling ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 flex items-start gap-3 select-none">
          <AlertCircle className="h-5 w-5 text-red-555 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-red-800">Unable to load Contacts Statement</h4>
            <p className="text-xs text-red-650 font-medium">{error}</p>
            <button 
              onClick={fetchContacts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Skeleton Loader ─── */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 h-96 animate-pulse" />
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 h-96 animate-pulse" />
          </div>
        </div>
      )}

      {/* ─── Main Dynamic Cockpit ─── */}
      {!loading && !error && data && data.connected !== false && (
        <>
          {/* Cards metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 select-none">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-3.5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customers</span>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{data.summary.customers}</h3>
                  <span className="text-[9.5px] font-semibold text-slate-450">Active customers</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100/50 text-purple-500 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '45%' }} />
                </div>
                <Link href="#" onClick={(e) => { e.preventDefault(); setActiveTab('Customer'); }} className="text-[10.5px] font-bold text-blue-600 hover:underline block pt-1">
                  View all customers &rarr;
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-3.5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suppliers</span>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{data.summary.suppliers}</h3>
                  <span className="text-[9.5px] font-semibold text-slate-450">Active suppliers</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100/50 text-blue-500 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '54%' }} />
                </div>
                <Link href="#" onClick={(e) => { e.preventDefault(); setActiveTab('Supplier'); }} className="text-[10.5px] font-bold text-blue-600 hover:underline block pt-1">
                  View all suppliers &rarr;
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-3.5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding</span>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{formatAmount(data.summary.totalOutstanding)}</h3>
                  <span className="text-[9.5px] font-semibold text-slate-450">Across all customers & suppliers</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100/50 text-purple-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '70%' }} />
                </div>
                <Link href="#" className="text-[10.5px] font-bold text-blue-600 hover:underline block pt-1">
                  View outstanding &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Table and Right panels layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Left table contacts card */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 select-none">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-slate-850 tracking-wider uppercase">Contacts Overview</h3>
                  <span className="text-[9.5px] text-slate-400 font-semibold">Showing {filteredContacts.length} contacts</span>
                </div>
                <button 
                  onClick={() => { setActiveTab('All'); setSearchTerm(''); }}
                  className="px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100 hover:bg-blue-50 rounded-lg cursor-pointer transition"
                >
                  View All
                </button>
              </div>

              {/* Tabs selector */}
              <div className="flex gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-400 select-none">
                <button 
                  onClick={() => { setActiveTab('All'); setCurrentPage(1); }}
                  className={cn("pb-1.5 px-1 border-b-2 cursor-pointer transition", activeTab === 'All' ? "border-purple-600 text-slate-800 font-bold" : "border-transparent hover:text-slate-600")}
                >
                  All Contacts
                </button>
                <button 
                  onClick={() => { setActiveTab('Customer'); setCurrentPage(1); }}
                  className={cn("pb-1.5 px-1 border-b-2 cursor-pointer transition", activeTab === 'Customer' ? "border-purple-600 text-slate-800 font-bold" : "border-transparent hover:text-slate-600")}
                >
                  Customers
                </button>
                <button 
                  onClick={() => { setActiveTab('Supplier'); setCurrentPage(1); }}
                  className={cn("pb-1.5 px-1 border-b-2 cursor-pointer transition", activeTab === 'Supplier' ? "border-purple-600 text-slate-800 font-bold" : "border-transparent hover:text-slate-600")}
                >
                  Suppliers
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-semibold text-slate-650 text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold tracking-wider uppercase bg-slate-50/50">
                      <th className="py-2.5 px-3">Contact Name</th>
                      <th className="py-2.5 px-3">Contact Type</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Outstanding</th>
                      <th className="py-2.5 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {paginatedContacts.map((c, index) => (
                      <tr key={index} className="hover:bg-slate-50/40 transition">
                        <td className="py-3.5 px-3 flex items-center gap-2.5">
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white shadow-2xs border border-white",
                            c.type === 'Customer' ? "bg-emerald-500" : "bg-blue-500"
                          )}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-805 font-bold">{c.name}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={cn(
                            "px-2 py-0.75 rounded-md text-[9.5px] font-bold border",
                            c.type === 'Customer' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-blue-50 border-blue-100 text-blue-600"
                          )}>
                            {c.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium truncate max-w-[140px]">{c.email}</td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium font-mono">{c.phone}</td>
                        <td className={cn("py-3.5 px-3 text-right font-bold font-mono", c.outstanding >= 0 ? "text-purple-600" : "text-red-550")}>
                          {formatAmount(c.outstanding)}
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-400 hover:text-slate-600 transition cursor-pointer">
                          <MoreVertical className="h-4 w-4 mx-auto" />
                        </td>
                      </tr>
                    ))}

                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-bold italic">
                          No customer or supplier contacts match search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 select-none">
                  <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} entries</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1 border border-slate-200 bg-white rounded-md text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-slate-700">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 border border-slate-200 bg-white rounded-md text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right widgets column */}
            <div className="lg:col-span-4 space-y-5">
              {/* Outstanding by Type donut */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between select-none">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Outstanding by Type</h4>
                <div className="h-[180px] w-full relative">
                  <ReactECharts option={outstandingByTypeOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-slate-500 pt-3 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-purple-500" /><span>Customers</span></div>
                    <span className="text-slate-805 font-bold">{formatAmount(data.summary.arTotal)} ({data.summary.totalOutstanding > 0 ? Math.round((data.summary.arTotal / data.summary.totalOutstanding) * 100) : 0}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-blue-500" /><span>Suppliers</span></div>
                    <span className="text-slate-805 font-bold">{formatAmount(data.summary.apTotal)} ({data.summary.totalOutstanding > 0 ? Math.round((data.summary.apTotal / data.summary.totalOutstanding) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-sm space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold">
                  <button className="flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <div className="flex items-center gap-2"><UserPlus className="h-3.5 w-3.5 text-slate-400" /><span>Add New Customer</span></div>
                    <span className="text-slate-400">&rarr;</span>
                  </button>
                  <button className="flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <div className="flex items-center gap-2"><UserPlus className="h-3.5 w-3.5 text-slate-400" /><span>Add New Supplier</span></div>
                    <span className="text-slate-400">&rarr;</span>
                  </button>
                  <button className="flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <div className="flex items-center gap-2"><FileUp className="h-3.5 w-3.5 text-slate-400" /><span>Import Contacts</span></div>
                    <span className="text-slate-400">&rarr;</span>
                  </button>
                  <button className="flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <div className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5 text-slate-400" /><span>Export Contacts</span></div>
                    <span className="text-slate-400">&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom ECharts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 select-none">
            {/* Contact Types Distribution */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Contact Types Distribution</span>
              <div className="h-[180px] w-full relative">
                <ReactECharts option={distributionOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Top Customers list */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Top Customers by Outstanding</span><Link href="#" className="text-[9.5px] font-bold text-blue-600 hover:underline">View All</Link></div>
                <div className="space-y-3 text-xs font-semibold text-slate-600">
                  {topCustomers.map((c, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-100 font-extrabold text-[10px] text-slate-500 flex items-center justify-center">{idx + 1}</span><span className="text-slate-805 font-bold truncate max-w-[120px]">{c.name}</span></div>
                        <span className="text-purple-650 font-bold font-mono">{formatAmount(c.outstanding)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, Math.round((c.outstanding / data.summary.arTotal) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 block italic py-4">No active customer balances</span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Suppliers list */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Top Suppliers by Outstanding</span><Link href="#" className="text-[9.5px] font-bold text-blue-600 hover:underline">View All</Link></div>
                <div className="space-y-3 text-xs font-semibold text-slate-600">
                  {topSuppliers.map((c, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-100 font-extrabold text-[10px] text-slate-500 flex items-center justify-center">{idx + 1}</span><span className="text-slate-805 font-bold truncate max-w-[120px]">{c.name}</span></div>
                        <span className="text-red-550 font-bold font-mono">{formatAmount(c.outstanding)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-550 rounded-full" style={{ width: `${Math.min(100, Math.round((Math.abs(c.outstanding) / data.summary.apTotal) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                  {topSuppliers.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 block italic py-4">No active supplier balances</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Xero Disconnected State ─── */}
      {data && data.connected === false && (
        <div className="flex flex-col items-center justify-center text-center select-none py-20 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-8 mt-6">
          <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-450 mb-4 animate-pulse">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-slate-800 mb-1.5">Xero Organization Disconnected</h2>
          <p className="text-xs text-slate-500 max-w-[340px] leading-relaxed mb-6">
            Please connect your Xero organization under credentials in Data Sources to compile and view your Customer & Contacts.
          </p>
          <Link href="/data-sources" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
            Go to Data Sources
          </Link>
        </div>
      )}

      {/* ─── Footer Notes Section ─── */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 select-none text-[11px] font-semibold text-slate-500/85">
        <div className="flex items-center gap-2 mb-3 text-slate-700">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold">Report Notes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed pl-1.5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.75"><Clock className="h-3.5 w-3.5 text-slate-400" /><span>Generated automatically from Xero</span></div>
            <div className="flex items-center gap-1.75"><Building className="h-3.5 w-3.5 text-slate-400" /><span>Organization: Connected Organization</span></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.75"><SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /><span>Report Type: Contacts Outstanding</span></div>
            <div className="flex items-center gap-1.75"><Database className="h-3.5 w-3.5 text-slate-400" /><span>Data Source: Xero Accounting API</span></div>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex items-center gap-1.75"><CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /><span>Currency: {currencyCode}</span></div>
            <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">
              "This report shows customer invoices and supplier bill balances currently outstanding."
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
