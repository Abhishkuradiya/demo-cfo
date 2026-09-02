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
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/common/page-container';
import { toast } from 'sonner';

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

// Sparkline Wave Component for Analytics Cards (with adequate top padding to prevent curve clipping)
function SparklineMini({ color, data }: { color: string; data?: number[] }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="w-full h-10 overflow-hidden pt-1">
      <svg viewBox="0 0 150 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-pl-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 30 C 25 34, 45 22, 75 22 C 105 22, 125 10, 150 14 L 150 40 L 0 40 Z"
          fill={`url(#grad-pl-${cleanColor})`}
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

export default function ProfitAndLossPage() {
  const [viewMode, setViewMode] = useState<'statement' | 'analytics'>('statement');
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

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

  const currencyCode = data?.meta?.currency || 'GBP';
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
    : ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
    
  const revenueTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.revenue) 
    : [2450000, 3100000, 3150000, 3250000, 3320000, data?.summary?.revenue || 3380836];
    
  const grossProfitTrendData = [1100000, 1250000, 1220000, 1210000, 1200000, data?.summary?.grossProfit || 1095576];
  const expenseTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.expenses) 
    : [210000, 240000, 260000, 255000, 265000, data?.summary?.expenses || 270661];

  const netProfitTrendData = (data && data.trends && data.trends.length > 0)
    ? data.trends.map((t: any) => t.netProfit) 
    : [612000, -240000, 710000, 820000, 690000, data?.summary?.netProfit || 829098];

  // ECharts Multi-Line Chart (Profitability Trend)
  const profitabilityTrendOption = {
    grid: { left: '3%', right: '4%', top: '15%', bottom: '10%', containLabel: true },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#ffffff', fontSize: 11 } },
    legend: { data: ['Revenue', 'Gross Profit', 'Operating Expenses', 'Net Profit'], top: '0%', right: '4%', textStyle: { color: '#475569', fontSize: 10, fontWeight: 'bold' } },
    xAxis: {
      type: 'category',
      data: trendLabels,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val / 1000000}M` }
    },
    series: [
      { name: 'Revenue', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#2563eb' }, itemStyle: { color: '#2563eb' }, data: revenueTrendData },
      { name: 'Gross Profit', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#10b981' }, itemStyle: { color: '#10b981' }, data: grossProfitTrendData },
      { name: 'Operating Expenses', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#f97316' }, itemStyle: { color: '#f97316' }, data: expenseTrendData },
      { name: 'Net Profit', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' }, data: netProfitTrendData }
    ]
  };

  // ECharts Bar Chart (Net Profit Trend)
  const netProfitBarOption = {
    grid: { left: '3%', right: '4%', top: '15%', bottom: '12%', containLabel: true },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#ffffff', fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: trendLabels,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val / 1000}K` }
    },
    series: [
      {
        name: 'Net Profit',
        type: 'bar',
        barWidth: '35%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => (params.value >= 0 ? '#10b981' : '#ef4444')
        },
        data: netProfitTrendData
      }
    ]
  };

  // Income Breakdown Bar Chart Option for Analytics View
  const incomeBarOption = {
    grid: { left: '2%', right: '14%', top: '6%', bottom: '4%', containLabel: true },
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
        const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(val);
        return `<div class="font-bold text-xs">${item.name}</div><div class="text-xs text-[#00b7e2] font-semibold mt-0.5">${formatted}</div>`;
      }
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: (val: number) => `£${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${Math.round(val / 1000)}K`}` }
    },
    yAxis: {
      type: 'category',
      data: ['Website Sales', 'Amazon Sales', 'Ebay sales', 'Sales', 'Intercompany', 'Groupon Sales', 'SLA & Contract', 'Other Income'].reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 10.5, fontWeight: 'bold' }
    },
    series: [
      {
        name: 'Income Amount',
        type: 'bar',
        barWidth: 11,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: '#2563eb'
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 9.5,
          fontWeight: 'bold',
          color: '#475569',
          formatter: (params: any) => `£${params.value >= 1000000 ? `${(params.value / 1000000).toFixed(2)}M` : params.value.toLocaleString()}`
        },
        data: [1619695.63, 1027322.95, 325820.62, 318219.97, 67398.80, 11275.31, 6920.00, 4183.32].reverse()
      }
    ]
  };

  // Expense Donut Chart for Analytics
  const analyticsExpensePieOption = {
    tooltip: { trigger: 'item', confine: true, backgroundColor: '#0f172a', textStyle: { color: '#ffffff', fontSize: 11 } },
    series: [
      {
        name: 'Expenses',
        type: 'pie',
        radius: ['60%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `£${Math.round(data?.summary?.expenses || 270661).toLocaleString()}\nTotal Expenses`,
          textStyle: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' }
        },
        data: [
          { value: 85674.29, name: 'Staff wages', itemStyle: { color: '#ef4444' } },
          { value: 78098.66, name: 'Rent', itemStyle: { color: '#f97316' } },
          { value: 22500.00, name: 'Logistics', itemStyle: { color: '#eab308' } },
          { value: 17255.34, name: 'Marketing & Advertising', itemStyle: { color: '#8b5cf6' } },
          { value: 17126.32, name: 'Subscriptions & Licenses', itemStyle: { color: '#ec4899' } },
          { value: 49991.50, name: 'Other Expenses', itemStyle: { color: '#3b82f6' } }
        ]
      }
    ]
  };

  const revenueVal = data?.summary?.revenue || 3380836.60;
  const expensesVal = data?.summary?.expenses || 270661.11;
  const grossVal = data?.summary?.grossProfit || 1095576.21;
  const netVal = data?.summary?.netProfit || 829098.42;

  const operatingIncomeList = data?.income?.operating || [];
  const otherIncomeList = data?.income?.other || [];
  const operatingExpensesList = data?.expenses?.operating || [];
  const otherExpensesList = data?.expenses?.other || [];
  const cogsList = data?.cogs || [];

  return (
    <PageContainer>
      <div className="space-y-6 max-w-full pb-12 select-none">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
              <Link href="/overview" className="hover:text-slate-700 transition">Dashboard</Link>
              <span>&gt;</span>
              <Link href="/reports" className="hover:text-slate-700 transition">Accounting</Link>
              <span>&gt;</span>
              <span className="text-slate-700 font-bold">Profit & Loss</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Profit & Loss</h1>
            <p className="text-[12px] text-slate-500 font-medium mt-0.5">
              {viewMode === 'statement' 
                ? 'Detailed income statement with revenue, expenses, and profitability.' 
                : 'Visual analytics dashboard for financial performance and margins.'}
            </p>
          </div>

          {/* Date Picker, Mode Switcher & Action Buttons on Right Side */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setViewMode('statement')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5",
                  viewMode === 'statement' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Statement View</span>
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5",
                  viewMode === 'analytics' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analytics Dashboard</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
              <Calendar className="h-4 w-4 text-blue-600" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-[11.5px] font-semibold text-slate-700 outline-none bg-transparent"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-[11.5px] font-semibold text-slate-700 outline-none bg-transparent"
              />
            </div>

            <button
              onClick={fetchProfitAndLoss}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg shadow-2xs text-[11.5px] font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* MODE 1: STATEMENT VIEW (Matching Image 1 mockup) */}
        {viewMode === 'statement' && (
          <div className="space-y-6">
            {/* Currency & Report Basis Bar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">CURRENCY</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{currencyCode}</span>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">REPORT BASIS</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">Accrual</span>
                </div>
              </div>

              <button
                onClick={fetchProfitAndLoss}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Report</span>
              </button>
            </div>

            {/* Top 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REVENUE (YTD)</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{formatAmount(revenueVal)}</span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">100% of total income</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EXPENSES (YTD)</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{formatAmount(expensesVal)}</span>
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">8% of total income</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NET PROFIT (YTD)</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">{formatAmount(netVal)}</span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">24.5% Profit Margin</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GROSS PROFIT</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{formatAmount(grossVal)}</span>
                <span className="text-[10px] text-blue-600 font-bold mt-1 block">32.4% Margin</span>
              </div>
            </div>

            {/* Main Statement Content: Income & Expenses Lists + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Income & Expenses Itemized Tables (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-5">
                {/* Income Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">INCOME</h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-2">OPERATING INCOME</span>
                      <div className="space-y-2 text-[11.5px]">
                        {operatingIncomeList.length > 0 ? (
                          operatingIncomeList.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                              <span className="font-semibold text-slate-700">{item.name}</span>
                              <span className="font-bold text-slate-900">{formatAmount(item.value)}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Amazon Sales</span><span className="font-bold text-slate-900">£1,027,322.95 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Ebay sales</span><span className="font-bold text-slate-900">£325,820.62 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Groupon Sales</span><span className="font-bold text-slate-900">£11,275.31 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Intercompany sales</span><span className="font-bold text-slate-900">£67,398.80 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Sales</span><span className="font-bold text-slate-900">£318,219.97 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">SLA & Contract Income</span><span className="font-bold text-slate-900">£6,920.00 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Website Sales</span><span className="font-bold text-slate-900">£1,619,695.63 GBP</span></div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 font-extrabold text-[12px] text-emerald-800">
                        <span>Total Operating Income</span>
                        <span>{formatAmount(revenueVal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expenses Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">EXPENSES</h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider block mb-2">OPERATING EXPENSES</span>
                      <div className="space-y-2 text-[11.5px]">
                        {operatingExpensesList.length > 0 ? (
                          operatingExpensesList.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                              <span className="font-semibold text-slate-700">{item.name}</span>
                              <span className="font-bold text-slate-900">{formatAmount(item.value)}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Accountancy Fees</span><span className="font-bold text-slate-900">£4,013.33 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Bank Fees</span><span className="font-bold text-slate-900">£541.68 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Rent</span><span className="font-bold text-slate-900">£78,098.66 GBP</span></div>
                            <div className="flex justify-between py-1 border-b border-slate-50"><span className="font-semibold text-slate-700">Staff wages</span><span className="font-bold text-slate-900">£85,674.29 GBP</span></div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 bg-amber-50/60 p-3 rounded-lg border border-amber-100 font-extrabold text-[12px] text-amber-800">
                        <span>Total Operating Expenses</span>
                        <span>{formatAmount(expensesVal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Actions & Summary (lg:col-span-4) */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-3">QUICK ACTIONS</span>
                  <div className="space-y-2 text-[11.5px]">
                    <button onClick={() => window.print()} className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold transition flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" /> Export PDF Report
                    </button>
                    <button onClick={() => toast.success('Exporting Excel...')} className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold transition flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Export Excel Report
                    </button>
                    <button onClick={() => window.print()} className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold transition flex items-center gap-2">
                      <Printer className="h-4 w-4 text-slate-500" /> Print Report
                    </button>
                    <button onClick={fetchProfitAndLoss} className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold transition flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-slate-500" /> Refresh Data
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">SUMMARY</span>
                  <div className="space-y-2 text-[11.5px]">
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Revenue (YTD)</span><span className="font-bold text-slate-900">{formatAmount(revenueVal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Expenses (YTD)</span><span className="font-bold text-slate-900">{formatAmount(expensesVal)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><span className="font-bold text-slate-800">Net Profit (YTD)</span><span className="font-black text-emerald-600">{formatAmount(netVal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Profit Margin</span><span className="font-bold text-slate-800">24.5%</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Gross Profit Margin</span><span className="font-bold text-slate-800">32.4%</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-400 font-medium">Report Basis</span><span className="font-bold text-slate-700">Accrual</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-medium">Currency</span><span className="font-bold text-slate-700">{currencyCode}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: ANALYTICS DASHBOARD VIEW (Matching Image 2 mockup) */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {/* Top 4 KPI Sparkline Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Revenue */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Revenue</span>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 mt-2 block">{formatAmount(revenueVal)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> 16.1% vs previous period
                  </span>
                </div>
                <div className="mt-2 -mx-4 -mb-4">
                  <SparklineMini color="#2563eb" />
                </div>
              </div>

              {/* Card 2: Gross Profit */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Gross Profit</span>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 mt-2 block">{formatAmount(grossVal)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> 11.8% vs previous period | 32.4% margin
                  </span>
                </div>
                <div className="mt-2 -mx-4 -mb-4">
                  <SparklineMini color="#10b981" />
                </div>
              </div>

              {/* Card 3: Operating Expenses */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Operating Expenses</span>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 mt-2 block">{formatAmount(expensesVal)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" /> 4.8% vs previous period
                  </span>
                </div>
                <div className="mt-2 -mx-4 -mb-4">
                  <SparklineMini color="#f97316" />
                </div>
              </div>

              {/* Card 4: Net Profit */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                        <Scale className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Net Profit</span>
                    </div>
                  </div>
                  <span className="text-xl font-black text-slate-900 mt-2 block">{formatAmount(netVal)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> 12.3% vs previous period | 24.5% margin
                  </span>
                </div>
                <div className="mt-2 -mx-4 -mb-4">
                  <SparklineMini color="#8b5cf6" />
                </div>
              </div>
            </div>

            {/* Middle Row 1: Profitability Trend (8 cols) & Profitability Health (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Profitability Trend Multi-Line Chart */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[13.5px] font-bold text-slate-800">Profitability Trend</h3>
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setTrendPeriod('monthly')}
                        className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold transition", trendPeriod === 'monthly' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600")}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setTrendPeriod('quarterly')}
                        className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold transition", trendPeriod === 'quarterly' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600")}
                      >
                        Quarterly
                      </button>
                      <button
                        onClick={() => setTrendPeriod('yearly')}
                        className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold transition", trendPeriod === 'yearly' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600")}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div className="h-64 w-full my-2">
                    <ReactECharts option={profitabilityTrendOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Profitability Health Widget */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-[13.5px] font-bold text-slate-800">Profitability Health</h3>
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                  </div>

                  <div className="space-y-4 text-[11px]">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700">Net Margin</span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">24.5%</span>
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Good</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700">Gross Margin</span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">32.4%</span>
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Good</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700">Expense Ratio</span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">8.0%</span>
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Good</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 text-[10.5px]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-emerald-900">Strong Performance</h5>
                    <p className="text-emerald-700 mt-0.5 leading-snug">Your business is profitable and margins are healthy during this period.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row 2: Income Breakdown (6 cols) & Expense Breakdown (6 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Income Breakdown Card */}
              <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-[13.5px] font-bold text-slate-800">Income Breakdown</h3>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Income</span>
                      <span className="text-sm font-black text-slate-900 block">{formatAmount(revenueVal)}</span>
                    </div>
                  </div>

                  <div className="h-48 w-full">
                    <ReactECharts option={incomeBarOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Expense Breakdown Card with Donut Chart */}
              <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-[13.5px] font-bold text-slate-800">Expense Breakdown</h3>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Expenses</span>
                      <span className="text-sm font-black text-slate-900 block">{formatAmount(expensesVal)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2.5 text-[10.5px]">
                      <div>
                        <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Staff wages</span>
                          <span>31.7%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '31.7%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Rent</span>
                          <span>28.9%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '28.9%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Logistics</span>
                          <span>8.3%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: '8.3%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Marketing & Advertising</span>
                          <span>6.4%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: '6.4%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="h-36 w-full relative">
                      <ReactECharts option={analyticsExpensePieOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row 3: P&L Summary Table (8 cols) & What Changed? (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* P&L Summary Table */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                <h3 className="text-[13.5px] font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">P&L Summary Comparison</h3>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-[11.5px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Particulars</th>
                        <th className="py-2.5 px-3 text-right">This Period</th>
                        <th className="py-2.5 px-3 text-right">Previous Period</th>
                        <th className="py-2.5 px-3 text-right">Change</th>
                        <th className="py-2.5 px-3 text-right">Change %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-slate-800">Total Income</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900 text-right">{formatAmount(revenueVal)}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-right">£2,912,188.43</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold text-right">£468,648.17</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-extrabold text-right">↑ 16.1%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-slate-800">Cost of Sales</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 text-right">£2,285,260.39</td>
                        <td className="py-2.5 px-3 text-slate-500 text-right">£2,017,801.56</td>
                        <td className="py-2.5 px-3 text-rose-600 font-bold text-right">£267,458.83</td>
                        <td className="py-2.5 px-3 text-rose-600 font-extrabold text-right">↑ 13.2%</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">Gross Profit</td>
                        <td className="py-2.5 px-3 font-black text-slate-900 text-right">{formatAmount(grossVal)}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-bold text-right">£894,386.87</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-extrabold text-right">£201,189.34</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-black text-right">↑ 22.5%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-slate-800">Operating Expenses</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 text-right">{formatAmount(expensesVal)}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-right">£284,974.52</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold text-right">-£14,313.41</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-extrabold text-right">↓ 5.0%</td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="py-3 px-3 font-black text-emerald-900 text-sm">Net Profit</td>
                        <td className="py-3 px-3 font-black text-emerald-600 text-right text-sm">{formatAmount(netVal)}</td>
                        <td className="py-3 px-3 text-slate-700 font-extrabold text-right">£612,333.45</td>
                        <td className="py-3 px-3 text-emerald-600 font-black text-right">£216,764.97</td>
                        <td className="py-3 px-3 text-emerald-600 font-black text-right">↑ 35.4%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* What Changed? Insights Card */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">What Changed?</h3>

                  <div className="space-y-3.5 text-[11px]">
                    <div className="flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800">Revenue increased by £468,648 (16.1%)</h5>
                        <p className="text-slate-500 mt-0.5">Strong growth in sales across all distribution channels.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800">Gross profit increased by £201,189 (22.5%)</h5>
                        <p className="text-slate-500 mt-0.5">Improved product mix and pricing strategy impact.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800">Operating expenses decreased by £14,313 (5.0%)</h5>
                        <p className="text-slate-500 mt-0.5">Better cost control and operational efficiency.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row 4: Net Profit Trend (5 cols) & View by Tracking Category (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Net Profit Bar Chart */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                <h3 className="text-[13.5px] font-bold text-slate-800 border-b border-slate-100 pb-3 mb-3">Net Profit Trend</h3>
                <div className="h-56 w-full">
                  <ReactECharts option={netProfitBarOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* View by Tracking Category Table */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h3 className="text-[13.5px] font-bold text-slate-800">View by Tracking Category</h3>
                    <select className="px-2.5 py-1 text-[10.5px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none">
                      <option>Department</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 font-extrabold uppercase tracking-wider text-[9.5px]">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Revenue</th>
                          <th className="py-2.5 px-3 text-right">Expenses</th>
                          <th className="py-2.5 px-3 text-right">Net Profit</th>
                          <th className="py-2.5 px-3 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800">General</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">£819,564.21</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">£110,204.33</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">£709,359.88</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">86.6%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800">GWL</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">£1,210,481.32</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">£82,334.67</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">£1,128,146.65</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">93.2%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800">Missing Invoice</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">£340,118.55</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">£31,884.21</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">£308,234.34</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">90.6%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800">Amazon</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">£521,342.78</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">£23,665.78</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">£497,677.00</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">95.5%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800">Other</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">£489,329.74</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">£22,572.12</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">£466,757.62</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">95.4%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
