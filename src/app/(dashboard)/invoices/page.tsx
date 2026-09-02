"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldAlert,
  BarChart3,
  CreditCard,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Download,
  ArrowRight,
  Zap,
  Calculator,
  Percent,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FormattedDatePicker, formatToDDMMYYYY } from '@/components/ui/formatted-date-picker';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// Clean Mini Sparkline
function StripeSparkline({ color, height = 36 }: { color: string; height?: number }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full overflow-hidden relative pt-1" style={{ height }}>
      <svg viewBox="0 0 160 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-app-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14 L 150 40 L 0 40 Z"
          fill={`url(#grad-app-${cleanColor})`}
        />
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// Avatar Initials Generator
function StripeAvatar({ name }: { name: string }) {
  const getInitials = (n: string) => {
    if (!n) return 'CU';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);
  const styles = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200'
  ];
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarStyle = styles[charCodeSum % styles.length];

  return (
    <div className={cn("h-7 w-7 rounded-md border flex items-center justify-center text-[10px] font-bold shrink-0", avatarStyle)}>
      {initials}
    </div>
  );
}

export default function ConsistentAccountReceivablePage() {
  const [asOnDate, setAsOnDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // Navigation & Interactive Filter States
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'overdue' | 'ageing'>('overview');
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Customer Summary Table Sorting State
  const [sortCol, setSortCol] = useState<'overdue' | 'total' | 'name' | 'pct'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  
  // Interactive Customer Expansion State
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Overdue Card View Switcher (Customers vs Invoices)
  const [overdueView, setOverdueView] = useState<'customers' | 'invoices'>('customers');

  // Cash Acceleration Simulator Slider (0 - 100%)
  const [targetCollectionPct, setTargetCollectionPct] = useState<number>(40);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Live Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/account-receivable?as_on_date=${asOnDate}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error('Unable to load Account Receivable data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [asOnDate]);

  const currencyCode = data?.meta?.currency || 'GBP';
  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(val || 0);
  };

  // ECharts Configurations
  const ageingDonutOption = useMemo(() => {
    if (!data?.ageingDistribution) return {};
    const items = data.ageingDistribution;
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
        formatter: (params: any) => {
          const val = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(params.value);
          return `<div class="p-1"><div class="font-bold text-xs text-slate-300">${params.name} (Click to Filter)</div><div class="text-sm font-black text-blue-400 mt-0.5">${val} (${params.percent}%)</div></div>`;
        }
      },
      legend: { show: false },
      series: [
        {
          name: 'Ageing Distribution',
          type: 'pie',
          radius: ['62%', '84%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
          label: { show: false },
          data: items.map((item: any) => ({
            value: item.amount,
            name: item.label,
            itemStyle: { 
              color: item.color,
              opacity: selectedBucketFilter === 'ALL' || selectedBucketFilter === item.key ? 1 : 0.35 
            }
          }))
        }
      ]
    };
  }, [data, currencyCode, selectedBucketFilter]);

  // Full Height Receivables Trend ECharts Config
  const trendLineOption = useMemo(() => {
    if (!data?.trend) return {};
    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      legend: {
        bottom: '2%',
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
        data: ['Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days']
      },
      grid: { left: '3%', right: '3%', top: '6%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.trend.labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10.5, formatter: (val: number) => `£${val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}` }
      },
      series: [
        { name: 'Current', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#2563eb' }, itemStyle: { color: '#2563eb' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(37, 99, 235, 0.12)' }, { offset: 1, color: 'rgba(37, 99, 235, 0.0)' }]) }, data: data.trend.series.current },
        { name: '1 - 30 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#eab308' }, itemStyle: { color: '#eab308' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(234, 179, 8, 0.12)' }, { offset: 1, color: 'rgba(234, 179, 8, 0.0)' }]) }, data: data.trend.series.days1to30 },
        { name: '31 - 60 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#f97316' }, itemStyle: { color: '#f97316' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(249, 115, 22, 0.12)' }, { offset: 1, color: 'rgba(249, 115, 22, 0.0)' }]) }, data: data.trend.series.days31to60 },
        { name: '61 - 90 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(239, 68, 68, 0.12)' }, { offset: 1, color: 'rgba(239, 68, 68, 0.0)' }]) }, data: data.trend.series.days61to90 },
        { name: '90+ Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#991b1b' }, itemStyle: { color: '#991b1b' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(153, 27, 27, 0.12)' }, { offset: 1, color: 'rgba(153, 27, 27, 0.0)' }]) }, data: data.trend.series.days90Plus }
      ]
    };
  }, [data]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!data?.allReceivableInvoices) return;
    const items = data.allReceivableInvoices;
    const csvHeader = ['Invoice Number', 'Customer Name', 'Date', 'Due Date', 'Total Amount', 'Amount Due', 'Days Overdue', 'Ageing Bucket'].join(',');
    const csvRows = items.map((inv: any) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.contactName}"`,
      `"${inv.date ? inv.date.split('T')[0] : ''}"`,
      `"${inv.dueDate ? inv.dueDate.split('T')[0] : ''}"`,
      inv.total,
      inv.amountDue,
      inv.daysOverdue,
      `"${inv.ageingBucket}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [csvHeader, ...csvRows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Account_Receivable_Report_${asOnDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported as CSV');
  };

  // Filter & Sort Customer Summary
  const customerList = data?.customerSummary || [];
  const filteredCustomers = useMemo(() => {
    let list = customerList.filter((c: any) => {
      const matchesSearch = c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.invoices.some((inv: any) => inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesBucket = true;
      if (selectedBucketFilter === 'current') matchesBucket = c.currentNotDue > 0;
      else if (selectedBucketFilter === '1-30') matchesBucket = c.days1to30 > 0;
      else if (selectedBucketFilter === '31-60') matchesBucket = c.days31to60 > 0;
      else if (selectedBucketFilter === '61-90') matchesBucket = c.days61to90 > 0;
      else if (selectedBucketFilter === '90+') matchesBucket = c.days90Plus > 0;

      let matchesRisk = true;
      if (selectedRiskFilter === 'HIGH') matchesRisk = c.pctOverdue >= 40;
      else if (selectedRiskFilter === 'CRITICAL') matchesRisk = c.days90Plus > 0;
      else if (selectedRiskFilter === 'LOW') matchesRisk = c.pctOverdue < 15;

      return matchesSearch && matchesBucket && matchesRisk;
    });

    return [...list].sort((a: any, b: any) => {
      const aOverdue = a.days1to30 + a.days31to60 + a.days61to90 + a.days90Plus;
      const bOverdue = b.days1to30 + b.days31to60 + b.days61to90 + b.days90Plus;

      let res = 0;
      if (sortCol === 'overdue') res = bOverdue - aOverdue;
      else if (sortCol === 'total') res = b.totalReceivables - a.totalReceivables;
      else if (sortCol === 'name') res = a.customerName.localeCompare(b.customerName);
      else if (sortCol === 'pct') res = b.pctOverdue - a.pctOverdue;

      return sortDir === 'desc' ? res : -res;
    });
  }, [customerList, searchTerm, selectedBucketFilter, selectedRiskFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Invoices for Ageing Tab
  const ageingBucketInvoices = useMemo(() => {
    if (!data?.allReceivableInvoices) return [];
    if (selectedBucketFilter === 'ALL') return data.allReceivableInvoices;
    return data.allReceivableInvoices.filter((inv: any) => inv.ageingBucket === selectedBucketFilter);
  }, [data, selectedBucketFilter]);

  // Invoices for Overdue Tab
  const overdueInvoicesList = useMemo(() => {
    if (!data?.allReceivableInvoices) return [];
    return data.allReceivableInvoices.filter((inv: any) => inv.daysOverdue > 0).sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
  }, [data]);

  // Key KPI Figures
  const totalReceivablesVal = data?.summary?.totalReceivables?.amount || 0;
  const currentNotDueVal = data?.summary?.currentNotDue?.amount || 0;
  const overdueTotalVal = (data?.summary?.days1to30?.amount || 0) + 
                          (data?.summary?.days31to60?.amount || 0) + 
                          (data?.summary?.days61to90?.amount || 0) + 
                          (data?.summary?.days90Plus?.amount || 0);
  const highRiskVal = data?.summary?.days90Plus?.amount || 0;
  const overdueCountVal = data?.summary?.overdueInvoices?.count || 0;

  // Cash Acceleration Simulator Math
  const simulatedCashUnlocked = (overdueTotalVal * (targetCollectionPct / 100));
  const simulatedRunwayBoostDays = Math.round((simulatedCashUnlocked / (totalReceivablesVal || 1)) * 45);

  return (
    <div className="space-y-5 max-w-full pb-12 select-none font-sans text-slate-800">
      
      {/* ========================================================================= */}
      {/* SEAMLESS UNDERLINED TAB STRIP & ACTION TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-0 mb-1">
        {/* Left: Underlined Tab Switcher */}
        <div className="flex items-center gap-6 text-xs font-bold text-slate-500">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer font-extrabold",
              activeTab === 'overview' ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-900"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer font-extrabold",
              activeTab === 'customers' ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-900"
            )}
          >
            <User className="h-4 w-4" />
            <span>Customer Ledger</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === 'customers' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
            )}>
              {filteredCustomers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer font-extrabold",
              activeTab === 'overdue' ? "border-red-600 text-red-600" : "border-transparent hover:text-slate-900"
            )}
          >
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span>Overdue Invoices</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === 'overdue' ? "bg-red-100 text-red-700" : "bg-red-50 text-red-600 border border-red-200"
            )}>
              {overdueCountVal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ageing')}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer font-extrabold",
              activeTab === 'ageing' ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-900"
            )}
          >
            <Clock className="h-4 w-4" />
            <span>Ageing Breakdown</span>
          </button>
        </div>

        {/* Right: Action Controls */}
        <div className="flex items-center gap-2.5 pb-3">
          {/* As On Date Selector (Formatted DD/MM/YYYY) */}
          <FormattedDatePicker
            value={asOnDate}
            onChange={setAsOnDate}
            label="As On:"
          />

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-blue-600", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-extrabold hover:bg-blue-700 transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* 4 PRIMARY METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Receivables */}
        <div 
          onClick={() => {
            setSelectedBucketFilter('ALL');
            setSelectedRiskFilter('ALL');
            setActiveTab('customers');
            toast.info('Showing all receivables');
          }}
          className={cn(
            "bg-white rounded-xl border p-4 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group",
            selectedBucketFilter === 'ALL' ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-slate-200/80"
          )}
        >
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">TOTAL RECEIVABLES</span>
              <CreditCard className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {formatAmount(totalReceivablesVal)}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Click to view all receivables →</span>
          </div>
          <div className="mt-2 -mx-4 -mb-4">
            <StripeSparkline color="#10b981" />
          </div>
        </div>

        {/* Card 2: Current (Not Due) */}
        <div 
          onClick={() => {
            setSelectedBucketFilter('current');
            setActiveTab('customers');
            toast.info('Filtered: Current (Not Due) Receivables');
          }}
          className={cn(
            "bg-white rounded-xl border p-4 shadow-2xs hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group",
            selectedBucketFilter === 'current' ? "border-blue-500 ring-1 ring-blue-500/20" : "border-slate-200/80"
          )}
        >
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">CURRENT (NOT DUE)</span>
              <Calendar className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {formatAmount(currentNotDueVal)}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
              {data?.summary?.currentNotDue?.pct || '0'}% (Click to drill down) →
            </span>
          </div>
          <div className="mt-2 -mx-4 -mb-4">
            <StripeSparkline color="#2563eb" />
          </div>
        </div>

        {/* Card 3: Overdue Balance */}
        <div 
          onClick={() => {
            setSelectedBucketFilter('ALL');
            setActiveTab('overdue');
            toast.info('Filtered: All Overdue Invoices');
          }}
          className={cn(
            "bg-white rounded-xl border p-4 shadow-2xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between group",
            activeTab === 'overdue' ? "border-amber-500 ring-1 ring-amber-500/20" : "border-slate-200/80"
          )}
        >
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">TOTAL OVERDUE</span>
              <Clock className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {formatAmount(overdueTotalVal)}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
              {overdueCountVal} Invoices (Click to inspect) →
            </span>
          </div>
          <div className="mt-2 -mx-4 -mb-4">
            <StripeSparkline color="#f59e0b" />
          </div>
        </div>

        {/* Card 4: 90+ Days Overdue */}
        <div 
          onClick={() => {
            setSelectedBucketFilter('90+');
            setActiveTab('ageing');
            toast.warning('Filtered: High Risk 90+ Days Overdue');
          }}
          className={cn(
            "bg-white rounded-xl border p-4 shadow-2xs hover:border-red-500 transition-all cursor-pointer flex flex-col justify-between group",
            selectedBucketFilter === '90+' ? "border-red-500 ring-1 ring-red-500/20" : "border-slate-200/80"
          )}
        >
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">90+ DAYS OVERDUE</span>
              <ShieldAlert className="h-4 w-4 text-red-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-red-600 mt-1.5 tracking-tight">
              {formatAmount(highRiskVal)}
            </div>
            <span className="text-[11px] text-red-600 font-semibold mt-1 block">
              {data?.summary?.days90Plus?.pct || '0'}% (High Risk Drill-down) →
            </span>
          </div>
          <div className="mt-2 -mx-4 -mb-4">
            <StripeSparkline color="#ef4444" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INSTANT AGEING BUCKET DRILL FILTER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" /> Instant Ageing Bucket Drill Filter
          </span>
          {selectedBucketFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedBucketFilter('ALL')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Clear Filter (Showing: {selectedBucketFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {data?.ageingDistribution?.map((item: any) => {
            const isSelected = selectedBucketFilter === item.key;
            return (
              <div 
                key={item.key}
                onClick={() => {
                  setSelectedBucketFilter(isSelected ? 'ALL' : item.key);
                  setActiveTab('customers');
                  toast.info(`Filter updated: ${item.label}`);
                }}
                className={cn(
                  "p-2.5 rounded-lg border transition cursor-pointer flex flex-col justify-between",
                  isSelected ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500/20" : "bg-slate-50/50 border-slate-100 hover:border-blue-200"
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                </div>
                <div className="text-sm font-black text-slate-900">{formatAmount(item.amount).split(' ')[0]}</div>
                <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.pct}% of total</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Donut Distribution (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Ageing Distribution</h3>
                  <span className="text-[10px] font-bold text-slate-400">Click slice to filter</span>
                </div>
                
                <div className="relative h-48 w-full flex items-center justify-center">
                  <ReactECharts 
                    option={ageingDonutOption} 
                    style={{ height: '100%', width: '100%' }}
                    onEvents={{
                      click: (params: any) => {
                        const found = data?.ageingDistribution?.find((x: any) => x.label === params.name);
                        if (found) {
                          setSelectedBucketFilter(found.key);
                          setActiveTab('customers');
                          toast.info(`Drilling down into ${found.label}`);
                        }
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-extrabold text-slate-900">
                      {formatAmount(totalReceivablesVal).split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase">Total Receivables</span>
                  </div>
                </div>

                {/* Ageing List */}
                <div className="space-y-1 mt-2 text-[11.5px]">
                  {data?.ageingDistribution?.map((item: any) => (
                    <div 
                      key={item.key}
                      onClick={() => {
                        setSelectedBucketFilter(item.key);
                        setActiveTab('customers');
                      }}
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded-lg transition cursor-pointer",
                        selectedBucketFilter === item.key ? "bg-blue-50 font-bold" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{formatAmount(item.amount).split(' ')[0]}</span>
                        <span className="text-slate-400 font-semibold text-[10px]">({item.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('ageing')}
                className="mt-3 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 border-t border-slate-100 pt-2.5 cursor-pointer"
              >
                <span>View Ageing Breakdown</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Receivables Trend (5 cols) - FULL EXPANDED GRAPH */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-extrabold text-slate-900">Receivables Trend</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Last 6 Months
                  </span>
                </div>
                
                <div className="h-[320px] w-full flex-1">
                  <ReactECharts option={trendLineOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Top Overdue Accounts & Invoices Dual Card (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  {/* Segmented Control Header: Customers vs Invoices */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold">
                    <button
                      onClick={() => setOverdueView('customers')}
                      className={cn(
                        "px-2.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1",
                        overdueView === 'customers' ? "bg-white text-blue-600 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      <User className="h-3 w-3" />
                      <span>Top Customers</span>
                    </button>
                    <button
                      onClick={() => setOverdueView('invoices')}
                      className={cn(
                        "px-2.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1",
                        overdueView === 'invoices' ? "bg-white text-blue-600 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      <FileText className="h-3 w-3" />
                      <span>Top Invoices</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setActiveTab(overdueView === 'invoices' ? 'overdue' : 'customers')}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    View All <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-1.5">
                  {overdueView === 'customers' ? (
                    data?.topOverdueCustomers?.length > 0 ? (
                      data.topOverdueCustomers.map((cust: any) => (
                        <div 
                          key={cust.customerName}
                          onClick={() => {
                            setExpandedCustomer(cust.customerName);
                            setActiveTab('customers');
                            toast.info(`Drilled down to customer: ${cust.customerName}`);
                          }}
                          className="relative overflow-hidden p-2.5 rounded-lg border border-slate-200/80 hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-2 group bg-white shadow-2xs"
                        >
                          {/* Full Card Embedded Translucent Progress Fill */}
                          <div 
                            className={cn(
                              "absolute left-0 top-0 bottom-0 transition-all duration-500 pointer-events-none opacity-15",
                              cust.pctOverdue >= 80 ? "bg-red-500" : cust.pctOverdue >= 30 ? "bg-amber-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${Math.max(cust.pctOverdue, 0)}%` }} 
                          />

                          {/* Left Colored Accent Bar */}
                          <div 
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                              cust.pctOverdue >= 80 ? "bg-red-500" : cust.pctOverdue >= 30 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                          />

                          <div className="relative z-10 flex items-center gap-2 min-w-0 pl-1.5">
                            <StripeAvatar name={cust.customerName} />
                            <div className="min-w-0">
                              <div className="text-[11px] font-extrabold text-slate-900 truncate">{cust.customerName}</div>
                              <div className="text-[9.5px] text-slate-500 truncate">
                                {cust.totalInvoices} {cust.totalInvoices === 1 ? 'Invoice' : 'Invoices'} • {cust.overdueCount > 0 ? <span className="font-bold text-red-600">{formatAmount(cust.overdueAmount).split(' ')[0]} Overdue</span> : <span className="font-semibold text-emerald-600">All Current</span>}
                              </div>
                            </div>
                          </div>

                          <div className="relative z-10 text-right shrink-0">
                            <div className="text-[11px] font-black text-slate-900">
                              {formatAmount(cust.totalReceivables).split(' ')[0]}
                            </div>
                            <span className={cn(
                              "text-[8.5px] font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5",
                              cust.pctOverdue >= 80 ? "bg-red-50 text-red-700 border-red-200" : cust.pctOverdue >= 30 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {cust.pctOverdue}% Risk
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">No top customers</div>
                    )
                  ) : (
                    data?.topOverdueInvoices?.length > 0 ? (
                      data.topOverdueInvoices.map((inv: any) => (
                        <div 
                          key={inv.id}
                          onClick={() => {
                            setExpandedCustomer(inv.contactName);
                            setActiveTab('customers');
                            toast.info(`Drilled down to customer: ${inv.contactName}`);
                          }}
                          className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StripeAvatar name={inv.contactName} />
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-900 truncate">{inv.invoiceNumber}</div>
                              <div className="text-[9.5px] text-slate-500 truncate">{inv.contactName}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-extrabold text-red-600">
                              {formatAmount(inv.amountDue).split(' ')[0]}
                            </div>
                            <span className="text-[8.5px] font-bold text-red-500 bg-red-50 px-1 py-0.2 rounded border border-red-100 inline-block mt-0.5">
                              {inv.daysOverdue} days
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">No overdue invoices</div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Overview Table Preview */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">Customer Summary Overview</h3>
              <button 
                onClick={() => setActiveTab('customers')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All Customers <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th 
                      onClick={() => { setSortCol('name'); setSortDir(sortCol === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); }}
                      className="py-2 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      CUSTOMER {sortCol === 'name' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="py-2 px-3 text-center">INVOICES</th>
                    <th 
                      onClick={() => { setSortCol('total'); setSortDir(sortCol === 'total' && sortDir === 'desc' ? 'asc' : 'desc'); }}
                      className="py-2 px-3 text-right cursor-pointer hover:text-slate-700 select-none"
                    >
                      TOTAL RECEIVABLES {sortCol === 'total' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="py-2 px-3 text-right">CURRENT</th>
                    <th className="py-2 px-3 text-right">1 - 30 DAYS</th>
                    <th className="py-2 px-3 text-right">31 - 60 DAYS</th>
                    <th className="py-2 px-3 text-right">61 - 90 DAYS</th>
                    <th className="py-2 px-3 text-right">90+ DAYS</th>
                    <th 
                      onClick={() => { setSortCol('overdue'); setSortDir(sortCol === 'overdue' && sortDir === 'desc' ? 'asc' : 'desc'); }}
                      className="py-2 px-3 text-right text-red-600 cursor-pointer hover:text-red-800 select-none font-black"
                    >
                      TOTAL OVERDUE {sortCol === 'overdue' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th 
                      onClick={() => { setSortCol('pct'); setSortDir(sortCol === 'pct' && sortDir === 'desc' ? 'asc' : 'desc'); }}
                      className="py-2 px-3 text-right cursor-pointer hover:text-slate-700 select-none"
                    >
                      % OVERDUE {sortCol === 'pct' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {paginatedCustomers.map((cust: any, i: number) => {
                    const totalOverdueVal = cust.days1to30 + cust.days31to60 + cust.days61to90 + cust.days90Plus;
                    return (
                      <tr 
                        key={i} 
                        onClick={() => {
                          setExpandedCustomer(cust.customerName);
                          setActiveTab('customers');
                        }}
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <StripeAvatar name={cust.customerName} />
                            <span className="font-bold text-blue-600 hover:underline">{cust.customerName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{cust.totalInvoices}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-red-600">
                          {totalOverdueVal > 0 ? formatAmount(totalOverdueVal).split(' ')[0] : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{cust.pctOverdue}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: CUSTOMER SUMMARY TAB */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Customer Receivables Ledger</h3>
              <p className="text-xs text-slate-500 font-medium">Click on any row to open interactive financial drill-down &amp; collection triggers.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-[10.5px] font-bold">
                <button 
                  onClick={() => setSelectedRiskFilter('ALL')}
                  className={cn("px-2 py-0.5 rounded cursor-pointer", selectedRiskFilter === 'ALL' ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600")}
                >
                  All Risk
                </button>
                <button 
                  onClick={() => setSelectedRiskFilter('HIGH')}
                  className={cn("px-2 py-0.5 rounded cursor-pointer", selectedRiskFilter === 'HIGH' ? "bg-amber-500 text-white shadow-2xs font-extrabold" : "text-amber-700")}
                >
                  High Risk
                </button>
                <button 
                  onClick={() => setSelectedRiskFilter('CRITICAL')}
                  className={cn("px-2 py-0.5 rounded cursor-pointer", selectedRiskFilter === 'CRITICAL' ? "bg-red-600 text-white shadow-2xs font-extrabold" : "text-red-700")}
                >
                  90+ Critical
                </button>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3">CUSTOMER</th>
                  <th className="py-2 px-3 text-center">INVOICES</th>
                  <th className="py-2 px-3 text-right">TOTAL RECEIVABLES</th>
                  <th className="py-2 px-3 text-right">CURRENT</th>
                  <th className="py-2 px-3 text-right">1 - 30 DAYS</th>
                  <th className="py-2 px-3 text-right">31 - 60 DAYS</th>
                  <th className="py-2 px-3 text-right">61 - 90 DAYS</th>
                  <th className="py-2 px-3 text-right">90+ DAYS</th>
                  <th className="py-2 px-3 text-center">OVERDUE</th>
                  <th className="py-2 px-3 text-right">% OVERDUE</th>
                  <th className="py-2 px-3 text-center">DRILL DOWN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {paginatedCustomers.map((cust: any, i: number) => {
                  const isExpanded = expandedCustomer === cust.customerName;
                  return (
                    <React.Fragment key={i}>
                      <tr 
                        onClick={() => setExpandedCustomer(isExpanded ? null : cust.customerName)}
                        className={cn("hover:bg-slate-50 transition cursor-pointer", isExpanded && "bg-blue-50/40")}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <StripeAvatar name={cust.customerName} />
                            <span className="font-bold text-slate-900">{cust.customerName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{cust.totalInvoices}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            cust.overdueCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-500"
                          )}>
                            {cust.overdueCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{cust.pctOverdue}%</td>
                        <td className="py-2.5 px-3 text-center">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-blue-600 inline" /> : <ChevronDown className="h-4 w-4 text-slate-400 inline" />}
                        </td>
                      </tr>

                      {/* INLINE EXPANDED CUSTOMER CARD */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={11} className="p-3">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2.5">
                                  <StripeAvatar name={cust.customerName} />
                                  <div>
                                    <h4 className="text-xs font-extrabold text-slate-900">{cust.customerName} Ledger Breakdown</h4>
                                    <span className="text-[10.5px] font-semibold text-slate-500">
                                      Total Exposure: {formatAmount(cust.totalReceivables)} • {cust.totalInvoices} Invoices
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success(`Dunning notice sent to ${cust.customerName}`);
                                    }}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Send className="h-3 w-3" /> Send Reminder
                                  </button>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.info(`Early settlement discount offered to ${cust.customerName}`);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Percent className="h-3 w-3" /> Offer 2% Discount
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="divide-y divide-slate-100 text-xs border border-slate-100 rounded-lg overflow-hidden">
                                  {cust.invoices?.map((inv: any) => (
                                    <div key={inv.id} className="p-2.5 bg-white hover:bg-slate-50/80 transition flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="font-extrabold text-blue-600">{inv.invoiceNumber}</span>
                                        <span className="text-slate-500">Date: {inv.date ? formatToDDMMYYYY(inv.date) : '—'}</span>
                                        <span className="text-slate-500">Due: {inv.dueDate ? formatToDDMMYYYY(inv.dueDate) : '—'}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={cn(
                                          "px-2 py-0.5 text-[9.5px] font-bold rounded",
                                          inv.daysOverdue > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                          {inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : 'Current'}
                                        </span>
                                        <span className="font-black text-slate-900">{formatAmount(inv.amountDue)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-500">
            <div>
              Showing {paginatedCustomers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} accounts
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-bold text-slate-800">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: OVERDUE INVOICES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">All Overdue Invoices</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Total Overdue: <span className="text-red-600 font-bold">{formatAmount(overdueTotalVal)}</span> across {overdueInvoicesList.length} invoices.</p>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export Overdue List
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3">INVOICE #</th>
                  <th className="py-2 px-3">CUSTOMER</th>
                  <th className="py-2 px-3">DUE DATE</th>
                  <th className="py-2 px-3 text-right">TOTAL AMOUNT</th>
                  <th className="py-2 px-3 text-right">AMOUNT DUE</th>
                  <th className="py-2 px-3 text-center">DAYS OVERDUE</th>
                  <th className="py-2 px-3 text-center">AGEING BUCKET</th>
                  <th className="py-2 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {overdueInvoicesList.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-extrabold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{inv.contactName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{inv.dueDate ? formatToDDMMYYYY(inv.dueDate) : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatAmount(inv.total)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-red-600">{formatAmount(inv.amountDue)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded text-[10px] border border-red-100">
                        {inv.daysOverdue} days
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 uppercase">{inv.ageingBucket}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toast.success(`Payment reminder queued for ${inv.invoiceNumber}`)}
                        className="px-2.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-[10.5px] font-bold transition cursor-pointer"
                      >
                        Send Notice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: AGEING BREAKDOWN TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ageing' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Ageing Bucket Analysis</h3>
              <p className="text-xs text-slate-500 font-medium">Filter receivables by specific ageing buckets.</p>
            </div>

            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
              {['ALL', 'current', '1-30', '31-60', '61-90', '90+'].map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBucketFilter(b)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-bold uppercase transition cursor-pointer",
                    selectedBucketFilter === b ? "bg-white text-blue-600 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3">INVOICE #</th>
                  <th className="py-2 px-3">CUSTOMER</th>
                  <th className="py-2 px-3">DATE</th>
                  <th className="py-2 px-3">DUE DATE</th>
                  <th className="py-2 px-3 text-right">TOTAL</th>
                  <th className="py-2 px-3 text-right">AMOUNT DUE</th>
                  <th className="py-2 px-3 text-center">OVERDUE DAYS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {ageingBucketInvoices.length > 0 ? (
                  ageingBucketInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-extrabold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{inv.contactName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.date ? formatToDDMMYYYY(inv.date) : '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.dueDate ? formatToDDMMYYYY(inv.dueDate) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatAmount(inv.total)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatAmount(inv.amountDue)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{inv.daysOverdue} days</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">No invoices in {selectedBucketFilter} ageing bucket</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
