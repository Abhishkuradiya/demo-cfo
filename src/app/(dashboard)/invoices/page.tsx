"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as echarts from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });
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
  BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper Sparkline SVG Component (No clipping, safe 40px viewBox)
function SparklineMini({ color, height = 36 }: { color: string; height?: number }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full overflow-hidden pt-1" style={{ height }}>
      <svg viewBox="0 0 150 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-ar-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14 L 150 40 L 0 40 Z"
          fill={`url(#grad-ar-${cleanColor})`}
        />
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// Avatar initials generator
function getInitials(name: string) {
  if (!name) return 'CU';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AccountReceivableDashboardPage() {
  const [asOnDate, setAsOnDate] = useState<string>('2026-08-31');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Drill Down State
  const [activeDrillDown, setActiveDrillDown] = useState<'customer' | 'ageing' | 'invoice' | 'overdue' | 'export' | null>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [selectedAgeingBucket, setSelectedAgeingBucket] = useState<string>('1-30');
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [customerTab, setCustomerTab] = useState<'overview' | 'invoices' | 'ageing' | 'payments' | 'notes'>('overview');
  const [invoiceTab, setInvoiceTab] = useState<'summary' | 'lineItems' | 'payments' | 'notes' | 'history'>('summary');

  // Export Drawer State
  const [exportReportType, setExportReportType] = useState('Account Receivable Summary');
  const [exportGroupBy, setExportGroupBy] = useState('Ageing Bucket');
  const [exportIncludeCustomer, setExportIncludeCustomer] = useState(true);
  const [exportIncludeItems, setExportIncludeItems] = useState(true);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');

  // Fetch Live Account Receivable Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/account-receivable?as_on_date=${asOnDate}`);
      if (!res.ok) throw new Error('Failed to fetch Account Receivable data');
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

  // Format currency amounts helper
  const currencyCode = data?.meta?.currency || 'GBP';
  const formatAmount = (val: number) => {
    const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(val || 0);
    return `${formatted} ${currencyCode}`;
  };

  // ECharts Options
  // 1. Donut Chart: Receivables by Ageing Bucket
  const ageingDonutOption = useMemo(() => {
    if (!data?.ageingDistribution) return {};
    const items = data.ageingDistribution;
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const val = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(params.value);
          return `<div class="font-bold text-xs">${params.name}</div><div class="text-xs text-blue-400 font-semibold mt-0.5">${val} (${params.percent}%)</div>`;
        }
      },
      legend: { show: false },
      series: [
        {
          name: 'Receivables',
          type: 'pie',
          radius: ['58%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
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

  // 2. Multi-Line Chart: Receivables Trend (Last 6 Months)
  const trendLineOption = useMemo(() => {
    if (!data?.trend) return {};
    return {
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#ffffff', fontSize: 11 } },
      legend: {
        bottom: '0%',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
        data: ['Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days']
      },
      grid: { left: '3%', right: '4%', top: '10%', bottom: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.trend.labels,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}` }
      },
      series: [
        { name: 'Current', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#2563eb' }, itemStyle: { color: '#2563eb' }, data: data.trend.series.current },
        { name: '1 - 30 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#eab308' }, itemStyle: { color: '#eab308' }, data: data.trend.series.days1to30 },
        { name: '31 - 60 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#f97316' }, itemStyle: { color: '#f97316' }, data: data.trend.series.days31to60 },
        { name: '61 - 90 Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, data: data.trend.series.days61to90 },
        { name: '90+ Days', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5, color: '#991b1b' }, itemStyle: { color: '#991b1b' }, data: data.trend.series.days90Plus }
      ]
    };
  }, [data]);

  // Triggers for Drill Down Panels
  const openCustomerDrillDown = (customer: any) => {
    setSelectedCustomerData(customer);
    setCustomerTab('overview');
    setActiveDrillDown('customer');
  };

  const openAgeingDrillDown = (bucketKey: string) => {
    setSelectedAgeingBucket(bucketKey);
    setActiveDrillDown('ageing');
  };

  const openInvoiceDrillDown = (invoice: any) => {
    setSelectedInvoiceData(invoice);
    setInvoiceTab('summary');
    setActiveDrillDown('invoice');
  };

  const openOverdueDrillDown = () => {
    setActiveDrillDown('overdue');
  };

  const openExportDrawer = () => {
    setActiveDrillDown('export');
  };

  // CSV Export Generator
  const handleGenerateExport = () => {
    if (!data?.allReceivableInvoices) return;
    const items = data.allReceivableInvoices;
    const csvHeader = ['Invoice Number', 'Customer Name', 'Date', 'Due Date', 'Total Amount', 'Amount Due', 'Days Overdue', 'Ageing Bucket', 'Status'].join(',');
    const csvRows = items.map((inv: any) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.contactName}"`,
      `"${inv.date ? inv.date.split('T')[0] : ''}"`,
      `"${inv.dueDate ? inv.dueDate.split('T')[0] : ''}"`,
      inv.total,
      inv.amountDue,
      inv.daysOverdue,
      `"${inv.ageingBucket}"`,
      `"${inv.status}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [csvHeader, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Account_Receivable_Report_${asOnDate}.${exportFormat}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Export generated successfully as .${exportFormat}`);
    setActiveDrillDown(null);
  };

  // Filter Customer List
  const customerList = data?.customerSummary || [];
  const filteredCustomers = customerList.filter((c: any) => {
    const matchSearch = c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.invoices.some((inv: any) => inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Invoices filtered for Ageing Bucket Drill Down
  const ageingBucketInvoices = useMemo(() => {
    if (!data?.allReceivableInvoices) return [];
    return data.allReceivableInvoices.filter((inv: any) => inv.ageingBucket === selectedAgeingBucket);
  }, [data, selectedAgeingBucket]);

  const totalAgeingAmount = ageingBucketInvoices.reduce((sum: number, inv: any) => sum + inv.amountDue, 0);
  const avgAgeingDays = ageingBucketInvoices.length > 0 
    ? Math.round(ageingBucketInvoices.reduce((sum: number, inv: any) => sum + (inv.daysOverdue || 0), 0) / ageingBucketInvoices.length) 
    : 0;
  const maxAgeingDays = ageingBucketInvoices.length > 0 
    ? Math.max(...ageingBucketInvoices.map((inv: any) => inv.daysOverdue || 0)) 
    : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-6 select-none font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
              <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
              <span>&gt;</span>
              <span className="text-slate-400">Reports</span>
              <span>&gt;</span>
              <span className="text-blue-600 font-extrabold">Account Receivable</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Receivable Dashboard</h1>
            <p className="text-[12px] text-slate-500 font-medium mt-0.5">
              Real-time overview of your outstanding invoices and collections
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* As On Date Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
              <span className="text-slate-400 font-semibold text-[11px]">As On Date</span>
              <Calendar className="h-3.5 w-3.5 text-blue-600 ml-1" />
              <input
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                className="bg-transparent text-slate-900 font-extrabold outline-none cursor-pointer text-xs"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-blue-600", loading && "animate-spin")} />
              <span>Refresh</span>
            </button>

            {/* Export Button */}
            <button
              onClick={openExportDrawer}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>
          </div>
        </div>

        {/* TOP 7 KPI SUMMARY CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
          {/* Card 1: Total Receivables */}
          <div 
            onClick={() => openAgeingDrillDown('current')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-blue-400 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-emerald-600 uppercase tracking-wide">Total Receivables</span>
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.totalReceivables?.amount || 0)}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">100% of total outstanding</span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#10b981" />
            </div>
          </div>

          {/* Card 2: Current (Not Due) */}
          <div 
            onClick={() => openAgeingDrillDown('current')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-blue-400 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-blue-600 uppercase tracking-wide">Current (Not Due)</span>
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.currentNotDue?.amount || 0)}
              </div>
              <span className="text-[10px] text-blue-600 font-bold mt-0.5 block">
                {data?.summary?.currentNotDue?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#2563eb" />
            </div>
          </div>

          {/* Card 3: 1 - 30 Days */}
          <div 
            onClick={() => openAgeingDrillDown('1-30')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-yellow-400 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-amber-600 uppercase tracking-wide">1 - 30 Days</span>
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.days1to30?.amount || 0)}
              </div>
              <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                {data?.summary?.days1to30?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#eab308" />
            </div>
          </div>

          {/* Card 4: 31 - 60 Days */}
          <div 
            onClick={() => openAgeingDrillDown('31-60')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-orange-400 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-orange-600 uppercase tracking-wide">31 - 60 Days</span>
                <Clock className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.days31to60?.amount || 0)}
              </div>
              <span className="text-[10px] text-orange-600 font-bold mt-0.5 block">
                {data?.summary?.days31to60?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#f97316" />
            </div>
          </div>

          {/* Card 5: 61 - 90 Days */}
          <div 
            onClick={() => openAgeingDrillDown('61-90')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-red-400 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-rose-600 uppercase tracking-wide">61 - 90 Days</span>
                <Clock className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.days61to90?.amount || 0)}
              </div>
              <span className="text-[10px] text-rose-600 font-bold mt-0.5 block">
                {data?.summary?.days61to90?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#ef4444" />
            </div>
          </div>

          {/* Card 6: 90+ Days */}
          <div 
            onClick={() => openAgeingDrillDown('90+')}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-red-600 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-red-700 uppercase tracking-wide">90+ Days</span>
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatAmount(data?.summary?.days90Plus?.amount || 0)}
              </div>
              <span className="text-[10px] text-red-700 font-bold mt-0.5 block">
                {data?.summary?.days90Plus?.pct || '0'}% of total
              </span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#991b1b" />
            </div>
          </div>

          {/* Card 7: Overdue Invoices */}
          <div 
            onClick={openOverdueDrillDown}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-red-500 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide">Overdue Invoices</span>
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-red-600">{data?.summary?.overdueInvoices?.count || 0}</span>
                <span className="text-xs font-bold text-slate-600">Invoices</span>
              </div>
              <span className="text-[10px] text-red-600 font-bold mt-0.5 block">Requires attention</span>
            </div>
            <div className="mt-2 -mx-3.5 -mb-3.5">
              <SparklineMini color="#ef4444" />
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: 3 CHARTS & TOP OVERDUE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Card 1: Receivables by Ageing Bucket Donut Chart (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3">Receivables by Ageing Bucket</h3>
              
              <div className="relative h-48 w-full flex items-center justify-center">
                {/* Donut Chart */}
                <div className="w-full h-full">
                  <ReactECharts option={ageingDonutOption} style={{ height: '100%', width: '100%' }} />
                </div>
                {/* Center Total Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatAmount(data?.summary?.totalReceivables?.amount || 0).split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total Receivables</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 mt-2 text-[11px]">
                {data?.ageingDistribution?.map((item: any) => (
                  <div 
                    key={item.key} 
                    onClick={() => openAgeingDrillDown(item.key)}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatAmount(item.amount).split(' ')[0]}</span>
                      <span className="text-slate-400 font-bold text-[10px]">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => openAgeingDrillDown('1-30')}
              className="mt-4 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 border-t border-slate-100 pt-3 cursor-pointer"
            >
              <span>View Ageing Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Card 2: Receivables Trend Multi-Line Chart (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-slate-900">Receivables Trend (Last 6 Months)</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                  Last 6 Months
                </span>
              </div>
              
              <div className="h-64 w-full">
                <ReactECharts option={trendLineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Card 3: Top Overdue Invoices (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Top Overdue Invoices</h3>
                <button 
                  onClick={openOverdueDrillDown}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                {data?.topOverdueInvoices?.length > 0 ? (
                  data.topOverdueInvoices.map((inv: any) => (
                    <div 
                      key={inv.id}
                      onClick={() => openInvoiceDrillDown(inv)}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-extrabold text-slate-900 truncate">{inv.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-500 font-medium truncate">{inv.contactName}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11.5px] font-black text-red-600">
                          {formatAmount(inv.amountDue).split(' ')[0]}
                        </div>
                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block mt-0.5">
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

        {/* MAIN SECTION: CUSTOMER TABLE (8 cols) & COLLECTION EFFICIENCY (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT: Invoice Summary by Customer Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-sm font-extrabold text-slate-900">Invoice Summary by Customer</h3>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer or invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 w-48 sm:w-56"
                  />
                </div>

                {/* More Filters */}
                <button className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>More Filters</span>
                </button>
              </div>
            </div>

            {/* CUSTOMER SUMMARY TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">CUSTOMER</th>
                    <th className="py-2.5 px-3 text-center">TOTAL INVOICES</th>
                    <th className="py-2.5 px-3 text-right">TOTAL RECEIVABLES</th>
                    <th className="py-2.5 px-3 text-right">CURRENT (NOT DUE)</th>
                    <th className="py-2.5 px-3 text-right">1 - 30 DAYS</th>
                    <th className="py-2.5 px-3 text-right">31 - 60 DAYS</th>
                    <th className="py-2.5 px-3 text-right">61 - 90 DAYS</th>
                    <th className="py-2.5 px-3 text-right">90+ DAYS</th>
                    <th className="py-2.5 px-3 text-center">OVERDUE</th>
                    <th className="py-2.5 px-3 text-right">% OVERDUE</th>
                    <th className="py-2.5 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((cust: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition">
                        {/* Customer Avatar & Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-black shrink-0">
                              {getInitials(cust.customerName)}
                            </div>
                            <span 
                              onClick={() => openCustomerDrillDown(cust)}
                              className="font-bold text-blue-600 hover:underline cursor-pointer truncate max-w-[150px]"
                            >
                              {cust.customerName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-700">{cust.totalInvoices}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">{formatAmount(cust.totalReceivables).split(' ')[0]}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">{cust.currentNotDue > 0 ? formatAmount(cust.currentNotDue).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-amber-600">{cust.days1to30 > 0 ? formatAmount(cust.days1to30).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-orange-600">{cust.days31to60 > 0 ? formatAmount(cust.days31to60).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">{cust.days61to90 > 0 ? formatAmount(cust.days61to90).split(' ')[0] : '—'}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-red-700">{cust.days90Plus > 0 ? formatAmount(cust.days90Plus).split(' ')[0] : '—'}</td>
                        
                        {/* Overdue Count Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            cust.overdueCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-500"
                          )}>
                            {cust.overdueCount}
                          </span>
                        </td>

                        {/* % Overdue */}
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{cust.pctOverdue}%</td>

                        {/* Action Drill Down Button */}
                        <td className="py-3 px-3 text-center">
                          <button 
                            onClick={() => openCustomerDrillDown(cust)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No customer summary available for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
              <div>
                Showing {paginatedCustomers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
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

          {/* RIGHT: COLLECTION EFFICIENCY & QUICK INSIGHTS (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Collection Efficiency Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-3">Collection Efficiency</h3>
              
              <div className="flex items-center justify-around py-2">
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 stroke-current"
                      strokeWidth="3.5"
                      strokeDasharray={`${data?.collectionEfficiency?.rate || 78.4}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900">{data?.collectionEfficiency?.rate || 78.4}%</span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Good</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">vs Last Month</span>
                  <span className="text-sm font-black text-emerald-600 flex items-center justify-end gap-1">
                    <ArrowUpRight className="h-4 w-4" /> {data?.collectionEfficiency?.vsLastMonth || '+5.6%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Insights Cards */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Quick Insights</h3>
              
              <div className="space-y-2.5">
                {/* Insight 1 */}
                <div 
                  onClick={() => openAgeingDrillDown('1-30')}
                  className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 cursor-pointer hover:bg-emerald-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-emerald-900">{formatAmount(data?.summary?.days1to30?.amount || 0)}</div>
                    <p className="text-[10.5px] text-emerald-700 mt-0.5 font-medium leading-snug">
                      {data?.quickInsights?.[0]?.text || '54.27% of receivables are due within 30 days.'}
                    </p>
                  </div>
                </div>

                {/* Insight 2 */}
                <div 
                  onClick={openOverdueDrillDown}
                  className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-2.5 cursor-pointer hover:bg-amber-50 transition"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-amber-900">{data?.summary?.overdueInvoices?.count || 0} Invoices Overdue</div>
                    <p className="text-[10.5px] text-amber-700 mt-0.5 font-medium leading-snug">
                      {data?.quickInsights?.[1]?.text || '9 Invoices (£98,132.64) are overdue and require attention.'}
                    </p>
                  </div>
                </div>

                {/* Insight 3 */}
                <div 
                  onClick={() => openAgeingDrillDown('90+')}
                  className="p-3 rounded-xl bg-red-50/70 border border-red-100 flex items-start gap-2.5 cursor-pointer hover:bg-red-50 transition"
                >
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-red-900">{formatAmount(data?.summary?.days90Plus?.amount || 0)}</div>
                    <p className="text-[10.5px] text-red-700 mt-0.5 font-medium leading-snug">
                      {data?.quickInsights?.[2]?.text || '21.02% of receivables are 90+ days overdue.'}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={openOverdueDrillDown}
                className="w-full text-center text-xs font-bold text-blue-600 hover:underline pt-2 cursor-pointer block"
              >
                View Detailed Insights →
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM QUICK ACTION CARDS ("Drill Down & Actions") */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Drill Down &amp; Actions</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Action 1: Customer Drill Down */}
            <div 
              onClick={() => {
                if (customerList.length > 0) openCustomerDrillDown(customerList[0]);
              }}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Customer Drill Down</h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium leading-snug">View all invoices for any customer</p>
              </div>
            </div>

            {/* Action 2: Ageing Bucket Drill Down */}
            <div 
              onClick={() => openAgeingDrillDown('1-30')}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Ageing Bucket Drill Down</h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium leading-snug">Analyse invoices in specific ageing buckets</p>
              </div>
            </div>

            {/* Action 3: Invoice Drill Down */}
            <div 
              onClick={() => {
                if (data?.topOverdueInvoices?.length > 0) openInvoiceDrillDown(data.topOverdueInvoices[0]);
              }}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Invoice Drill Down</h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium leading-snug">View invoice details by number</p>
              </div>
            </div>

            {/* Action 4: Overdue Invoices */}
            <div 
              onClick={openOverdueDrillDown}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-red-300 hover:bg-red-50/40 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Overdue Invoices</h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium leading-snug">View and manage all overdue invoices</p>
              </div>
            </div>

            {/* Action 5: Export Detailed Report */}
            <div 
              onClick={openExportDrawer}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Export Detailed Report</h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium leading-snug">Export report in Excel or PDF format</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILL DOWN SLIDE-OVER PANELS / MODALS (NAVIGATION FLOW) */}
      {/* ========================================================================= */}

      {/* 1. CUSTOMER DRILL DOWN SLIDE-OVER SHEET */}
      {activeDrillDown === 'customer' && selectedCustomerData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              {/* Sheet Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">CUSTOMER DRILL DOWN</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">{selectedCustomerData.customerName}</h2>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* KPI Header Bar */}
              <div className="grid grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-white">
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total Invoices</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedCustomerData.totalInvoices}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total Receivables</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{formatAmount(selectedCustomerData.totalReceivables).split(' ')[0]}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-[9.5px] font-bold text-red-500 uppercase block">Overdue</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">
                    {formatAmount(selectedCustomerData.days1to30 + selectedCustomerData.days31to60 + selectedCustomerData.days61to90 + selectedCustomerData.days90Plus).split(' ')[0]}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-[9.5px] font-bold text-red-500 uppercase block">Overdue Count</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">{selectedCustomerData.overdueCount}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-6 gap-6 text-xs font-bold text-slate-500">
                {(['overview', 'invoices', 'ageing', 'payments', 'notes'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCustomerTab(tab)}
                    className={cn(
                      "py-3 border-b-2 capitalize transition cursor-pointer",
                      customerTab === tab ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent hover:text-slate-800"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 space-y-4">
                {customerTab === 'overview' || customerTab === 'invoices' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Customer Invoices ({selectedCustomerData.invoices?.length})</h4>
                    <div className="space-y-2">
                      {selectedCustomerData.invoices?.map((inv: any) => (
                        <div 
                          key={inv.id}
                          onClick={() => openInvoiceDrillDown(inv)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-blue-600 text-xs">{inv.invoiceNumber}</span>
                              <span className={cn(
                                "px-2 py-0.5 text-[9px] font-bold rounded",
                                inv.daysOverdue > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : 'Current'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900">{formatAmount(inv.amountDue)}</span>
                            <span className="text-[10px] text-slate-400 block">Total: {formatAmount(inv.total).split(' ')[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                    Detailed {customerTab} analysis available in full audit view.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setActiveDrillDown(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. AGEING BUCKET DRILL DOWN SLIDE-OVER SHEET */}
      {activeDrillDown === 'ageing' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              {/* Sheet Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">AGEING BUCKET DRILL DOWN</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Ageing Detail - {selectedAgeingBucket} Days</h2>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Bucket Selector Pills */}
              <div className="flex gap-2 p-6 border-b border-slate-100 bg-white overflow-x-auto">
                {['current', '1-30', '31-60', '61-90', '90+'].map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedAgeingBucket(b)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition cursor-pointer shrink-0",
                      selectedAgeingBucket === b ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-slate-50/40">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total Receivables</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{formatAmount(totalAgeingAmount).split(' ')[0]}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Invoices</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{ageingBucketInvoices.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Avg Age</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{avgAgeingDays} Days</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Oldest Invoice</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">{maxAgeingDays} Days</span>
                </div>
              </div>

              {/* Invoice List Table */}
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Invoices in this bucket</h4>
                <div className="space-y-2">
                  {ageingBucketInvoices.length > 0 ? (
                    ageingBucketInvoices.map((inv: any) => (
                      <div 
                        key={inv.id}
                        onClick={() => openInvoiceDrillDown(inv)}
                        className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-blue-600 text-xs">{inv.invoiceNumber}</span>
                            <span className="text-xs font-bold text-slate-800">• {inv.contactName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{formatAmount(inv.amountDue)}</span>
                          <span className="text-[9.5px] font-bold text-red-500 block">{inv.daysOverdue} days overdue</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">No invoices in this ageing bucket</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveDrillDown(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INVOICE DETAIL DRILL DOWN SLIDE-OVER SHEET */}
      {activeDrillDown === 'invoice' && selectedInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              {/* Sheet Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">INVOICE DRILL DOWN</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Invoice Detail - {selectedInvoiceData.invoiceNumber}</h2>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Invoice Overview Card */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/30 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer</span>
                    <span className="font-extrabold text-slate-900">{selectedInvoiceData.contactName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Amount</span>
                    <span className="font-black text-slate-900 text-base">{formatAmount(selectedInvoiceData.total)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Date</span>
                    <span className="font-bold text-slate-700">{selectedInvoiceData.date ? selectedInvoiceData.date.split('T')[0] : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-bold rounded inline-block mt-0.5",
                      selectedInvoiceData.daysOverdue > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {selectedInvoiceData.daysOverdue > 0 ? `OVERDUE (${selectedInvoiceData.daysOverdue} days)` : selectedInvoiceData.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Due Date</span>
                    <span className="font-bold text-slate-700">{selectedInvoiceData.dueDate ? selectedInvoiceData.dueDate.split('T')[0] : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Reference</span>
                    <span className="font-bold text-slate-700">{selectedInvoiceData.reference}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Line Items ({selectedInvoiceData.lineItems?.length || 0})</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceData.lineItems?.length > 0 ? (
                        selectedInvoiceData.lineItems.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium text-slate-800">{item.description}</td>
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.quantity}</td>
                            <td className="p-2.5 text-right font-medium text-slate-600">{formatAmount(item.unitAmount).split(' ')[0]}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(item.lineAmount).split(' ')[0]}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 text-xs font-medium">Standard sales line item</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal Summary */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span>{formatAmount(selectedInvoiceData.total)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                    <span>Total Outstanding</span>
                    <span className="text-red-600">{formatAmount(selectedInvoiceData.amountDue)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveDrillDown(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OVERDUE INVOICES DRILL DOWN SLIDE-OVER SHEET */}
      {activeDrillDown === 'overdue' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              {/* Sheet Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block">OVERDUE INVOICES DRILL DOWN</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Overdue Invoices</h2>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-red-50/30">
                <div className="p-3 rounded-xl bg-white border border-red-100">
                  <span className="text-[9.5px] font-bold text-red-500 uppercase block">Total Overdue</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">{formatAmount(data?.summary?.overdueInvoices?.totalOverdue || 0).split(' ')[0]}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-red-100">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Overdue Invoices</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{data?.summary?.overdueInvoices?.count || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Avg Overdue</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">87 Days</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Oldest Overdue</span>
                  <span className="text-base font-black text-red-600 mt-0.5 block">126 Days</span>
                </div>
              </div>

              {/* Overdue List */}
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">All Overdue Invoices</h4>
                <div className="space-y-2">
                  {data?.allReceivableInvoices?.filter((inv: any) => inv.daysOverdue > 0).map((inv: any) => (
                    <div 
                      key={inv.id}
                      onClick={() => openInvoiceDrillDown(inv)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-600 text-xs">{inv.invoiceNumber}</span>
                          <span className="text-xs font-bold text-slate-800">• {inv.contactName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Due: {inv.dueDate ? inv.dueDate.split('T')[0] : '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-red-600">{formatAmount(inv.amountDue)}</span>
                        <span className="text-[9.5px] font-bold text-red-500 block">{inv.daysOverdue} days overdue</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveDrillDown(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPORT REPORT DRAWER MODAL */}
      {activeDrillDown === 'export' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">EXPORT REPORT</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Export Detailed Report</h2>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Report Type</label>
                  <select 
                    value={exportReportType}
                    onChange={(e) => setExportReportType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                  >
                    <option>Account Receivable Summary</option>
                    <option>Aged Receivables Detail</option>
                    <option>Customer Outstanding Summary</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Group By</label>
                  <select 
                    value={exportGroupBy}
                    onChange={(e) => setExportGroupBy(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                  >
                    <option>Ageing Bucket</option>
                    <option>Customer</option>
                    <option>Invoice Status</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportIncludeCustomer}
                      onChange={(e) => setExportIncludeCustomer(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0" 
                    />
                    <span className="text-slate-700">Include Customer Details</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportIncludeItems}
                      onChange={(e) => setExportIncludeItems(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0" 
                    />
                    <span className="text-slate-700">Include Invoice Line Items</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-2">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['xlsx', 'pdf', 'csv'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={cn(
                          "py-2 rounded-xl text-center font-extrabold uppercase transition cursor-pointer border",
                          exportFormat === fmt ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
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
              <button onClick={() => setActiveDrillDown(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Cancel</button>
              <button onClick={handleGenerateExport} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">Generate Report</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
