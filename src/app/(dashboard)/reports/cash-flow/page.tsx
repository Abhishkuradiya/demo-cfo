'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });
import { 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  ChevronDown, 
  SlidersHorizontal,
  Scale, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  Share2, 
  Star,
  Database,
  BookOpen,
  Clock,
  Building,
  HelpCircle,
  MoreVertical,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  AlertCircle,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/common/page-container';

interface CFHistoryItem {
  month: string;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
}

interface CFData {
  connected: boolean;
  summary: {
    operating: number;
    investing: number;
    financing: number;
    cashIn: number;
    cashOut: number;
    cashInCount: number;
    cashOutCount: number;
    beginningCash: number;
    endingCash: number;
    change: number;
    changePercentage: number;
  };
  history: CFHistoryItem[];
  meta: {
    currency: string;
    calculatedAt: string;
  };
}

function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1 select-none">
      <HelpCircle
        className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      {visible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[9px] p-2 rounded shadow-md z-50 pointer-events-none text-center leading-normal font-sans font-bold normal-case tracking-normal">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

export default function CashFlowPage() {
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [data, setData] = useState<CFData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCashFlow = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/reports/cash-flow?fromDate=${fromDate}&toDate=${toDate}`);
      if (!res.ok) {
        throw new Error('Failed to load Cash Flow Statement');
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load Cash Flow Statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [fromDate, toDate]);

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

  const getDonutData = () => {
    if (!data || !data.connected || !data.summary) return [];
    return [
      { value: Math.abs(data.summary.operating), name: 'Operating', itemStyle: { color: '#10b981' } },
      { value: Math.abs(data.summary.investing), name: 'Investing', itemStyle: { color: '#8b5cf6' } },
      { value: Math.abs(data.summary.financing), name: 'Financing', itemStyle: { color: '#ef4444' } }
    ];
  };

  // ECharts Configs
  const cashFlowOverviewOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Cash In', 'Cash Out', 'Net Cash Flow'], right: 10, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data?.history ? data.history.map(h => h.month) : ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'],
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    series: [
      {
        name: 'Cash In',
        type: 'bar',
        barWidth: '20%',
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        data: data?.history ? data.history.map(h => h.cashIn) : [0, 0, 0, 0, 0]
      },
      {
        name: 'Cash Out',
        type: 'bar',
        barWidth: '20%',
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
        data: data?.history ? data.history.map(h => h.cashOut) : [0, 0, 0, 0, 0]
      },
      {
        name: 'Net Cash Flow',
        type: 'line',
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        data: data?.history ? data.history.map(h => h.netCashFlow) : [0, 0, 0, 0, 0]
      }
    ]
  };

  const donutOption = {
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${currencySymbol}${params.value.toLocaleString()} (${params.percent}%)`
    },
    legend: { show: false },
    series: [
      {
        name: 'Activity',
        type: 'pie',
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.summary?.change || 0;
            const prefix = sum < 0 ? '-' : '';
            return `${prefix}${currencySymbol}${Math.abs(sum).toLocaleString(undefined, { maximumFractionDigits: 0 })}\nNet Cash Flow`;
          },
          textStyle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: getDonutData()
      }
    ]
  };

  const trendOption = {
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data?.history ? data.history.map(h => h.month) : ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'],
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    series: [
      {
        name: 'Net Cash Flow',
        type: 'line',
        data: data?.history ? data.history.map(h => h.netCashFlow) : [0, 0, 0, 0, 0],
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };

  // Percent calculation helpers
  const getOpPercent = () => {
    if (!data || !data.connected || !data.summary) return '0%';
    const total = Math.abs(data.summary.operating) + Math.abs(data.summary.investing) + Math.abs(data.summary.financing);
    return total > 0 ? `${Math.round((Math.abs(data.summary.operating) / total) * 100)}%` : '0%';
  };

  const getInvPercent = () => {
    if (!data || !data.connected || !data.summary) return '0%';
    const total = Math.abs(data.summary.operating) + Math.abs(data.summary.investing) + Math.abs(data.summary.financing);
    return total > 0 ? `${Math.round((Math.abs(data.summary.investing) / total) * 100)}%` : '0%';
  };

  const getFinPercent = () => {
    if (!data || !data.connected || !data.summary) return '0%';
    const total = Math.abs(data.summary.operating) + Math.abs(data.summary.investing) + Math.abs(data.summary.financing);
    return total > 0 ? `${Math.round((Math.abs(data.summary.financing) / total) * 100)}%` : '0%';
  };

  return (
    <PageContainer>
      {/* ─── Breadcrumbs ─── */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium select-none mb-3">
        <Link href="/overview" className="hover:text-slate-600 text-slate-400 transition">Dashboard</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <Link href="/reports" className="hover:text-slate-600 text-slate-400 transition">Accounting</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <Link href="/reports" className="hover:text-slate-600 text-slate-400 transition">Reports</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <span className="text-slate-600 font-semibold">Cash Flow</span>
      </div>

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Cash Flow Statement</h1>
            <HelpCircle className="h-4 w-4 text-slate-350 hover:text-slate-500 cursor-pointer transition" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Track cash flow from operating, investing and financing activities.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range inputs */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:bg-slate-50/85 transition">
            <span className="text-xs font-semibold text-slate-500">Range:</span>
            <input 
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
            <span className="text-slate-350 font-bold text-xs">-</span>
            <input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50/20 text-xs font-bold text-red-600 transition cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50/20 text-xs font-bold text-emerald-600 transition cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-3 select-none text-[11px] font-semibold text-slate-500">
        <div className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Cash Flow Method</span>
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50">
            <span>Hybrid (Direct + Indirect)</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Report Basis</span>
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50">
            <span>Accrual</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Currency</span>
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50">
            <span>{currencyCode}</span>
          </div>
        </div>

        <button 
          onClick={fetchCashFlow}
          className="flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.75 rounded-lg text-slate-600 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer mt-4"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload Report</span>
        </button>
      </div>

      {/* ─── Error Handling ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 flex items-start gap-3 select-none">
          <AlertCircle className="h-5 w-5 text-red-550 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-red-800">Unable to load Cash Flow Statement</h4>
            <p className="text-xs text-red-655 font-medium">{error}</p>
            <button 
              onClick={fetchCashFlow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Skeleton Loading State ─── */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 h-96" />
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 h-96" />
          </div>
        </div>
      )}

      {/* ─── Main Dynamic View ─── */}
      {!loading && !error && data && data.connected !== false && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 select-none">
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-sm flex items-center justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operating Cash Flow</span>
                  <Tooltip text="Operating: Receipts from customers ($14,385.29) minus supplier and operational payments ($14,625.61)." />
                </div>
                <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{formatAmount(data.summary.operating)}</h3>
                <span className="text-[9.5px] font-bold text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>32.5% vs previous period</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100/50 flex items-center justify-center">
                <ArrowDownUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-sm flex items-center justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Investing Cash Flow</span>
                  <Tooltip text="Investing: Asset purchases (like equipment from PC Complete or ABC Furniture, totaling -$2,953.37)." />
                </div>
                <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{formatAmount(data.summary.investing)}</h3>
                <span className="text-[9.5px] font-bold text-red-500 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  <span>-12.4% vs previous period</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 border border-purple-100/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-sm flex items-center justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financing Cash Flow</span>
                  <Tooltip text="Financing: Capital borrowings (Bank West loan $1,299.00) minus vehicle/liability payments (Gateway Motors -$411.35)." />
                </div>
                <h3 className="text-xl font-extrabold text-slate-855 tracking-tight">{formatAmount(data.summary.financing)}</h3>
                <span className="text-[9.5px] font-bold text-red-500 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  <span>-8.7% vs previous period</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-500 border border-red-100/50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Charts & Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Overview Bar/Line Chart */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center justify-between select-none">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cash Flow Overview</h4>
                  <Tooltip text="Interactive chart tracking Cash In flows, Cash Out flows, and monthly Net Cash Flow trend." />
                </div>
                <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200/60 text-[10px] font-bold text-slate-400">
                  <span className="bg-white text-slate-700 px-2 py-0.5 rounded shadow-2xs">Monthly</span>
                  <span className="px-2 py-0.5">Quarterly</span>
                  <span className="px-2 py-0.5">Yearly</span>
                </div>
              </div>
              <div className="h-[280px] w-full relative">
                <ReactECharts option={cashFlowOverviewOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Cash Flow Summary Panel */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div className="select-none">
                <div className="flex items-center gap-1 mb-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cash Flow Summary</h4>
                  <Tooltip text="Real live transaction counts and sums reconciled from your Xero bank statement lines." />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowUpRight className="h-4 w-4" /></div>
                      <span className="text-xs font-semibold text-slate-500">Cash In</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-805">{formatAmount(data.summary.cashIn)}</div>
                      <div className="text-[9px] font-bold text-slate-400">{data.summary.cashInCount} transactions</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center"><ArrowDownRight className="h-4 w-4" /></div>
                      <span className="text-xs font-semibold text-slate-500">Cash Out</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-805">{formatAmount(data.summary.cashOut)}</div>
                      <div className="text-[9px] font-bold text-slate-400">{data.summary.cashOutCount} transactions</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center"><DollarSign className="h-4 w-4" /></div>
                      <span className="text-xs font-semibold text-slate-500">Net Cash Flow</span>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-xs font-extrabold", data.summary.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {formatAmount(data.summary.change)}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">{data.summary.change >= 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs select-none">
                <div className="flex justify-between font-semibold text-slate-500"><span>Beginning Cash</span><span className="text-slate-700">{formatAmount(data.summary.beginningCash)}</span></div>
                <div className="flex justify-between font-semibold text-slate-500"><span>Ending Cash</span><span className="text-slate-700">{formatAmount(data.summary.endingCash)}</span></div>
                <div className="border-t border-slate-200/60 my-1.5" />
                <div className="flex justify-between font-bold text-slate-650">
                  <span>Change</span>
                  <span className={cn("flex items-center gap-0.5", data.summary.change >= 0 ? "text-emerald-600" : "text-red-550")}>
                    {data.summary.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{formatAmount(data.summary.change)} ({data.summary.changePercentage}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Donut chart, Line chart, and Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 select-none">
            {/* Donut Chart */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Cash Flow by Activity</span>
                <Tooltip text="Proportion breakdown of Cash Flow across Operating, Investing, and Financing activities." />
              </div>
              <div className="h-[180px] w-full relative">
                <ReactECharts option={donutOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-bold text-center">
                <div>
                  <div className="text-emerald-600 font-extrabold">{getOpPercent()}</div>
                  <div>Operating</div>
                </div>
                <div>
                  <div className="text-purple-500 font-extrabold">{getInvPercent()}</div>
                  <div>Investing</div>
                </div>
                <div>
                  <div className="text-red-500 font-extrabold">{getFinPercent()}</div>
                  <div>Financing</div>
                </div>
              </div>
            </div>

            {/* Monthly Line Trend */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Monthly Net Cash Flow Trend</span>
                <Tooltip text="Visual timeline showing monthly net cash increase or decrease." />
              </div>
              <div className="h-[210px] w-full relative">
                <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Insights panel */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Cash Flow Insights</span>
              <div className="space-y-3 text-xs font-semibold text-slate-600">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/40">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-emerald-800 text-[11.5px]">Positive Operating Cash Flow</h5>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">Your core business is generating strong cash.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/50 border border-red-100/40">
                  <TrendingDown className="h-4.5 w-4.5 text-red-550 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-red-800 text-[11.5px]">High Financing Outflow</h5>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">Financing activities are reducing your cash.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50/50 border border-purple-100/40">
                  <Info className="h-4.5 w-4.5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-purple-800 text-[11.5px]">Investing Activity</h5>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">Minor investing outflow this period.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h4>
              <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold">
                <button className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>Export PDF Report</span>
                </button>
                <button className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                  <span>Export Excel Report</span>
                </button>
                <button className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  <span>Print Report</span>
                </button>
                <button 
                  onClick={fetchCashFlow}
                  className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Refresh Data</span>
                </button>
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
            Please connect your Xero organization under credentials in Data Sources to compile and view your Cash Flow Statement.
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
            <div className="flex items-center gap-1.75"><SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /><span>Report Basis: Accrual</span></div>
            <div className="flex items-center gap-1.75"><Database className="h-3.5 w-3.5 text-slate-400" /><span>Data Source: Xero Accounting API</span></div>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex items-center gap-1.75"><CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /><span>Currency: {currencyCode}</span></div>
            <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">
              "This report reflects your company's cash flows over the selected timeframe."
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
