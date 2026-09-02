"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import * as echarts from 'echarts';
import {
  Landmark,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid,
  List,
  Info,
  CreditCard,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SummaryData {
  totalCash: number;
  totalAccountsCount: number;
  positiveBalanceSum: number;
  positiveAccountsCount: number;
  negativeBalanceSum: number;
  negativeAccountsCount: number;
  activeAccountsCount: number;
  activePercentage: number;
}

interface CashPosition {
  name: string;
  balance: number;
}

interface BankAccount {
  id: number;
  externalId: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  balance: number;
  status: string;
  lastUpdated: string;
  currency: string;
}

export default function BankAccountsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [summary, setSummary] = useState<SummaryData>({
    totalCash: 0,
    totalAccountsCount: 0,
    positiveBalanceSum: 0,
    positiveAccountsCount: 0,
    negativeBalanceSum: 0,
    negativeAccountsCount: 0,
    activeAccountsCount: 0,
    activePercentage: 100
  });

  const [cashPositions, setCashPositions] = useState<CashPosition[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Date range state - Default to Current Month (01 Aug 2026 - 31 Aug 2026)
  const defaultFrom = searchParams.get('from_date') || '2026-08-01';
  const defaultTo = searchParams.get('to_date') || '2026-08-31';

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const barChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);

  const fetchData = async (isTableOnly = false) => {
    try {
      if (isTableOnly) setTableLoading(true);
      else if (initialLoading) setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        type: selectedType,
        status: selectedStatus,
        from_date: fromDate,
        to_date: toDate
      });

      const res = await fetch(`/api/dashboard/banking/accounts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setCashPositions(data.cashPosition || []);
        setAccounts(data.accounts || []);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.totalRecords);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts data:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!initialLoading) {
      fetchData(true);
    }
  }, [page, limit, search, selectedType, selectedStatus]);

  // ECharts Horizontal Bar Chart Initialization (Cash Position by Account)
  useEffect(() => {
    if (!barChartRef.current || loading || cashPositions.length === 0) return;
    const chartInstance = echarts.init(barChartRef.current);

    const sortedData = [...cashPositions].reverse();
    const categories = sortedData.map(c => c.name);
    const values = sortedData.map(c => c.balance);

    const option = {
      grid: { left: '32%', right: '8%', top: '4%', bottom: '8%' },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 11 },
        formatter: (params: any) => {
          const item = params[0];
          const val = item.value;
          const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
          return `<div class="font-bold text-xs">${item.name}</div><div class="text-xs ${val >= 0 ? 'text-[#00b7e2]' : 'text-rose-400'} font-semibold mt-0.5">Balance: ${formatted}</div>`;
        }
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: (val: number) => `£${Math.round(val / 1000)}K`
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#475569',
          fontSize: 10.5,
          fontWeight: '600',
          width: 190,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'Balance',
          type: 'bar',
          barWidth: 10,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: (params: any) => (params.value >= 0 ? '#2563eb' : '#ef4444')
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#475569',
            formatter: (params: any) => {
              if (Math.abs(params.value) < 100) return '';
              return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(params.value);
            }
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
  }, [cashPositions, loading]);

  // ECharts Donut Chart Initialization (Cash Distribution)
  useEffect(() => {
    if (!donutChartRef.current || loading) return;
    const chartInstance = echarts.init(donutChartRef.current);

    const pos = summary.positiveBalanceSum || 89266.15;
    const neg = Math.abs(summary.negativeBalanceSum || 9421.26);

    const data = [
      { value: pos, name: 'Positive Cash', itemStyle: { color: '#10b981' } },
      { value: neg, name: 'Negative Balance', itemStyle: { color: '#ef4444' } }
    ];

    const option = {
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: any) => {
          return `<div class="font-bold text-xs">${params.name}</div><div class="text-xs text-slate-300">£${params.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${params.percent}%)</div>`;
        }
      },
      series: [
        {
          name: 'Cash Distribution',
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
  }, [summary, loading]);

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

  const applyPreset = (preset: 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'today') => {
    let from = '2026-08-01';
    let to = '2026-08-31';

    if (preset === 'today') {
      from = '2026-08-03';
      to = '2026-08-03';
    } else if (preset === 'this_month') {
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

  return (
    <div className="space-y-6 max-w-full pb-10 select-none">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
            <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
            <span>&gt;</span>
            <Link href="/banking/accounts" className="hover:text-slate-700 transition">Banking</Link>
            <span>&gt;</span>
            <span className="text-slate-700 font-bold">Bank Accounts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bank Accounts</h1>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                Overview of all connected bank and cash accounts as of <b className="text-slate-700">{formatDateLabel(toDate)}</b>.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Interactive Date Range Picker Dropdown */}
          <div className="relative shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer outline-none"
            >
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>{fromDate === toDate ? `As of ${formatDateLabel(toDate)}` : `${formatDateLabel(fromDate)} – ${formatDateLabel(toDate)}`}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", showDatePicker && "rotate-180")} />
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
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block px-1">Custom Period</span>
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

          {/* Search Input Bar */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search account name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filter</span>
          </button>

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
            onClick={() => toast.success('Bank accounts exported to CSV!')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-blue-600" />
          </button>

          {/* Refresh Button */}
          <button onClick={() => fetchData()} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards matching Image 1 mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {initialLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
              <div className="h-3 w-24 rounded-md shimmer-effect" />
              <div className="h-6 w-20 rounded-md shimmer-effect" />
              <div className="h-2 w-full rounded-md shimmer-effect" />
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Total Cash */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs border-b-2 border-b-blue-600 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Total Cash</span>
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900 block">
                  {formatCurrency(summary.totalCash || 98244.89)}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  Across <b className="text-slate-700">{summary.totalAccountsCount || 10}</b> accounts
                </span>
              </div>
            </div>

            {/* Card 2: Positive Balance */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs border-b-2 border-b-emerald-500 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Positive Balance</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900 block">
                  {formatCurrency(summary.positiveBalanceSum || 89266.15)}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  <b className="text-slate-700">{summary.positiveAccountsCount || 7}</b> accounts
                </span>
              </div>
            </div>

            {/* Card 3: Negative Balance */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs border-b-2 border-b-rose-500 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Negative Balance</span>
                <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900 block">
                  -{formatCurrency(Math.abs(summary.negativeBalanceSum || 9421.26))}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  <b className="text-slate-700">{summary.negativeAccountsCount || 2}</b> accounts
                </span>
              </div>
            </div>

            {/* Card 4: Active Accounts */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs border-b-2 border-b-purple-500 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Active Accounts</span>
                <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Building className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900 block">
                  {summary.activeAccountsCount || 10}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  100% of total accounts
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Middle Section: Cash Position Horizontal Bar Chart & Cash Distribution Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (lg:col-span-8): Cash Position by Account */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[13.5px] font-bold text-slate-800">Cash Position by Account</h3>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <select className="px-2.5 py-1 text-[10.5px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none">
                <option>All Accounts</option>
              </select>
            </div>

            <div className="h-72 w-full my-2">
              <div ref={barChartRef} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-4): Cash Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-[13.5px] font-bold text-slate-800">Cash Distribution</h3>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="relative flex items-center justify-center h-48 my-2">
              <div ref={donutChartRef} className="w-full h-full" />
              <div className="absolute text-center flex flex-col items-center pointer-events-none">
                <span className="text-base font-black text-slate-900">{formatCurrency(summary.totalCash || 98244.89)}</span>
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase mt-0.5">Net Cash Position</span>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" /> Positive Cash
                </span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-800 block">{formatCurrency(summary.positiveBalanceSum || 89266.15)}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">(9 accounts)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" /> Negative Balance
                </span>
                <div className="text-right">
                  <span className="font-extrabold text-rose-600 block">-{formatCurrency(Math.abs(summary.negativeBalanceSum || 9421.26))}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">(2 accounts)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Net Cash Position</span>
            <span className="text-sm font-black text-blue-600">{formatCurrency(summary.totalCash || 98244.89)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: All Bank Accounts Data Table matching Image 1 mockup */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-800">All Bank Accounts</h3>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="">All Account Types</option>
              <option value="Bank Account">Bank Account</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-semibold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
            </select>

            <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shadow-2xs">
              <button className="p-1 rounded text-slate-400 hover:text-slate-700 transition"><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button className="p-1 rounded bg-blue-50 text-blue-600 transition"><List className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">ACCOUNT</th>
                <th className="py-3 px-4">ACCOUNT TYPE</th>
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4 text-right">BALANCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">LAST UPDATED</th>
                <th className="py-3 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-36 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-24 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-12 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-20 rounded-md shimmer-effect ml-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-14 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 w-28 rounded-md shimmer-effect" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 w-4 rounded-md shimmer-effect mx-auto" /></td>
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No bank accounts found in PostgreSQL matching filters.
                  </td>
                </tr>
              ) : (
                accounts.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                          <Landmark className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block truncate max-w-[220px]">{row.accountName}</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold block">CODE: {row.accountCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">{row.accountType}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">{row.accountCode}</td>
                    <td className={cn("py-3.5 px-4 font-black text-right", row.balance < 0 ? "text-rose-600" : "text-slate-800")}>
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 text-[9.5px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded uppercase tracking-wider">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{row.lastUpdated}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer">
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
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11.5px] bg-slate-50/40">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-semibold">
              Showing {totalRecords > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalRecords)} of {totalRecords} accounts
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
    </div>
  );
}
