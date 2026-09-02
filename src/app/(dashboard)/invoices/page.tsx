"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import * as echarts from 'echarts';
import {
  Search,
  Calendar,
  FileText,
  Clock,
  Hourglass,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  MoreHorizontal,
  ArrowRight,
  FileCheck,
  Check,
  Landmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  contactName: string;
  status: string;
  type: string;
  date: string | null;
  dueDate: string | null;
  total: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
}

interface SummaryData {
  totalCount: number;
  draft: { count: number; pct: string };
  awaitingApproval: { count: number; pct: string };
  awaitingPayment: { count: number; pct: string };
  paid: { count: number; pct: string };
}

interface TrendData {
  labels: string[];
  series: {
    draft: number[];
    awaitingApproval: number[];
    awaitingPayment: number[];
    paid: number[];
  };
}

interface PaginationData {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  startIndex: number;
  endIndex: number;
}

export default function InvoiceStatusSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedContact, setSelectedContact] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [timeframe, setTimeframe] = useState<string>('Last 6 Months');

  // Page-level Date Range Filter state (Default to Current Month e.g., 01 Aug 2026 - 31 Aug 2026)
  const defaultFrom = searchParams.get('from_date') || '2026-08-01';
  const defaultTo = searchParams.get('to_date') || '2026-08-31';

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [tempFromDate, setTempFromDate] = useState<string>(defaultFrom);
  const [tempToDate, setTempToDate] = useState<string>(defaultTo);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [summary, setSummary] = useState<SummaryData>({
    totalCount: 0,
    draft: { count: 0, pct: '0' },
    awaitingApproval: { count: 0, pct: '0' },
    awaitingPayment: { count: 0, pct: '0' },
    paid: { count: 0, pct: '0' }
  });

  const [trend, setTrend] = useState<TrendData>({
    labels: ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'],
    series: {
      draft: [0, 0, 0, 0, 0, 0],
      awaitingApproval: [0, 0, 0, 0, 0, 0],
      awaitingPayment: [0, 0, 0, 0, 0, 0],
      paid: [0, 0, 0, 0, 0, 0]
    }
  });

  const [pagination, setPagination] = useState<PaginationData>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    startIndex: 0,
    endIndex: 0
  });

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [currency, setCurrency] = useState<string>('USD');

  const trendChartRef = useRef<HTMLDivElement>(null);

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

  // Read status URL parameter on mount
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
    const fromParam = searchParams.get('from_date');
    const toParam = searchParams.get('to_date');
    if (fromParam) {
      setFromDate(fromParam);
      setTempFromDate(fromParam);
    }
    if (toParam) {
      setToDate(toParam);
      setTempToDate(toParam);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [contactsList, setContactsList] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      if (initialLoading) {
        setLoading(true);
      }
      setTableLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedContact !== 'ALL') params.append('contact', selectedContact);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      params.append('page', String(currentPage));
      params.append('limit', String(pageSize));

      const res = await fetch(`/api/dashboard/invoices-summary?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary);
        setTrend(json.trend);
        setPagination(json.pagination);
        setInvoices(json.invoices || []);
        if (json.meta?.currency) setCurrency(json.meta.currency);
        if (json.meta?.contacts) setContactsList(json.meta.contacts);
      }
    } catch (err) {
      console.error('Failed to fetch invoice summary data:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedStatus, selectedType, selectedContact, currentPage, pageSize, fromDate, toDate]);

  // ECharts Initialization for Status Trend Line Chart
  useEffect(() => {
    if (!trendChartRef.current || loading) return;
    const chartInstance = echarts.init(trendChartRef.current);

    const option = {
      grid: {
        left: '2%',
        right: '2%',
        top: '6%',
        bottom: '16%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#334155', fontSize: 11, fontFamily: 'sans-serif' },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border-radius: 8px;'
      },
      legend: {
        bottom: '0',
        left: 'center',
        icon: 'circle',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 28,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: '700' }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trend.labels && trend.labels.length > 0 ? trend.labels : ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 500 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 300,
        interval: 50,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      series: [
        {
          name: 'Draft',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#94a3b8' },
          itemStyle: { color: '#94a3b8' },
          data: trend.series.draft
        },
        {
          name: 'Awaiting Approval',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#eab308' },
          itemStyle: { color: '#eab308' },
          data: trend.series.awaitingApproval
        },
        {
          name: 'Awaiting Payment',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#f97316' },
          itemStyle: { color: '#f97316' },
          data: trend.series.awaitingPayment
        },
        {
          name: 'Paid',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          data: trend.series.paid
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
  }, [trend, loading]);

  const donutChartRef = useRef<HTMLDivElement>(null);

  // ECharts Initialization for Invoice Status Distribution Donut Chart (With Rich Hover Tooltips)
  useEffect(() => {
    if (!donutChartRef.current || loading) return;
    const chartInstance = echarts.init(donutChartRef.current);

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#1e293b', fontSize: 12, fontFamily: 'sans-serif' },
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 10px;',
        formatter: (params: any) => {
          return `<div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${params.color};"></span>
                    <span>${params.name}</span>
                  </div>
                  <div style="font-size: 11px; color: #475569; padding-left: 18px;">Invoices: <b style="color: #0f172a; font-weight: 800;">${params.value}</b></div>
                  <div style="font-size: 11px; color: #475569; padding-left: 18px;">Share: <b style="color: #0f172a; font-weight: 800;">${params.percent}%</b></div>`;
        }
      },
      series: [
        {
          name: 'Invoice Status Distribution',
          type: 'pie',
          radius: ['64%', '84%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#ffffff',
            borderWidth: 2.5
          },
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 6
          },
          labelLine: { show: false },
          data: [
            { value: summary.paid.count, name: 'Paid', itemStyle: { color: '#10b981' } },
            { value: summary.awaitingPayment.count, name: 'Awaiting Payment', itemStyle: { color: '#f97316' } },
            { value: summary.draft.count, name: 'Draft', itemStyle: { color: '#94a3b8' } },
            { value: summary.awaitingApproval.count, name: 'Awaiting Approval', itemStyle: { color: '#eab308' } }
          ]
        }
      ]
    };

    chartInstance.setOption(option);

    chartInstance.on('click', (params: any) => {
      if (params.name) {
        setSelectedStatus(params.name.toUpperCase());
        setCurrentPage(1);
      }
    });

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [summary, loading]);

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
    setCurrentPage(1);

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
    setCurrentPage(1);

    const params = new URLSearchParams(window.location.search);
    params.set('from_date', tempFromDate);
    params.set('to_date', tempToDate);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const formatCurrency = (val: number, customCurr = '') => {
    const c = customCurr || currency;
    if (c === 'INR') return '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(val);
    if (c === 'GBP') return '£' + new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2 }).format(val);
    if (c === 'EUR') return '€' + new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(val);
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(val);
  };

  const formatDateLabel = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    if (s === 'PAID') {
      return 'bg-emerald-50 text-emerald-600 border-emerald-200/60';
    }
    if (s === 'AWAITING PAYMENT' || s === 'AUTHORISED') {
      return 'bg-amber-50 text-amber-600 border-amber-200/60';
    }
    if (s === 'AWAITING APPROVAL' || s === 'SUBMITTED') {
      return 'bg-blue-50 text-blue-600 border-blue-200/60';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-full pb-10 select-none">
      {/* Top Header Bar & Page-Level Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
            <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
            <span>&gt;</span>
            <span className="text-slate-700 font-bold">Invoice Status Summary</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice Status Summary</h1>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">
            Overview of all invoice statuses in your organization.
          </p>
        </div>

        {/* Page-Level Interactive Date Selector Dropdown */}
        <div className="relative shrink-0" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer outline-none"
          >
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>{formatDateLabel(fromDate)} – {formatDateLabel(toDate)}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", showDatePicker && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
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
      </div>

      {/* Top 5 KPI Summary Cards (With Shimmer Effect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between min-h-[120px] animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-slate-200/80 rounded" />
                <div className="h-8 w-8 rounded-lg bg-slate-100" />
              </div>
              <div className="mt-3">
                <div className="h-7 w-16 bg-slate-200 rounded" />
                <div className="h-2.5 w-10 bg-slate-100 rounded mt-1.5" />
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2.5" />
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Total Receivables (Emerald Green Gradient Card - Income / Receivables) */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 shadow-sm text-white flex items-start justify-between min-h-[120px] relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[11px] font-bold text-emerald-100">Total Receivables</span>
                <span className="text-3xl font-black text-white mt-1 block">{summary.totalCount.toLocaleString()}</span>
                <span className="text-[10.5px] font-semibold text-emerald-100 mt-1 block">Invoices</span>
                <span className="text-[9.5px] text-emerald-100/80 font-medium mt-1 block">Period: {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white shrink-0 relative z-10 backdrop-blur-xs">
                <FileText className="h-6 w-6 stroke-[1.8]" />
              </div>
              {/* Subtle background watermark icon */}
              <div className="absolute -right-3 -bottom-3 text-white/10 pointer-events-none">
                <Landmark className="h-24 w-24 stroke-[1]" />
              </div>
            </div>

            {/* Card 2: Draft */}
            <div
              onClick={() => setSelectedStatus(selectedStatus === 'DRAFT' ? 'ALL' : 'DRAFT')}
              className={cn(
                "bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xs min-h-[120px]",
                selectedStatus === 'DRAFT' ? "border-slate-400 ring-2 ring-slate-400/20" : "border-slate-200/80 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Draft</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100">
                  <FileCheck className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{summary.draft.count}</span>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{summary.draft.pct}%</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${summary.draft.pct}%` }} />
                </div>
              </div>
            </div>

            {/* Card 3: Awaiting Approval */}
            <div
              onClick={() => setSelectedStatus(selectedStatus === 'AWAITING APPROVAL' ? 'ALL' : 'AWAITING APPROVAL')}
              className={cn(
                "bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xs min-h-[120px]",
                selectedStatus === 'AWAITING APPROVAL' ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-200/80 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Awaiting Approval</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 border border-amber-100">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{summary.awaitingApproval.count}</span>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{summary.awaitingApproval.pct}%</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${summary.awaitingApproval.pct}%` }} />
                </div>
              </div>
            </div>

            {/* Card 4: Awaiting Payment */}
            <div
              onClick={() => setSelectedStatus(selectedStatus === 'AWAITING PAYMENT' ? 'ALL' : 'AWAITING PAYMENT')}
              className={cn(
                "bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xs min-h-[120px]",
                selectedStatus === 'AWAITING PAYMENT' ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200/80 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Awaiting Payment</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500 border border-orange-100">
                  <Hourglass className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{summary.awaitingPayment.count}</span>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{summary.awaitingPayment.pct}%</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${summary.awaitingPayment.pct}%` }} />
                </div>
              </div>
            </div>

            {/* Card 5: Paid */}
            <div
              onClick={() => setSelectedStatus(selectedStatus === 'PAID' ? 'ALL' : 'PAID')}
              className={cn(
                "bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xs min-h-[120px]",
                selectedStatus === 'PAID' ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Paid</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{summary.paid.count}</span>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{summary.paid.pct}%</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${summary.paid.pct}%` }} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Middle Row: Charts (Donut Distribution + Line Trend Chart) with Shimmer Effect */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[300px]">
          <h3 className="text-[13.5px] font-bold text-slate-800 border-b border-slate-100 pb-3">Invoice Status Distribution</h3>

          {initialLoading ? (
            <div className="flex items-center justify-between py-6 animate-pulse">
              <div className="h-40 w-40 rounded-full border-8 border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
                <div className="h-10 w-16 bg-slate-200/70 rounded" />
              </div>
              <div className="flex-1 pl-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-3 w-28 bg-slate-200/80 rounded" />
                    <div className="h-3 w-10 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-4">
              {/* Interactive ECharts Donut */}
              <div className="relative flex items-center justify-center h-44 w-44 shrink-0">
                <div ref={donutChartRef} className="w-full h-full cursor-pointer" />
                <div className="absolute text-center flex flex-col items-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">{summary.totalCount}</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase mt-0.5 leading-none tracking-wider">TOTAL</span>
                </div>
              </div>

              {/* Interactive Legends Breakdown List */}
              <div className="flex-1 pl-6 space-y-2 text-[11px]">
                <div 
                  onClick={() => { setSelectedStatus('DRAFT'); setCurrentPage(1); }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="font-semibold text-slate-600">Draft</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">{summary.draft.count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold w-10 text-right">{summary.draft.pct}%</span>
                  </div>
                </div>

                <div 
                  onClick={() => { setSelectedStatus('AWAITING APPROVAL'); setCurrentPage(1); }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="font-semibold text-slate-600">Awaiting Approval</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">{summary.awaitingApproval.count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold w-10 text-right">{summary.awaitingApproval.pct}%</span>
                  </div>
                </div>

                <div 
                  onClick={() => { setSelectedStatus('AWAITING PAYMENT'); setCurrentPage(1); }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span className="font-semibold text-slate-600">Awaiting Payment</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">{summary.awaitingPayment.count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold w-10 text-right">{summary.awaitingPayment.pct}%</span>
                  </div>
                </div>

                <div 
                  onClick={() => { setSelectedStatus('PAID'); setCurrentPage(1); }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-600">Paid</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">{summary.paid.count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold w-10 text-right">{summary.paid.pct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Status Trend Line Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-[13.5px] font-bold text-slate-800">Status Trend</h3>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none cursor-pointer"
            >
              <option value="Last 6 Months">Last 6 Months</option>
              <option value="Last 12 Months">Last 12 Months</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          {initialLoading ? (
            <div className="h-56 w-full mt-4 flex items-end justify-between gap-4 px-4 pb-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-100 rounded-t" style={{ height: `${30 + (i * 15) % 65}%` }} />
                  <div className="h-2.5 w-10 bg-slate-200/70 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-56 w-full mt-2">
              <div ref={trendChartRef} className="w-full h-full" />
            </div>
          )}
        </div>
      </div>

      {/* Main Invoices Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Controls Header Bar: Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoices by number, customer, or reference..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Statuses Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-[11.5px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none cursor-pointer focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="AWAITING APPROVAL">Awaiting Approval</option>
              <option value="AWAITING PAYMENT">Awaiting Payment</option>
              <option value="PAID">Paid</option>
            </select>


            {/* Contacts Filter */}
            <select
              value={selectedContact}
              onChange={(e) => {
                setSelectedContact(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-[11.5px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none cursor-pointer focus:border-primary max-w-[170px] truncate"
            >
              <option value="ALL">All Contacts</option>
              {contactsList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* More Filters button */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>More Filters</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown button */}
            <button
              onClick={() => toast.info('Exporting Invoices summary list...')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
            >
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* View All Invoices Primary Button */}
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedType('ALL');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 px-4 py-1.5 text-[11.5px] font-bold text-white bg-[#0064eb] hover:bg-blue-700 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <span>View All Invoices</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-extrabold text-slate-500">INVOICE #</th>
                <th className="py-3 px-4 font-extrabold text-slate-500">CONTACT</th>
                <th className="py-3 px-4 font-extrabold text-slate-500">STATUS</th>
                <th className="py-3 px-4 font-extrabold text-slate-500">TYPE</th>
                <th className="py-3 px-4 font-extrabold text-slate-500">INVOICE DATE</th>
                <th className="py-3 px-4 font-extrabold text-slate-500">DUE DATE</th>
                <th className="py-3 px-4 text-right font-extrabold text-slate-500">AMOUNT</th>
                <th className="py-3 px-4 text-right font-extrabold text-slate-500">AMOUNT DUE</th>
                <th className="py-3 px-4 text-center font-extrabold text-slate-500">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableLoading || initialLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-slate-200/80 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-32 bg-slate-200/80 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-24 bg-slate-100 rounded-md" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-14 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-20 bg-slate-200/80 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-20 bg-slate-200/80 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 w-4 bg-slate-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-350 mb-3 shadow-2xs">
                        <FileText className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <h4 className="text-[13px] font-bold text-slate-700">No Invoices Found in PostgreSQL</h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        No invoices matched your selected search, filter, or date range parameters in your database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{row.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 truncate max-w-[180px]">{row.contactName}</td>
                    <td className="py-3.5 px-4">
                      <span className={cn("px-2 py-0.5 text-[9.5px] font-extrabold uppercase rounded border tracking-wider", getStatusBadge(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500 text-[10.5px]">{row.type}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">{formatDate(row.date)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">{formatDate(row.dueDate)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                      {formatCurrency(row.total, row.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                      {formatCurrency(row.amountDue, row.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px]">
          <div className="text-slate-400 font-semibold">
            Showing <span className="font-bold text-slate-700">{pagination.startIndex}</span> to{' '}
            <span className="font-bold text-slate-700">{pagination.endIndex}</span> of{' '}
            <span className="font-bold text-slate-700">{pagination.totalItems}</span> invoices
          </div>

          <div className="flex items-center gap-4">
            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 cursor-pointer transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded text-[11px] font-bold transition cursor-pointer",
                      pagination.currentPage === pageNum
                        ? "border border-blue-600 bg-white text-blue-600 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {pagination.totalPages > 5 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded text-[11px] font-bold transition cursor-pointer",
                      pagination.currentPage === pagination.totalPages
                        ? "border border-blue-600 bg-white text-blue-600 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}

              <button
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 cursor-pointer transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Items per page selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded text-slate-700 outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
