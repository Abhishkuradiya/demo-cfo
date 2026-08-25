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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/common/page-container';

interface PLItem {
  name: string;
  value: number;
}

interface PLData {
  connected: boolean;
  summary: {
    revenue: number;
    expenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    grossProfitMargin: number;
  };
  income: {
    operating: PLItem[];
    other: PLItem[];
  };
  cogs?: PLItem[];
  expenses: {
    operating: PLItem[];
    other: PLItem[];
  };
  trends?: {
    month: string;
    revenue: number;
    expenses: number;
    netProfit: number;
  }[];
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

export default function ProfitAndLossPage() {
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfitAndLoss = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/reports/profit-and-loss?fromDate=${fromDate}&toDate=${toDate}`);
      if (!res.ok) {
        throw new Error('Failed to load Profit & Loss Statement');
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load Profit & Loss Statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitAndLoss();
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
    return `${currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  const getExpenseBreakdown = () => {
    if (!data || !data.connected || !data.expenses) return [];
    const list: any[] = [];
    data.expenses.operating.forEach(item => {
      if (item.value > 0) list.push({ value: item.value, name: item.name });
    });
    data.expenses.other.forEach(item => {
      if (item.value > 0) list.push({ value: item.value, name: item.name });
    });
    return list.length > 0 ? list : [{ value: 1, name: 'No Expenses Data', itemStyle: { color: '#e2e8f0' } }];
  };

  const trendLabels = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.month) 
    : ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];
    
  const revenueTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.revenue) 
    : [0, 0, 0, 0, data?.summary?.revenue || 0];
    
  const expenseTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.expenses) 
    : [0, 0, 0, 0, data?.summary?.expenses || 0];

  const netProfitTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.netProfit) 
    : [0, 0, 0, 0, data?.summary?.netProfit || 0];

  const incomeVsExpensesOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Income', 'Expenses'], right: 10, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trendLabels,
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
        name: 'Income',
        type: 'bar',
        barWidth: '20%',
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        data: revenueTrendData
      },
      {
        name: 'Expenses',
        type: 'bar',
        barWidth: '20%',
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        data: expenseTrendData
      }
    ]
  };

  const expensePieOption = {
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => {
        if (params.name.includes('No Expenses')) return 'No Expenses';
        return `${params.name}: ${currencySymbol}${params.value.toLocaleString()} (${params.percent}%)`;
      }
    },
    legend: { show: false },
    series: [
      {
        name: 'Expenses',
        type: 'pie',
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data ? data.summary.expenses : 0;
            return `${currencySymbol}${sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}\nTotal Expenses`;
          },
          textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: getExpenseBreakdown()
      }
    ]
  };

  const netProfitTrendOption = {
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendLabels,
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
        name: 'Net Profit',
        type: 'line',
        data: netProfitTrendData,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
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
        <span className="text-slate-600 font-semibold">Profit & Loss</span>
      </div>

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Profit & Loss Statement</h1>
            <HelpCircle className="h-4 w-4 text-slate-350 hover:text-slate-500 cursor-pointer transition" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Detailed income statement with revenue, expenses, and profitability.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker row */}
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


        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Currency</span>
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50">
            <span>{currencyCode}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Report Basis</span>
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50">
            <span>Accrual</span>
          </div>
        </div>

        <button 
          onClick={fetchProfitAndLoss}
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
            <h4 className="text-xs font-bold text-red-800">Unable to load Profit & Loss Statement</h4>
            <p className="text-xs text-red-650 font-medium">{error}</p>
            <button 
              onClick={fetchProfitAndLoss}
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse space-y-3">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 h-96 animate-pulse" />
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 h-96 animate-pulse" />
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 h-96 animate-pulse" />
          </div>
        </div>
      )}

      {/* ─── Main Dynamic View ─── */}
      {!loading && !error && data && data.connected !== false && (
        <>
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 select-none">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue (YTD)</span>
                  <Tooltip text="Total revenue/sales income recognized during this period before subtracting direct costs or expenses." />
                </div>
                <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100/50"><TrendingUp className="h-3.5 w-3.5" /></div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{formatAmount(data.summary.revenue)}</h3>
              <span className="text-[9.5px] font-bold text-slate-400 block mt-1">100% of total income</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses (YTD)</span>
                  <Tooltip text="Total operating and overhead expenses recorded during this period (excluding cost of goods sold/purchases)." />
                </div>
                <div className="h-6 w-6 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100/50"><TrendingDown className="h-3.5 w-3.5" /></div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{formatAmount(data.summary.expenses)}</h3>
              <span className="text-[9.5px] font-bold text-slate-400 block mt-1">
                {data.summary.revenue > 0 ? `${Math.round((data.summary.expenses / data.summary.revenue) * 1000) / 10}% of total income` : '0%'}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit (YTD)</span>
                  <Tooltip text="Net profit: Gross Profit minus all operating expenses. Represents actual business earnings." />
                </div>
                <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50"><DollarSign className="h-3.5 w-3.5" /></div>
              </div>
              <h3 className="text-xl font-extrabold text-emerald-600 tracking-tight">{formatAmount(data.summary.netProfit)}</h3>
              <span className="text-[9.5px] font-bold text-emerald-605 block mt-1">{data.summary.profitMargin}% Profit Margin</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit</span>
                  <Tooltip text="Gross profit: Total Revenue minus Cost of Sales/Purchases. Measures core product/service profitability." />
                </div>
                <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100/50"><Scale className="h-3.5 w-3.5" /></div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{formatAmount(data.summary.grossProfit)}</h3>
              <span className="text-[9.5px] font-bold text-slate-450 block mt-1">{data.summary.grossProfitMargin}% Margin</span>
            </div>
          </div>

          {/* Empty State Banner */}
          {data.summary.revenue === 0 && data.summary.expenses === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-250/70 rounded-xl p-12 text-center select-none mb-6">
              <Scale className="h-8 w-8 text-slate-350 mx-auto mb-3 animate-bounce" />
              <h4 className="text-sm font-bold text-slate-700 mb-1">No Profit & Loss Statement Available</h4>
              <p className="text-xs text-slate-400 font-medium">Verify your Xero sync configurations or transactions logs.</p>
            </div>
          )}

          {/* Tables layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Income Card */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-extrabold text-slate-850 tracking-wider uppercase">Income</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Operating Income</span>
                  <div className="space-y-1.75 pl-2 text-xs font-semibold text-slate-650">
                    {data.income.operating.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-slate-800">{formatAmount(item.value)}</span>
                      </div>
                    ))}
                    {data.income.operating.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-bold block italic">No operating income accounts</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50 mt-1">
                    <span>Total Operating Income</span>
                    <span>{formatAmount(data.income.operating.reduce((sum, item) => sum + item.value, 0))}</span>
                  </div>
                </div>

                {data.income.other.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Other Income</span>
                    <div className="space-y-1.75 pl-2 text-xs font-semibold text-slate-650">
                      {data.income.other.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="text-slate-800">{formatAmount(item.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50 mt-1">
                      <span>Total Other Income</span>
                      <span>{formatAmount(data.income.other.reduce((sum, item) => sum + item.value, 0))}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-dashed border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50">
                    <span>Total Income</span>
                    <span>{formatAmount(data.summary.revenue)}</span>
                  </div>
                </div>

                {data.cogs && data.cogs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed border-slate-105">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Cost of Sales</span>
                    <div className="space-y-1.75 pl-2 text-xs font-semibold text-slate-650">
                      {data.cogs.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="text-slate-800">{formatAmount(item.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-red-700 bg-red-50/50 p-2.5 rounded-lg border border-red-100/50 mt-1">
                      <span>Total Cost of Sales</span>
                      <span>{formatAmount(data.cogs.reduce((sum, item) => sum + item.value, 0))}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between text-xs font-bold text-blue-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50">
                    <span>Gross Profit</span>
                    <span>{formatAmount(data.summary.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 px-1">
                    <span>Gross Profit Margin</span>
                    <span>{data.summary.grossProfitMargin}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-extrabold text-slate-850 tracking-wider uppercase">Expenses</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Operating Expenses</span>
                  <div className="space-y-1.75 pl-2 text-xs font-semibold text-slate-655">
                    {data.expenses.operating.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-slate-800">{formatAmount(item.value)}</span>
                      </div>
                    ))}
                    {data.expenses.operating.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-bold block italic">No operating expenses accounts</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs font-bold text-amber-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 mt-1">
                    <span>Total Operating Expenses</span>
                    <span>{formatAmount(data.expenses.operating.reduce((sum, item) => sum + item.value, 0))}</span>
                  </div>
                </div>

                {data.expenses.other.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Other Expenses</span>
                    <div className="space-y-1.75 pl-2 text-xs font-semibold text-slate-655">
                      {data.expenses.other.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="text-slate-800">{formatAmount(item.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-amber-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 mt-1">
                      <span>Total Other Expenses</span>
                      <span>{formatAmount(data.expenses.other.reduce((sum, item) => sum + item.value, 0))}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-dashed border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-red-650 bg-red-50/50 p-2.5 rounded-lg border border-red-100/50">
                    <span>Total Expenses</span>
                    <span>{formatAmount(data.summary.expenses)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50">
                    <span>Net Profit</span>
                    <span>{formatAmount(data.summary.netProfit)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 px-1">
                    <span>Net Profit Margin</span>
                    <span>{data.summary.profitMargin}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Quick Summary panel */}
            <div className="lg:col-span-3 space-y-5">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-sm space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2 text-xs font-semibold">
                  <button className="flex items-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export PDF Report</span>
                  </button>
                  <button className="flex items-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export Excel Report</span>
                  </button>
                  <button className="flex items-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none">
                    <Printer className="h-3.5 w-3.5 text-slate-400" />
                    <span>Print Report</span>
                  </button>
                  <button 
                    onClick={fetchProfitAndLoss}
                    className="flex items-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition text-left cursor-pointer outline-none"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* Summary panel */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 select-none">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Summary</h4>
                
                <div className="space-y-2 text-xs font-semibold text-slate-500 pt-1">
                  <div className="flex justify-between"><span>Revenue (YTD)</span><span className="text-slate-805">{formatAmount(data.summary.revenue)}</span></div>
                  <div className="flex justify-between"><span>Expenses (YTD)</span><span className="text-slate-805">{formatAmount(data.summary.expenses)}</span></div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Net Profit (YTD)</span>
                    <span className="text-emerald-600">{formatAmount(data.summary.netProfit)}</span>
                  </div>
                  <div className="flex justify-between"><span>Profit Margin</span><span className="text-slate-805">{data.summary.profitMargin}%</span></div>
                  <div className="flex justify-between"><span>Gross Profit Margin</span><span className="text-slate-805">{data.summary.grossProfitMargin}%</span></div>
                  <div className="border-t border-slate-100/60 my-1.5" />
                  <div className="flex justify-between"><span>Report Basis</span><span className="text-slate-805">Accrual</span></div>
                  <div className="flex justify-between"><span>Currency</span><span className="text-slate-805">{currencyCode}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Styled bottom statement formula math bar */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-emerald-800 select-none mb-6">
            <span>Income - Expenses = Net Profit</span>
            <span>{formatAmount(data.summary.revenue)} - {formatAmount(data.summary.expenses)} = {formatAmount(data.summary.netProfit)}</span>
          </div>

          {/* ECharts Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6 select-none">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Income vs Expenses</span>
              <div className="h-[210px] w-full relative">
                <ReactECharts option={incomeVsExpensesOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Expense Breakdown</span>
              <div className="h-[210px] w-full relative">
                <ReactECharts option={expensePieOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Net Profit Trend</span>
              <div className="h-[210px] w-full relative">
                <ReactECharts option={netProfitTrendOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
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
            Please connect your Xero organization under credentials in Data Sources to compile and view your Profit & Loss Statement.
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
              "This report reflects your company's financial performance over the selected timeframe."
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
