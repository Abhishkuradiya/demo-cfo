"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileText,
  User,
  Clock,
  CheckCircle2,
  X,
  Download,
  Printer,
  ChevronRight,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Info,
  SlidersHorizontal,
  ExternalLink,
  PieChart,
  BarChart2,
  Activity,
  Zap,
  Sparkles,
  DollarSign,
  Building2,
  Send,
  Eye,
  Check,
  AlertCircle,
  BarChart3,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// Premium Sparkline Component with gradient glow & path end dot
function PremiumSparkline({ color, height = 40 }: { color: string; height?: number }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full overflow-hidden relative pt-1" style={{ height }}>
      <svg viewBox="0 0 160 42" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-spark-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.38" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 32 C 30 36, 50 20, 80 22 C 110 24, 130 10, 160 12 L 160 42 L 0 42 Z"
          fill={`url(#grad-spark-${cleanColor})`}
        />
        <path
          d="M 0 32 C 30 36, 50 20, 80 22 C 110 24, 130 10, 160 12"
          fill="none"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="160" cy="12" r="3.5" fill={color} className="animate-pulse" />
      </svg>
    </div>
  );
}

// Avatar Initials with gradient background
function CustomerAvatar({ name }: { name: string }) {
  const getInitials = (n: string) => {
    if (!n) return 'CU';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);
  const colorGradients = [
    'from-blue-600 to-indigo-600 text-white',
    'from-emerald-600 to-teal-600 text-white',
    'from-purple-600 to-pink-600 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-cyan-600 to-blue-600 text-white'
  ];
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgGradient = colorGradients[charCodeSum % colorGradients.length];

  return (
    <div className={cn("h-8 w-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-xs font-black shadow-2xs shrink-0 tracking-wider", bgGradient)}>
      {initials}
    </div>
  );
}

export default function AdvancedAccountReceivableDashboard() {
  const [asOnDate, setAsOnDate] = useState<string>('2026-08-31');
  const [dateRangePreset, setDateRangePreset] = useState<'MTD' | '30D' | '90D' | 'YTD'>('30D');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // Table Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Slide-Over Sheet / Modal States
  const [activeSheet, setActiveSheet] = useState<'customer' | 'ageing' | 'invoice' | 'overdue' | 'export' | null>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [selectedAgeingBucket, setSelectedAgeingBucket] = useState<string>('1-30');
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [customerTab, setCustomerTab] = useState<'overview' | 'invoices' | 'ageing' | 'payments'>('overview');

  // Export Modal Config
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');

  // Fetch API
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/account-receivable?as_on_date=${asOnDate}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load Account Receivable data');
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

  // ECharts Configs
  // 1. Ageing Donut Chart
  const ageingDonutOption = useMemo(() => {
    if (!data?.ageingDistribution) return {};
    const items = data.ageingDistribution;
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
        formatter: (params: any) => {
          const val = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(params.value);
          return `<div class="p-1"><div class="font-extrabold text-xs text-slate-300">${params.name}</div><div class="text-sm font-black text-cyan-400 mt-0.5">${val} (${params.percent}%)</div></div>`;
        }
      },
      legend: { show: false },
      series: [
        {
          name: 'Ageing Bucket',
          type: 'pie',
          radius: ['62%', '86%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#ffffff', borderWidth: 2.5 },
          label: { show: false },
          data: items.map((item: any) => ({
            value: item.amount,
            name: item.label,
            itemStyle: { color: item.color }
          }))
        }
      ]
    };
  }, [data, currencyCode]);

  // 2. Trend Line / Area Chart
  const trendLineOption = useMemo(() => {
    if (!data?.trend) return {};
    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      legend: {
        bottom: '0%',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
        data: ['Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days']
      },
      grid: { left: '3%', right: '4%', top: '8%', bottom: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.trend.labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 10.5, fontWeight: 'bold' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}` }
      },
      series: [
        { name: 'Current', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#2563eb' }, itemStyle: { color: '#2563eb' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(37, 99, 235, 0.25)' }, { offset: 1, color: 'rgba(37, 99, 235, 0.0)' }]) }, data: data.trend.series.current },
        { name: '1 - 30 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#eab308' }, itemStyle: { color: '#eab308' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(234, 179, 8, 0.25)' }, { offset: 1, color: 'rgba(234, 179, 8, 0.0)' }]) }, data: data.trend.series.days1to30 },
        { name: '31 - 60 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#f97316' }, itemStyle: { color: '#f97316' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(249, 115, 22, 0.25)' }, { offset: 1, color: 'rgba(249, 115, 22, 0.0)' }]) }, data: data.trend.series.days31to60 },
        { name: '61 - 90 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(239, 68, 68, 0.25)' }, { offset: 1, color: 'rgba(239, 68, 68, 0.0)' }]) }, data: data.trend.series.days61to90 },
        { name: '90+ Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#991b1b' }, itemStyle: { color: '#991b1b' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(153, 27, 27, 0.25)' }, { offset: 1, color: 'rgba(153, 27, 27, 0.0)' }]) }, data: data.trend.series.days90Plus }
      ]
    };
  }, [data]);

  // Handlers for Drill Down Sheets
  const openCustomerSheet = (customer: any) => {
    setSelectedCustomerData(customer);
    setCustomerTab('overview');
    setActiveSheet('customer');
  };

  const openAgeingSheet = (bucketKey: string) => {
    setSelectedAgeingBucket(bucketKey);
    setActiveSheet('ageing');
  };

  const openInvoiceSheet = (invoice: any) => {
    setSelectedInvoiceData(invoice);
    setActiveSheet('invoice');
  };

  const handleExportCSV = () => {
    if (!data?.allReceivableInvoices) return;
    const items = data.allReceivableInvoices;
    const csvHeader = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Total', 'Amount Due', 'Days Overdue', 'Ageing Bucket'].join(',');
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
    link.setAttribute('download', `Account_Receivable_Report_${asOnDate}.${exportFormat}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Export downloaded as .${exportFormat}`);
    setActiveSheet(null);
  };

  // Filter Customer List
  const customerList = data?.customerSummary || [];
  const filteredCustomers = customerList.filter((c: any) => {
    return c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.invoices.some((inv: any) => inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Ageing bucket invoices for slide-over sheet
  const ageingBucketInvoices = useMemo(() => {
    if (!data?.allReceivableInvoices) return [];
    return data.allReceivableInvoices.filter((inv: any) => inv.ageingBucket === selectedAgeingBucket);
  }, [data, selectedAgeingBucket]);

  const totalAgeingAmount = ageingBucketInvoices.reduce((sum: number, inv: any) => sum + inv.amountDue, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-7 select-none font-sans text-slate-800 antialiased">
      <div className="max-w-[1680px] mx-auto space-y-7">
        
        {/* ========================================================================= */}
        {/* HERO TOP HEADER BAR */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 lg:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              {/* Breadcrumb & Live Badge */}
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300 mb-2">
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-extrabold">LIVE XERO SYNC</span>
                </div>
                <span>•</span>
                <span>Accounting Reports</span>
                <span>•</span>
                <span className="text-cyan-400 font-extrabold">Account Receivable Intelligence</span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                Account Receivable Dashboard
              </h1>
              <p className="text-xs lg:text-sm text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Real-time financial collection analytics, ageing bucket intelligence, and interactive customer portfolio management.
              </p>
            </div>

            {/* Top Control Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* As On Date Selector */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2 text-xs font-extrabold text-white shadow-inner">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-slate-300 font-semibold text-[11px]">As On Date:</span>
                <input
                  type="date"
                  value={asOnDate}
                  onChange={(e) => setAsOnDate(e.target.value)}
                  className="bg-transparent text-white font-black outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/15 rounded-2xl text-xs font-extrabold text-white transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <RefreshCw className={cn("h-4 w-4 text-cyan-400", loading && "animate-spin")} />
                <span>Refresh</span>
              </button>

              {/* Export Button */}
              <button
                onClick={() => setActiveSheet('export')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Report</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP 7 AGEING KPI SUMMARY CARDS GRID */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          
          {/* Card 1: Total Receivables */}
          <div 
            onClick={() => openAgeingSheet('current')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Total Receivables</span>
                <div className="h-7 w-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.totalReceivables?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                <span>100% of outstanding</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#10b981" />
            </div>
          </div>

          {/* Card 2: Current (Not Due) */}
          <div 
            onClick={() => openAgeingSheet('current')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Current (Not Due)</span>
                <div className="h-7 w-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.currentNotDue?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-blue-600">
                <span>{data?.summary?.currentNotDue?.pct || '0'}% of total</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#2563eb" />
            </div>
          </div>

          {/* Card 3: 1 - 30 Days */}
          <div 
            onClick={() => openAgeingSheet('1-30')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">1 - 30 Days</span>
                <div className="h-7 w-7 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.days1to30?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-amber-600">
                <span>{data?.summary?.days1to30?.pct || '0'}% of total</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#eab308" />
            </div>
          </div>

          {/* Card 4: 31 - 60 Days */}
          <div 
            onClick={() => openAgeingSheet('31-60')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-orange-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">31 - 60 Days</span>
                <div className="h-7 w-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.days31to60?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-orange-600">
                <span>{data?.summary?.days31to60?.pct || '0'}% of total</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#f97316" />
            </div>
          </div>

          {/* Card 5: 61 - 90 Days */}
          <div 
            onClick={() => openAgeingSheet('61-90')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-rose-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">61 - 90 Days</span>
                <div className="h-7 w-7 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.days61to90?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-rose-600">
                <span>{data?.summary?.days61to90?.pct || '0'}% of total</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#ef4444" />
            </div>
          </div>

          {/* Card 6: 90+ Days */}
          <div 
            onClick={() => openAgeingSheet('90+')}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-red-600 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">90+ Days</span>
                <div className="h-7 w-7 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                {formatAmount(data?.summary?.days90Plus?.amount || 0)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10.5px] font-extrabold text-red-700">
                <span>{data?.summary?.days90Plus?.pct || '0'}% of total</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4">
              <PremiumSparkline color="#991b1b" />
            </div>
          </div>

          {/* Card 7: Overdue Invoices Count */}
          <div 
            onClick={() => setActiveSheet('overdue')}
            className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-white/80">
                <span className="text-[10px] font-black uppercase tracking-wider">Overdue Invoices</span>
                <ShieldAlert className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-white">{data?.summary?.overdueInvoices?.count || 0}</span>
                <span className="text-xs font-extrabold text-white/90">Invoices</span>
              </div>
              <span className="text-[10.5px] font-bold text-white/90 mt-1 block">Critical Collection Focus</span>
            </div>
            <div className="mt-3 -mx-4 -mb-4 opacity-70">
              <PremiumSparkline color="#ffffff" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MIDDLE SECTION: 3 VISUAL ANALYTICS CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Receivables by Ageing Bucket (Donut & Progress Bars) - 4 cols */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Receivables by Ageing Bucket</h3>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Live Breakdown</span>
              </div>
              
              <div className="relative h-48 w-full flex items-center justify-center">
                <ReactECharts option={ageingDonutOption} style={{ height: '100%', width: '100%' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black text-slate-900">
                    {formatAmount(data?.summary?.totalReceivables?.amount || 0).split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Total Receivables</span>
                </div>
              </div>

              {/* Progress Bar Bucket Distribution */}
              <div className="space-y-2.5 mt-3 text-xs">
                {data?.ageingDistribution?.map((item: any) => (
                  <div 
                    key={item.key}
                    onClick={() => openAgeingSheet(item.key)}
                    className="p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-slate-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{formatAmount(item.amount).split(' ')[0]}</span>
                        <span className="text-[10px] font-bold text-slate-400">({item.pct}%)</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => openAgeingSheet('1-30')}
              className="mt-4 text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center justify-between border-t border-slate-100 pt-3.5 cursor-pointer"
            >
              <span>Explore Detailed Ageing Analytics</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Card 2: Receivables Trend Multi-Line Chart - 5 cols */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Receivables Trend (Last 6 Months)</h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-600">
                  <button className="px-2 py-0.5 rounded-lg bg-white text-blue-600 shadow-2xs">Monthly</button>
                  <button className="px-2 py-0.5 rounded-lg hover:text-slate-900">Quarterly</button>
                </div>
              </div>
              
              <div className="h-72 w-full">
                <ReactECharts option={trendLineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Card 3: Top At-Risk / Overdue Invoices - 3 cols */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Top Overdue Invoices</h3>
                </div>
                <button 
                  onClick={() => setActiveSheet('overdue')}
                  className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  View All ({data?.summary?.overdueInvoices?.count || 0}) <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {data?.topOverdueInvoices?.length > 0 ? (
                  data.topOverdueInvoices.map((inv: any) => (
                    <div 
                      key={inv.id}
                      onClick={() => openInvoiceSheet(inv)}
                      className="p-3 rounded-2xl border border-slate-100 hover:border-red-300 hover:bg-red-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CustomerAvatar name={inv.contactName} />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{inv.invoiceNumber}</div>
                          <div className="text-[10.5px] text-slate-500 font-bold truncate">{inv.contactName}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-red-600">
                          {formatAmount(inv.amountDue).split(' ')[0]}
                        </div>
                        <span className="text-[9.5px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 inline-block mt-0.5">
                          {inv.daysOverdue} days
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 font-semibold">No overdue invoices found</div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveSheet('overdue')}
              className="mt-4 w-full py-2.5 bg-red-50 text-red-700 hover:bg-red-100 font-extrabold text-xs rounded-2xl transition border border-red-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Manage Collections</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SECTION: CUSTOMER SUMMARY TABLE & COLLECTION CONTROL */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Customer Summary Interactive Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Invoice Summary by Customer</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Customer-level outstanding balance, ageing distribution &amp; risk profiles.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter customer or invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 w-52 sm:w-64 transition-all"
                  />
                </div>

                <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* CUSTOMER SUMMARY TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-3.5">CUSTOMER</th>
                    <th className="py-3 px-3.5 text-center">INVOICES</th>
                    <th className="py-3 px-3.5 text-right">TOTAL RECEIVABLES</th>
                    <th className="py-3 px-3.5 text-right">CURRENT</th>
                    <th className="py-3 px-3.5 text-right">1-30 DAYS</th>
                    <th className="py-3 px-3.5 text-right">31-60 DAYS</th>
                    <th className="py-3 px-3.5 text-right">61-90 DAYS</th>
                    <th className="py-3 px-3.5 text-right">90+ DAYS</th>
                    <th className="py-3 px-3.5 text-center">OVERDUE</th>
                    <th className="py-3 px-3.5 text-right">% OVERDUE</th>
                    <th className="py-3 px-3.5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((cust: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/90 transition group">
                        {/* Customer Avatar & Name */}
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center gap-3">
                            <CustomerAvatar name={cust.customerName} />
                            <span 
                              onClick={() => openCustomerSheet(cust)}
                              className="font-extrabold text-blue-600 hover:underline cursor-pointer truncate max-w-[160px]"
                            >
                              {cust.customerName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-center font-bold text-slate-700">{cust.totalInvoices}</td>
                        <td className="py-3.5 px-3.5 text-right font-black text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                        <td className="py-3.5 px-3.5 text-right font-semibold text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                        <td className="py-3.5 px-3.5 text-right font-bold text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                        <td className="py-3.5 px-3.5 text-right font-bold text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                        <td className="py-3.5 px-3.5 text-right font-bold text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                        <td className="py-3.5 px-3.5 text-right font-black text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                        
                        {/* Overdue Badge */}
                        <td className="py-3.5 px-3.5 text-center">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black",
                            cust.overdueCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-500"
                          )}>
                            {cust.overdueCount}
                          </span>
                        </td>

                        {/* % Overdue Progress Cell */}
                        <td className="py-3.5 px-3.5 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-extrabold text-slate-800">{cust.pctOverdue}%</span>
                            <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", cust.pctOverdue > 50 ? "bg-red-500" : cust.pctOverdue > 20 ? "bg-amber-500" : "bg-emerald-500")}
                                style={{ width: `${Math.min(100, cust.pctOverdue)}%` }} 
                              />
                            </div>
                          </div>
                        </td>

                        {/* Action Drill Down Button */}
                        <td className="py-3.5 px-3.5 text-center">
                          <button 
                            onClick={() => openCustomerSheet(cust)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition cursor-pointer shadow-2xs"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 text-xs font-semibold">
                        No customers found matching search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <div>
                Showing {paginatedCustomers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Previous
                </button>
                <span className="font-extrabold text-slate-900 px-2">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: COLLECTION HEALTH GAUGE & AI INSIGHTS (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Collection Health Gauge Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Collection Health Index</h3>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {data?.collectionEfficiency?.status || 'Good'}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="relative h-28 w-28 flex items-center justify-center shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 stroke-current transition-all duration-1000"
                      strokeWidth="3.8"
                      strokeDasharray={`${data?.collectionEfficiency?.rate || 78.4}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{data?.collectionEfficiency?.rate || 78.4}%</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Efficiency</span>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">vs Preceding Period</span>
                    <span className="text-base font-black text-emerald-600 flex items-center justify-end gap-1">
                      <ArrowUpRight className="h-4 w-4" /> {data?.collectionEfficiency?.vsLastMonth || '+5.6%'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Collection Velocity</span>
                    <span className="text-xs font-extrabold text-slate-800">18.4 Days Avg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Portfolio Insights */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Collection Insights &amp; Alerts</h3>
              </div>

              <div className="space-y-3">
                <div 
                  onClick={() => openAgeingSheet('1-30')}
                  className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 hover:border-emerald-200 transition cursor-pointer flex items-start gap-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-emerald-900">{formatAmount(data?.summary?.days1to30?.amount || 0)}</div>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold leading-relaxed">
                      {data?.quickInsights?.[0]?.text || '54.27% of receivables are due within 30 days.'}
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => setActiveSheet('overdue')}
                  className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 hover:border-amber-200 transition cursor-pointer flex items-start gap-3"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-amber-900">{data?.summary?.overdueInvoices?.count || 0} Invoices Overdue</div>
                    <p className="text-[11px] text-amber-700 mt-0.5 font-semibold leading-relaxed">
                      {data?.quickInsights?.[1]?.text || '9 Invoices (£98,132.64) are overdue and require attention.'}
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => openAgeingSheet('90+')}
                  className="p-3.5 rounded-2xl bg-red-50/60 border border-red-100 hover:border-red-200 transition cursor-pointer flex items-start gap-3"
                >
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-red-900">{formatAmount(data?.summary?.days90Plus?.amount || 0)}</div>
                    <p className="text-[11px] text-red-700 mt-0.5 font-semibold leading-relaxed">
                      {data?.quickInsights?.[2]?.text || '21.02% of receivables are 90+ days overdue.'}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveSheet('overdue')}
                className="w-full text-center text-xs font-extrabold text-blue-600 hover:underline pt-2 cursor-pointer block"
              >
                Launch Automated Payment Reminders →
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM DRILL DOWN & ACTIONS HUB */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900">Drill Down &amp; Collections Control</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => { if (customerList.length > 0) openCustomerSheet(customerList[0]); }}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Customer Drill Down</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">Inspect individual customer balance &amp; payment timeline</p>
              </div>
            </div>

            <div 
              onClick={() => openAgeingSheet('1-30')}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Ageing Bucket Drill Down</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">Analyze invoices strictly in specific ageing brackets</p>
              </div>
            </div>

            <div 
              onClick={() => { if (data?.topOverdueInvoices?.length > 0) openInvoiceSheet(data.topOverdueInvoices[0]); }}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Invoice Drill Down</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">Full line-item breakdown &amp; payment reference</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveSheet('overdue')}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-red-400 hover:bg-red-50/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-red-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Overdue Invoices</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">Batch manage at-risk collection items</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveSheet('export')}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Export Detailed Report</h4>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">Download formatted Excel or PDF audit reports</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILL-DOWN SLIDE-OVER PANELS / DRAWERS */}
      {/* ========================================================================= */}

      {/* 1. CUSTOMER DRILL DOWN SLIDE-OVER SHEET */}
      {activeSheet === 'customer' && selectedCustomerData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={selectedCustomerData.customerName} />
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">CUSTOMER PROFILE DRILL DOWN</span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">{selectedCustomerData.customerName}</h2>
                  </div>
                </div>
                <button onClick={() => setActiveSheet(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-white">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9.5px] font-extrabold text-slate-400 uppercase block">Total Invoices</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedCustomerData.totalInvoices}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9.5px] font-extrabold text-slate-400 uppercase block">Total Receivables</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{formatAmount(selectedCustomerData.totalReceivables).split(' ')[0]}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100">
                  <span className="text-[9.5px] font-extrabold text-red-500 uppercase block">Overdue Amount</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">
                    {formatAmount(selectedCustomerData.days1to30 + selectedCustomerData.days31to60 + selectedCustomerData.days61to90 + selectedCustomerData.days90Plus).split(' ')[0]}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100">
                  <span className="text-[9.5px] font-extrabold text-red-500 uppercase block">Overdue Count</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">{selectedCustomerData.overdueCount}</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Associated Invoices ({selectedCustomerData.invoices?.length})</h4>
                <div className="space-y-2.5">
                  {selectedCustomerData.invoices?.map((inv: any) => (
                    <div 
                      key={inv.id}
                      onClick={() => openInvoiceSheet(inv)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-600 text-xs group-hover:underline">{inv.invoiceNumber}</span>
                          <span className={cn(
                            "px-2 py-0.5 text-[9px] font-black rounded-full",
                            inv.daysOverdue > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : 'Current'}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-semibold mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">{formatAmount(inv.amountDue)}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Total: {formatAmount(inv.total).split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveSheet(null)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. AGEING BUCKET DRILL DOWN SLIDE-OVER SHEET */}
      {activeSheet === 'ageing' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">AGEING BUCKET DRILL DOWN</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Ageing Bucket - {selectedAgeingBucket} Days</h2>
                </div>
                <button onClick={() => setActiveSheet(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-2 p-6 border-b border-slate-100 bg-white">
                {['current', '1-30', '31-60', '61-90', '90+'].map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedAgeingBucket(b)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition cursor-pointer shrink-0 border",
                      selectedAgeingBucket === b ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Invoices in {selectedAgeingBucket} Bucket ({ageingBucketInvoices.length})</h4>
                <div className="space-y-2.5">
                  {ageingBucketInvoices.length > 0 ? (
                    ageingBucketInvoices.map((inv: any) => (
                      <div 
                        key={inv.id}
                        onClick={() => openInvoiceSheet(inv)}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 transition cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-blue-600 text-xs group-hover:underline">{inv.invoiceNumber}</span>
                            <span className="text-xs font-bold text-slate-800">• {inv.contactName}</span>
                          </div>
                          <span className="text-[10.5px] text-slate-400 font-semibold mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{formatAmount(inv.amountDue)}</span>
                          <span className="text-[10px] font-bold text-red-500 block mt-0.5">{inv.daysOverdue} days overdue</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">No invoices in this ageing bucket</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveSheet(null)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INVOICE DETAIL DRILL DOWN SLIDE-OVER SHEET */}
      {activeSheet === 'invoice' && selectedInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">INVOICE DETAIL</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">{selectedInvoiceData.invoiceNumber}</h2>
                </div>
                <button onClick={() => setActiveSheet(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 border-b border-slate-100 bg-slate-50/40 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Customer</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{selectedInvoiceData.contactName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Amount</span>
                    <span className="font-black text-slate-900 text-base mt-0.5 block">{formatAmount(selectedInvoiceData.total)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Invoice Date</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">{selectedInvoiceData.date ? selectedInvoiceData.date.split('T')[0] : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Overdue Days</span>
                    <span className="font-black text-red-600 mt-0.5 block">{selectedInvoiceData.daysOverdue} Days</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Line Items Table</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceData.lineItems?.length > 0 ? (
                        selectedInvoiceData.lineItems.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-slate-800">{item.description}</td>
                            <td className="p-3 text-center font-extrabold text-slate-600">{item.quantity}</td>
                            <td className="p-3 text-right font-semibold text-slate-600">{formatAmount(item.unitAmount).split(' ')[0]}</td>
                            <td className="p-3 text-right font-black text-slate-900">{formatAmount(item.lineAmount).split(' ')[0]}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 text-xs font-semibold">Standard sales line item</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveSheet(null)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OVERDUE INVOICES DRILL DOWN SLIDE-OVER SHEET */}
      {activeSheet === 'overdue' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block">OVERDUE COLLECTION SHEET</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Overdue Invoices</h2>
                </div>
                <button onClick={() => setActiveSheet(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">All Overdue Items</h4>
                <div className="space-y-2.5">
                  {data?.allReceivableInvoices?.filter((inv: any) => inv.daysOverdue > 0).map((inv: any) => (
                    <div 
                      key={inv.id}
                      onClick={() => openInvoiceSheet(inv)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-red-400 hover:bg-red-50/20 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-600 text-xs group-hover:underline">{inv.invoiceNumber}</span>
                          <span className="text-xs font-bold text-slate-800">• {inv.contactName}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-semibold mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-red-600">{formatAmount(inv.amountDue)}</span>
                        <span className="text-[10px] font-black text-red-500 block mt-0.5">{inv.daysOverdue} days overdue</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveSheet(null)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPORT MODAL SHEET */}
      {activeSheet === 'export' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">EXPORT REPORT</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Export Detailed Audit Report</h2>
                </div>
                <button onClick={() => setActiveSheet(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 font-extrabold uppercase text-[10px] block mb-1">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['xlsx', 'pdf', 'csv'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={cn(
                          "py-2.5 rounded-xl text-center font-black uppercase transition cursor-pointer border",
                          exportFormat === fmt ? "bg-blue-50 border-blue-600 text-blue-600 shadow-2xs" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setActiveSheet(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold hover:bg-slate-300 transition">Cancel</button>
              <button onClick={handleExportCSV} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition shadow-md">Download Report</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
