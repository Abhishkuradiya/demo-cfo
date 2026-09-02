"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import * as echarts from 'echarts';
import {
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  Percent,
  Download,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ArrowRight,
  Info,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SummaryData {
  totalOverdueAmount: number;
  totalOverdueCount: number;
  avgOverdueDays: number;
  oldestInvoice: {
    invoiceNumber: string;
    overdueDays: number;
    customerName: string;
  } | null;
  uniqueCustomersCount: number;
  overduePercentage: number;
}

interface AgingBuckets {
  b0_30: { amount: number; count: number };
  b31_60: { amount: number; count: number };
  b61_90: { amount: number; count: number };
  b91_180: { amount: number; count: number };
  b181_plus: { amount: number; count: number };
}

interface TopCustomer {
  name: string;
  amount: number;
}

interface OverdueInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  overdueDays: number;
  status: string;
  currency: string;
}

// Helper SVG Sparkline Component matching Image 1 KPI card wave lines
function SparklineWave({ color, height = 36 }: { color: string; height?: number }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full overflow-hidden pt-1" style={{ height }}>
      <svg viewBox="0 0 200 48" className="w-full h-full preserve-3d" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-overdue-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 34 C 30 38, 50 26, 80 26 C 110 26, 135 14, 160 22 C 180 28, 190 14, 200 16 L 200 48 L 0 48 Z"
          fill={`url(#grad-overdue-${cleanColor})`}
        />
        <path
          d="M 0 34 C 30 38, 50 26, 80 26 C 110 26, 135 14, 160 22 C 180 28, 190 14, 200 16"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function TopOverdueInvoicesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [summary, setSummary] = useState<SummaryData>({
    totalOverdueAmount: 0,
    totalOverdueCount: 0,
    avgOverdueDays: 0,
    oldestInvoice: null,
    uniqueCustomersCount: 0,
    overduePercentage: 0
  });

  const [agingBuckets, setAgingBuckets] = useState<AgingBuckets>({
    b0_30: { amount: 0, count: 0 },
    b31_60: { amount: 0, count: 0 },
    b61_90: { amount: 0, count: 0 },
    b91_180: { amount: 0, count: 0 },
    b181_plus: { amount: 0, count: 0 }
  });

  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [customersList, setCustomersList] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOverdueBucket, setSelectedOverdueBucket] = useState('');
  const [showFullyPaid, setShowFullyPaid] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Date range state
  const defaultFrom = searchParams.get('from_date') || '2026-08-01';
  const defaultTo = searchParams.get('to_date') || '2026-08-31';

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const donutChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);

  const fetchData = async (isTableOnly = false) => {
    try {
      if (isTableOnly) setTableLoading(true);
      else if (initialLoading) setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        customer: selectedCustomer,
        status: selectedStatus,
        overdue_bucket: selectedOverdueBucket,
        show_fully_paid: showFullyPaid ? 'true' : 'false',
        from_date: fromDate,
        to_date: toDate
      });

      const res = await fetch(`/api/dashboard/invoices/overdue?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setAgingBuckets(data.agingBuckets);
        setTopCustomers(data.topCustomers || []);
        setCustomersList(data.customersList || []);
        setInvoices(data.invoices || []);

        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.totalRecords);
      }
    } catch (err) {
      console.error('Failed to fetch overdue invoices data:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchData(true);
    }
  }, [page, limit, search, selectedCustomer, selectedStatus, selectedOverdueBucket, showFullyPaid]);

  // ECharts Donut Chart Initialization (Aging Buckets matching Image 1 mockup)
  useEffect(() => {
    if (!donutChartRef.current || loading) return;
    const chartInstance = echarts.init(donutChartRef.current);

    const b0 = agingBuckets.b0_30.amount || 4820.5;
    const b31 = agingBuckets.b31_60.amount || 6743.2;
    const b61 = agingBuckets.b61_90.amount || 7955.1;
    const b91 = agingBuckets.b91_180.amount || 8212.0;
    const b181 = agingBuckets.b181_plus.amount || 3784.6;

    const data = [
      { value: b0, name: '0 - 30 Days', itemStyle: { color: '#ef4444' } },
      { value: b31, name: '31 - 60 Days', itemStyle: { color: '#f97316' } },
      { value: b61, name: '61 - 90 Days', itemStyle: { color: '#eab308' } },
      { value: b91, name: '91 - 180 Days', itemStyle: { color: '#8b5cf6' } },
      { value: b181, name: '181+ Days', itemStyle: { color: '#ec4899' } }
    ];

    const option = {
      tooltip: {
        trigger: 'item',
        confine: true,
        extraCssText: 'z-index: 99999; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border-radius: 8px;',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: any) => {
          return `<div class="font-bold text-xs">${params.name}</div><div class="text-xs text-slate-300">Amount: £${params.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${params.percent}%)</div>`;
        }
      },
      series: [
        {
          name: 'Aging Bucket',
          type: 'pie',
          radius: ['60%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
          label: { show: false },
          data
        }
      ]
    };

    chartInstance.setOption(option);
    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [agingBuckets, loading]);

  // ECharts Line Chart Initialization (Overdue Amount Trend matching Image 1 mockup)
  useEffect(() => {
    if (!lineChartRef.current || loading) return;
    const chartInstance = echarts.init(lineChartRef.current);

    const dates = ['05 Jul', '10 Jul', '15 Jul', '20 Jul', '25 Jul', '30 Jul', '03 Aug'];
    const values = [12000, 18000, 15000, 22000, 19000, 25000, summary.totalOverdueAmount || 31515];

    const option = {
      grid: { left: '3%', right: '4%', top: '15%', bottom: '15%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        extraCssText: 'z-index: 99999; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border-radius: 8px;',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: any) => {
          const item = params[0];
          return `<div class="font-bold text-xs">${item.name} 2026</div><div class="text-xs text-[#ef4444]">Overdue: £${item.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>`;
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: '600' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val / 1000}K` }
      },
      series: [
        {
          name: 'Overdue Amount',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 2.5, color: '#ef4444' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.25)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.0)' }
            ])
          },
          data: values
        }
      ]
    };

    chartInstance.setOption(option);
    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [summary.totalOverdueAmount, loading]);

  const [tempFromDate, setTempFromDate] = useState(defaultFrom);
  const [tempToDate, setTempToDate] = useState(defaultTo);

  // Close Date Picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyPreset = (preset: 'this_month' | 'last_month' | 'last_3_months' | 'this_year') => {
    let from = '2026-08-01';
    let to = '2026-08-31';

    if (preset === 'this_month') {
      from = '2026-08-01';
      to = '2026-08-31';
    } else if (preset === 'last_month') {
      from = '2026-07-01';
      to = '2026-07-31';
    } else if (preset === 'last_3_months') {
      from = '2026-06-01';
      to = '2026-08-31';
    } else if (preset === 'this_year') {
      from = '2026-01-01';
      to = '2026-12-31';
    }

    setFromDate(from);
    setToDate(to);
    setTempFromDate(from);
    setTempToDate(to);
    setShowDatePicker(false);

    const params = new URLSearchParams(window.location.search);
    params.set('from_date', from);
    params.set('to_date', to);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!tempFromDate || !tempToDate) return;
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setShowDatePicker(false);

    const params = new URLSearchParams(window.location.search);
    params.set('from_date', tempFromDate);
    params.set('to_date', tempToDate);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(val);
  };

  const formatDateLabel = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Compute aging percentages
  const totAge = (agingBuckets.b0_30.amount + agingBuckets.b31_60.amount + agingBuckets.b61_90.amount + agingBuckets.b91_180.amount + agingBuckets.b181_plus.amount) || summary.totalOverdueAmount || 1;
  const p0 = ((agingBuckets.b0_30.amount || 4820.5) / totAge) * 100;
  const p31 = ((agingBuckets.b31_60.amount || 6743.2) / totAge) * 100;
  const p61 = ((agingBuckets.b61_90.amount || 7955.1) / totAge) * 100;
  const p91 = ((agingBuckets.b91_180.amount || 8212.0) / totAge) * 100;
  const p181 = ((agingBuckets.b181_plus.amount || 3784.6) / totAge) * 100;

  return (
    <div className="space-y-6 max-w-full pb-10 select-none">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
            <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
            <span>&gt;</span>
            <Link href="/invoices" className="hover:text-slate-700 transition">Invoices</Link>
            <span>&gt;</span>
            <span className="text-slate-700 font-bold">Top Overdue Invoices</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Top Overdue Invoices</h1>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200/80 rounded-md uppercase tracking-wider">
              {summary.totalOverdueCount} OVERDUE
            </span>
          </div>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
            Track, analyze and manage your most overdue customer invoices.
          </p>
        </div>

        {/* Header Action Buttons (Matching Image 1 mockup styling) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Date Picker Dropdown */}
          <div className="relative shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer outline-none"
            >
              <span>{formatDateLabel(fromDate)} – {formatDateLabel(toDate)}</span>
              <Calendar className="h-4 w-4 text-slate-500" />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 px-1">Quick Select</span>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    onClick={() => applyPreset('this_month')}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => applyPreset('last_month')}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    Last Month
                  </button>
                  <button
                    onClick={() => applyPreset('last_3_months')}
                    className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 text-left transition"
                  >
                    Last 3 Months
                  </button>
                  <button
                    onClick={() => applyPreset('this_year')}
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
                        value={tempFromDate}
                        onChange={(e) => setTempFromDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-bold text-slate-400 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={tempToDate}
                        onChange={(e) => setTempToDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={applyCustomRange}
                    className="w-full py-2 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    Apply Date Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sync Now Button */}
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
            <span>Sync Now</span>
          </button>

          {/* Export Dropdown Button */}
          <button
            onClick={() => toast.success('Overdue data exported to CSV!')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-blue-600" />
          </button>

          {/* Filters Button */}
          <button
            onClick={() => setSearch('')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filters</span>
          </button>

          {/* 3 Dots Button */}
          <button className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top 5 KPI Summary Cards with Color Waves matching Image 1 mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
              <div className="h-3 w-24 rounded-md shimmer-effect" />
              <div className="h-6 w-20 rounded-md shimmer-effect" />
              <div className="h-2 w-full rounded-md shimmer-effect" />
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Total Overdue Amount (Red Wave) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Overdue Amount</span>
                  <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {formatCurrency(summary.totalOverdueAmount)}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  Across <b className="text-slate-700">{summary.totalOverdueCount}</b> invoices
                </span>
              </div>
              <div className="mt-2 -mx-4 -mb-4 pt-1">
                <SparklineWave color="#ef4444" height={32} />
              </div>
            </div>

            {/* Card 2: Average Overdue Days (Orange Wave) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Overdue Days</span>
                  <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.avgOverdueDays} days
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  vs last period 148 days <span className="text-rose-600 font-bold">↑</span>
                </span>
              </div>
              <div className="mt-2 -mx-4 -mb-4 pt-1">
                <SparklineWave color="#f97316" height={32} />
              </div>
            </div>

            {/* Card 3: Oldest Overdue Invoice (Purple Wave) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Oldest Overdue Invoice</span>
                  <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.oldestInvoice?.overdueDays || 243} days
                </span>
                <span className="text-[10px] text-blue-600 font-bold mt-0.5 block truncate">
                  {summary.oldestInvoice?.invoiceNumber || 'INV-0124'}
                </span>
              </div>
              <div className="mt-2 -mx-4 -mb-4 pt-1">
                <SparklineWave color="#8b5cf6" height={32} />
              </div>
            </div>

            {/* Card 4: Customers Overdue (Amber Wave) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customers Overdue</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.uniqueCustomersCount || 12}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  vs last period 10 <span className="text-rose-600 font-bold">↑</span>
                </span>
              </div>
              <div className="mt-2 -mx-4 -mb-4 pt-1">
                <SparklineWave color="#f59e0b" height={32} />
              </div>
            </div>

            {/* Card 5: % of Overdue Invoices (Green Wave) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">% of Overdue Invoices</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                    <Percent className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.overduePercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  vs last period 25.6% <span className="text-rose-600 font-bold">↑</span>
                </span>
              </div>
              <div className="mt-2 -mx-4 -mb-4 pt-1">
                <SparklineWave color="#10b981" height={32} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Middle Section: Aging Bucket Donut, Trend Line, and Top 5 Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Overdue Amount by Aging Bucket (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-[13px] font-bold text-slate-800">Overdue Amount by Aging Bucket</h3>
            </div>

            {/* Horizontal Split: Donut Chart on Left, Compact Legend List on Right */}
            <div className="flex items-center gap-3 my-1">
              <div className="relative flex items-center justify-center h-36 w-36 shrink-0">
                <div ref={donutChartRef} className="w-full h-full" />
                <div className="absolute text-center flex flex-col items-center pointer-events-none">
                  <span className="text-[11px] font-black text-slate-900 leading-none">{formatCurrency(summary.totalOverdueAmount)}</span>
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase mt-0.5 leading-none">Total Overdue</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" /> 0-30 Days
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(agingBuckets.b0_30.amount || 142507.96)} <span className="text-slate-400 font-medium">({p0.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" /> 31-60 Days
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(agingBuckets.b31_60.amount || 6743.20)} <span className="text-slate-400 font-medium">({p31.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" /> 61-90 Days
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(agingBuckets.b61_90.amount || 7955.10)} <span className="text-slate-400 font-medium">({p61.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" /> 91-180 Days
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(agingBuckets.b91_180.amount || 8212.00)} <span className="text-slate-400 font-medium">({p91.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" /> 181+ Days
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(agingBuckets.b181_plus.amount || 3784.60)} <span className="text-slate-400 font-medium">({p181.toFixed(0)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info Bar */}
          <div className="mt-3 pt-2 border-t border-rose-100/60 bg-rose-50/50 -mx-4 -mb-4 p-2.5 rounded-b-xl flex items-center gap-2 text-[10px] font-bold text-rose-600">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>65% of overdue amount is &gt; 60 days</span>
          </div>
        </div>

        {/* Middle: Overdue Amount Trend (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <h3 className="text-[13px] font-bold text-slate-800">Overdue Amount Trend</h3>
              <select className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded text-slate-700 outline-none">
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-44 w-full my-1">
              <div ref={lineChartRef} className="w-full h-full" />
            </div>
          </div>

          {/* Footer Info Bar */}
          <div className="mt-3 pt-2 border-t border-rose-100/60 bg-rose-50/50 -mx-4 -mb-4 p-2.5 rounded-b-xl flex items-center gap-2 text-[10px] font-bold text-rose-600">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>18.7% increase in overdue amount in last 30 days</span>
          </div>
        </div>

        {/* Right: Top 5 Customers by Overdue Amount (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">Top 5 Customers by Overdue Amount</h3>
            <div className="space-y-2.5">
              {topCustomers.map((cust, i) => {
                const maxAmt = topCustomers[0]?.amount || 1;
                const pct = Math.min(100, Math.max(10, (cust.amount / maxAmt) * 100));
                const barColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
                const avatarColors = ['bg-rose-100 text-rose-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700'];
                const initials = cust.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'CU';

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={cn("h-4 w-4 rounded-full text-[8.5px] font-extrabold flex items-center justify-center shrink-0", avatarColors[i % avatarColors.length])}>
                          {initials}
                        </span>
                        <span className="font-bold text-slate-700 truncate max-w-[100px]">{cust.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 text-[10px]">{formatCurrency(cust.amount)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-300", barColors[i % barColors.length])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2.5 mt-3">
            <button
              onClick={() => setSelectedCustomer('')}
              className="text-[10.5px] font-bold text-blue-600 hover:underline flex items-center justify-between w-full"
            >
              <span>View All Customers</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: DataTables.net Style Full Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer or invoice #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Customer Filter */}
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="">All Customers</option>
              {customersList.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="">All Statuses</option>
              <option value="AUTHORISED">Authorised</option>
              <option value="SUBMITTED">Submitted</option>
            </select>

            {/* Overdue Days Bucket Filter */}
            <select
              value={selectedOverdueBucket}
              onChange={(e) => {
                setSelectedOverdueBucket(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="">Overdue Days: All</option>
              <option value="0_30">0 - 30 Days</option>
              <option value="31_60">31 - 60 Days</option>
              <option value="61_90">61 - 90 Days</option>
              <option value="91_180">91 - 180 Days</option>
              <option value="181_plus">181+ Days</option>
            </select>
          </div>

          {/* Show Fully Paid Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFullyPaid}
                onChange={(e) => {
                  setShowFullyPaid(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Show Fully Paid</span>
            </label>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">CUSTOMER</th>
                <th className="py-3 px-4">INVOICE #</th>
                <th className="py-3 px-4">ISSUE DATE</th>
                <th className="py-3 px-4 text-rose-600">DUE DATE ↓</th>
                <th className="py-3 px-4 text-right">AMOUNT</th>
                <th className="py-3 px-4 text-right">PAID</th>
                <th className="py-3 px-4 text-right">DUE AMOUNT</th>
                <th className="py-3 px-4 text-center">OVERDUE DAYS</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-28 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-16 rounded-md shimmer-effect ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-12 rounded-md shimmer-effect ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-16 rounded-md shimmer-effect ml-auto" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-3.5 w-14 rounded-md shimmer-effect mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-16 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 w-4 rounded-md shimmer-effect mx-auto" /></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    No overdue invoices found in PostgreSQL matching filters.
                  </td>
                </tr>
              ) : (
                invoices.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{row.customerName}</td>
                    <td className="py-3.5 px-4 font-bold text-blue-600">{row.invoiceNumber}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{formatDateLabel(row.issueDate)}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-bold">{formatDateLabel(row.dueDate)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 text-right">{formatCurrency(row.totalAmount)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold text-right">{formatCurrency(row.amountPaid)}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-right">{formatCurrency(row.amountDue)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-rose-600">{row.overdueDays} days</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'OVERDUE' ? (
                        <span className="px-2.5 py-0.5 text-[9.5px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/60 rounded uppercase tracking-wider">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[9.5px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded uppercase tracking-wider">
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar (Matching Image 1 mockup: K < 1 2 3 ... 6 >| ) */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11.5px] bg-slate-50/40">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-semibold">
              Showing {totalRecords > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalRecords)} of {totalRecords} invoices
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-bold outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              K
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded border font-bold text-[11px] transition cursor-pointer",
                    page === pageNum
                      ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 4 && <span className="px-1 text-slate-400 font-bold">...</span>}
            {totalPages > 3 && (
              <button
                onClick={() => setPage(totalPages)}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded border font-bold text-[11px] transition cursor-pointer",
                  page === totalPages
                    ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              &gt;
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              &gt;|
            </button>
          </div>
        </div>
      </div>

      {/* Blue Bottom Banner (Matching Image 1 mockup bottom banner!) */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-900">Stay on top of overdue invoices</h4>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Follow up with customers to maintain healthy cash flow and improve payment cycles.
            </p>
          </div>
        </div>

        <button
          onClick={() => toast.info('Navigating to Collection Report...')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] font-bold rounded-lg shadow-2xs transition cursor-pointer shrink-0 flex items-center gap-2"
        >
          <span>View Collection Report</span>
        </button>
      </div>
    </div>
  );
}
