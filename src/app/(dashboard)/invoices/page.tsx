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
  ChevronRight,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldAlert,
  SlidersHorizontal,
  PieChart,
  BarChart3,
  CreditCard,
  ChevronUp,
  Download,
  ArrowRight,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// Clean Mini Sparkline (40px viewBox)
function StripeSparkline({ color, height = 36 }: { color: string; height?: number }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full overflow-hidden relative pt-1" style={{ height }}>
      <svg viewBox="0 0 160 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-stripe-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14 L 150 40 L 0 40 Z"
          fill={`url(#grad-stripe-${cleanColor})`}
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

export default function AccountReceivableDashboardPage() {
  const [asOnDate, setAsOnDate] = useState<string>('2026-08-31');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'overdue' | 'ageing'>('overview');

  // Inline Table Expansion & Filtering
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeingBucket, setSelectedAgeingBucket] = useState<string>('1-30');
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
          return `<div class="p-1"><div class="font-bold text-xs text-slate-300">${params.name}</div><div class="text-sm font-black text-blue-400 mt-0.5">${val} (${params.percent}%)</div></div>`;
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
            itemStyle: { color: item.color }
          }))
        }
      ]
    };
  }, [data, currencyCode]);

  // Expanded Receivables Trend ECharts Config (Fills entire card without whitespace)
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

  // Filter Customer Summary
  const customerList = data?.customerSummary || [];
  const filteredCustomers = customerList.filter((c: any) => {
    return c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.invoices.some((inv: any) => inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Invoices for Ageing Tab
  const ageingBucketInvoices = useMemo(() => {
    if (!data?.allReceivableInvoices) return [];
    return data.allReceivableInvoices.filter((inv: any) => inv.ageingBucket === selectedAgeingBucket);
  }, [data, selectedAgeingBucket]);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-6 select-none font-sans text-slate-800">
      <div className="max-w-[1640px] mx-auto space-y-6">
        
        {/* ========================================================================= */}
        {/* HEADER BAR */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
                <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
                <span>&gt;</span>
                <span className="text-slate-400">Reports</span>
                <span>&gt;</span>
                <span className="text-slate-700 font-bold">Account Receivable</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Receivable Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time financial overview of your outstanding receivables, customer ageing, and collection trends.
              </p>
            </div>

            {/* Top Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* As On Date Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-slate-400 text-[11px]">As On Date</span>
                <input
                  type="date"
                  value={asOnDate}
                  onChange={(e) => setAsOnDate(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-blue-600", loading && "animate-spin")} />
                <span>Refresh</span>
              </button>

              {/* CSV Export Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* INLINE TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                activeTab === 'overview' ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                activeTab === 'customers' ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <User className="h-3.5 w-3.5" />
              <span>Customer Summary</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-white">{customerList.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                activeTab === 'overdue' ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span>Overdue Invoices</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white">{overdueCountVal}</span>
            </button>

            <button
              onClick={() => setActiveTab('ageing')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                activeTab === 'ageing' ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Ageing Breakdown</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4 PRIMARY CLEAR METRIC CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Receivables */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL RECEIVABLES</span>
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                {formatAmount(totalReceivablesVal)}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">100% of total outstanding balance</span>
            </div>
            <div className="mt-2 -mx-4 -mb-4">
              <StripeSparkline color="#10b981" />
            </div>
          </div>

          {/* Card 2: Current (Not Due) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CURRENT (NOT DUE)</span>
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                {formatAmount(currentNotDueVal)}
              </div>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
                {data?.summary?.currentNotDue?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-4 -mb-4">
              <StripeSparkline color="#2563eb" />
            </div>
          </div>

          {/* Card 3: Overdue Balance */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL OVERDUE</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                {formatAmount(overdueTotalVal)}
              </div>
              <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                {overdueCountVal} Invoices overdue
              </span>
            </div>
            <div className="mt-2 -mx-4 -mb-4">
              <StripeSparkline color="#f59e0b" />
            </div>
          </div>

          {/* Card 4: 90+ Days Overdue */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">90+ DAYS OVERDUE</span>
                <ShieldAlert className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-extrabold text-red-600 mt-1.5 tracking-tight">
                {formatAmount(highRiskVal)}
              </div>
              <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                {data?.summary?.days90Plus?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-4 -mb-4">
              <StripeSparkline color="#ef4444" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT 1: OVERVIEW TAB (FEATURING FULL-HEIGHT EXPANDED TREND GRAPH) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Donut Distribution (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-3">Ageing Distribution</h3>
                  
                  <div className="relative h-48 w-full flex items-center justify-center">
                    <ReactECharts option={ageingDonutOption} style={{ height: '100%', width: '100%' }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatAmount(totalReceivablesVal).split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase">Total Receivables</span>
                    </div>
                  </div>

                  {/* Ageing List */}
                  <div className="space-y-1.5 mt-2 text-[11.5px]">
                    {data?.ageingDistribution?.map((item: any) => (
                      <div 
                        key={item.key}
                        onClick={() => {
                          setSelectedAgeingBucket(item.key);
                          setActiveTab('ageing');
                        }}
                        className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
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
                  className="mt-4 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 border-t border-slate-100 pt-3 cursor-pointer"
                >
                  <span>View Ageing Breakdown</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Receivables Trend (5 cols) - FULL EXPANDED GRAPH (NO BOTTOM WHITESPACE) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-extrabold text-slate-900">Receivables Trend</h3>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Last 6 Months
                    </span>
                  </div>
                  
                  {/* Chart fills full height of card */}
                  <div className="h-[340px] w-full flex-1">
                    <ReactECharts option={trendLineOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Top Overdue Accounts (3 cols) */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h3 className="text-sm font-extrabold text-slate-900">Top Overdue Invoices</h3>
                    <button 
                      onClick={() => setActiveTab('overdue')}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      View All <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {data?.topOverdueInvoices?.length > 0 ? (
                      data.topOverdueInvoices.map((inv: any) => (
                        <div 
                          key={inv.id}
                          className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 transition flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StripeAvatar name={inv.contactName} />
                            <div className="min-w-0">
                              <div className="text-[11.5px] font-bold text-slate-900 truncate">{inv.invoiceNumber}</div>
                              <div className="text-[10px] text-slate-500 truncate">{inv.contactName}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11.5px] font-extrabold text-red-600">
                              {formatAmount(inv.amountDue).split(' ')[0]}
                            </div>
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded border border-red-100 inline-block mt-0.5">
                              {inv.daysOverdue} days
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">No overdue invoices</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Overview Table Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
                      <th className="py-2.5 px-3">CUSTOMER</th>
                      <th className="py-2.5 px-3 text-center">INVOICES</th>
                      <th className="py-2.5 px-3 text-right">TOTAL RECEIVABLES</th>
                      <th className="py-2.5 px-3 text-right">CURRENT</th>
                      <th className="py-2.5 px-3 text-right">1 - 30 DAYS</th>
                      <th className="py-2.5 px-3 text-right">31 - 60 DAYS</th>
                      <th className="py-2.5 px-3 text-right">61 - 90 DAYS</th>
                      <th className="py-2.5 px-3 text-right">90+ DAYS</th>
                      <th className="py-2.5 px-3 text-center">OVERDUE</th>
                      <th className="py-2.5 px-3 text-right">% OVERDUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11.5px]">
                    {paginatedCustomers.map((cust: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <StripeAvatar name={cust.customerName} />
                            <span className="font-bold text-slate-800">{cust.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">{cust.totalInvoices}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            cust.overdueCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-500"
                          )}>
                            {cust.overdueCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{cust.pctOverdue}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 2: CUSTOMER SUMMARY TAB (WITH INLINE EXPANDING ROWS) */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Customer Receivables Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Click on any row to toggle &amp; inspect invoice details inline.</p>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">CUSTOMER</th>
                    <th className="py-2.5 px-3 text-center">INVOICES</th>
                    <th className="py-2.5 px-3 text-right">TOTAL RECEIVABLES</th>
                    <th className="py-2.5 px-3 text-right">CURRENT</th>
                    <th className="py-2.5 px-3 text-right">1 - 30 DAYS</th>
                    <th className="py-2.5 px-3 text-right">31 - 60 DAYS</th>
                    <th className="py-2.5 px-3 text-right">61 - 90 DAYS</th>
                    <th className="py-2.5 px-3 text-right">90+ DAYS</th>
                    <th className="py-2.5 px-3 text-center">OVERDUE</th>
                    <th className="py-2.5 px-3 text-right">% OVERDUE</th>
                    <th className="py-2.5 px-3 text-center">EXPAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {filteredCustomers.map((cust: any, i: number) => {
                    const isExpanded = expandedCustomer === cust.customerName;
                    return (
                      <React.Fragment key={i}>
                        <tr 
                          onClick={() => setExpandedCustomer(isExpanded ? null : cust.customerName)}
                          className={cn("hover:bg-slate-50 transition cursor-pointer", isExpanded && "bg-blue-50/30")}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <StripeAvatar name={cust.customerName} />
                              <span className="font-bold text-slate-900">{cust.customerName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700">{cust.totalInvoices}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                          <td className="py-3 px-3 text-right font-medium text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                          <td className="py-3 px-3 text-right font-medium text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                          <td className="py-3 px-3 text-right font-medium text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold",
                              cust.overdueCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-500"
                            )}>
                              {cust.overdueCount}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">{cust.pctOverdue}%</td>
                          <td className="py-3 px-3 text-center">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-blue-600 inline" /> : <ChevronDown className="h-4 w-4 text-slate-400 inline" />}
                          </td>
                        </tr>

                        {/* INLINE EXPANDED INVOICES ROW */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={11} className="p-4">
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-xs font-extrabold text-slate-800">Invoices for {cust.customerName} ({cust.invoices?.length})</span>
                                  <span className="text-[11px] font-bold text-slate-500">Total Receivables: {formatAmount(cust.totalReceivables)}</span>
                                </div>

                                <div className="divide-y divide-slate-100 text-xs">
                                  {cust.invoices?.map((inv: any) => (
                                    <div key={inv.id} className="py-2 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="font-extrabold text-blue-600">{inv.invoiceNumber}</span>
                                        <span className="text-slate-500">Date: {inv.date ? inv.date.split('T')[0] : '—'}</span>
                                        <span className="text-slate-500">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={cn(
                                          "px-2 py-0.5 text-[10px] font-bold rounded",
                                          inv.daysOverdue > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                          {inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : 'Current'}
                                        </span>
                                        <span className="font-extrabold text-slate-900">{formatAmount(inv.amountDue)}</span>
                                      </div>
                                    </div>
                                  ))}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 3: OVERDUE INVOICES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'overdue' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">All Overdue Invoices</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Total Overdue: <span className="text-red-600 font-bold">{formatAmount(overdueTotalVal)}</span> across {overdueInvoicesList.length} invoices.</p>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition"
              >
                <Download className="h-3.5 w-3.5" /> Export Overdue List
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">INVOICE #</th>
                    <th className="py-2.5 px-3">CUSTOMER</th>
                    <th className="py-2.5 px-3">DUE DATE</th>
                    <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT DUE</th>
                    <th className="py-2.5 px-3 text-center">DAYS OVERDUE</th>
                    <th className="py-2.5 px-3 text-center">AGEING BUCKET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {overdueInvoicesList.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-extrabold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{inv.contactName}</td>
                      <td className="py-3 px-3 text-slate-600">{inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">{formatAmount(inv.total)}</td>
                      <td className="py-3 px-3 text-right font-black text-red-600">{formatAmount(inv.amountDue)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded text-[10px] border border-red-100">
                          {inv.daysOverdue} days
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700 uppercase">{inv.ageingBucket}</td>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Ageing Bucket Analysis</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Filter receivables by specific ageing buckets.</p>
              </div>

              {/* Bucket Selection Pills */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                {['current', '1-30', '31-60', '61-90', '90+'].map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedAgeingBucket(b)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer",
                      selectedAgeingBucket === b ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
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
                    <th className="py-2.5 px-3">INVOICE #</th>
                    <th className="py-2.5 px-3">CUSTOMER</th>
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">DUE DATE</th>
                    <th className="py-2.5 px-3 text-right">TOTAL</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT DUE</th>
                    <th className="py-2.5 px-3 text-center">OVERDUE DAYS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {ageingBucketInvoices.length > 0 ? (
                    ageingBucketInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-extrabold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{inv.contactName}</td>
                        <td className="py-3 px-3 text-slate-600">{inv.date ? inv.date.split('T')[0] : '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">{formatAmount(inv.total)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{formatAmount(inv.amountDue)}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{inv.daysOverdue} days</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">No invoices in {selectedAgeingBucket} ageing bucket</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
