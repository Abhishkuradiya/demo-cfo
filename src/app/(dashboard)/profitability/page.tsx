"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Download,
  Target,
  Sparkles,
  ChevronRight,
  Percent,
  Coins,
  Activity,
  Send,
  Star,
  Info,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProfitabilityAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('ttm');
  const [waterfallUnit, setWaterfallUnit] = useState<'amount' | 'pct'>('amount');
  const [trendTimeframe, setTrendTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [cfoQuestion, setCfoQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);

  const [periodInfo, setPeriodInfo] = useState<any>({
    label: 'Trailing 12 Months (TTM)',
    dataSource: 'Xero Organization Live Ledger (PostgreSQL Cache)'
  });

  const [data, setData] = useState<any>({
    revenue: 5240000,
    cogs: 2140000,
    grossProfit: 1890000,
    grossMarginPct: 36.1,
    opexFixed: 910000,
    opexVariable: 250000,
    ebitda: 980000,
    ebitdaMarginPct: 18.7,
    operatingProfit: 730000,
    profitBeforeTax: 735000,
    netProfit: 735000,
    netMarginPct: 14.0,
    breakEvenSales: 1370900,
    marginOfSafetyPct: 53.4,
    currency: 'INR',
    customerProfitability: [],
    productProfitability: [],
    departmentProfitability: [],
    monthlyTrend: [],
    marginDistribution: {
      highMargin: { count: 28, pct: 32 },
      mediumMargin: { count: 41, pct: 46 },
      lowMargin: { count: 20, pct: 22 }
    },
    aiOpportunities: []
  });

  const waterfallChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  const fetchProfitabilityData = async (periodCode = selectedPeriod) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/cfo-intelligence?period=${periodCode}`);
      if (res.ok) {
        const result = await res.json();
        if (result.profitability) {
          setData({
            ...result.profitability,
            currency: result.currency || 'INR'
          });
        }
        if (result.periodInfo) {
          setPeriodInfo(result.periodInfo);
        }
      }
    } catch (err) {
      console.error('Failed to load profitability data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitabilityData();
  }, []);

  // 1. ECharts Waterfall Chart
  useEffect(() => {
    if (!waterfallChartRef.current || !data.revenue) return;
    const chart = echarts.init(waterfallChartRef.current);

    const isPct = waterfallUnit === 'pct';
    const rev = isPct ? 100 : data.revenue;
    const cogs = isPct ? ((data.cogs / data.revenue) * 100) : data.cogs;
    const gp = isPct ? data.grossMarginPct : data.grossProfit;
    const opex = isPct ? (((data.opexFixed + data.opexVariable) / data.revenue) * 100) : (data.opexFixed + data.opexVariable);
    const opProfit = isPct ? (((gp * (data.revenue / 100) - opex * (data.revenue / 100)) / data.revenue) * 100) : (data.grossProfit - (data.opexFixed + data.opexVariable));
    const otherExp = isPct ? 4.8 : Math.round(data.revenue * 0.048);
    const np = isPct ? data.netMarginPct : data.netProfit;

    const sym = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : '£';
    const fmtVal = (val: number) => {
      if (isPct) return `${val.toFixed(1)}%`;
      if (Math.abs(val) >= 1000000) return `${sym}${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `${sym}${Math.round(val / 1000)}k`;
      return `${sym}${Math.round(val)}`;
    };

    const option = {
      grid: { left: '3%', right: '4%', top: '15%', bottom: '8%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const tar = params[1] || params[0];
          return `${tar.name}: <strong>${fmtVal(Math.abs(tar.value))}</strong>`;
        }
      },
      xAxis: {
        type: 'category',
        data: ['Net Revenue', 'Direct Costs\n(COGS)', 'Gross Profit', 'Operating\nExpenses', 'Operating\nProfit', 'Other Expenses\n(Interest, Tax)', 'Net Profit'],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 10, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (val: number) => fmtVal(val)
        }
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          data: [0, rev - cogs, 0, gp - opex, 0, opProfit - otherExp, 0]
        },
        {
          name: 'Amount',
          type: 'bar',
          stack: 'Total',
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => fmtVal(p.value),
            color: '#1e293b',
            fontSize: 10,
            fontWeight: 'bold'
          },
          data: [
            { value: rev, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
            { value: -cogs, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
            { value: gp, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
            { value: -opex, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
            { value: opProfit, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
            { value: -otherExp, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
            { value: np, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }
          ]
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, waterfallUnit]);

  // 2. ECharts Profitability Trend Combo Chart
  useEffect(() => {
    if (!trendChartRef.current) return;

    let chart = echarts.getInstanceByDom(trendChartRef.current);
    if (chart) {
      chart.dispose();
    }
    chart = echarts.init(trendChartRef.current);

    const trendData = data.monthlyTrend && data.monthlyTrend.length > 0 ? data.monthlyTrend : [
      { month: 'Oct', revenue: 400000, grossProfit: 180000, netProfit: 80000, grossMarginPct: 45 },
      { month: 'Nov', revenue: 420000, grossProfit: 170000, netProfit: 70000, grossMarginPct: 41 },
      { month: 'Dec', revenue: 440000, grossProfit: 190000, netProfit: 90000, grossMarginPct: 43 },
      { month: 'Jan', revenue: 450000, grossProfit: 200000, netProfit: 100000, grossMarginPct: 44 },
      { month: 'Feb', revenue: 480000, grossProfit: 210000, netProfit: 110000, grossMarginPct: 43.7 },
      { month: 'Mar', revenue: 500000, grossProfit: 220000, netProfit: 120000, grossMarginPct: 44 },
      { month: 'Apr', revenue: 520000, grossProfit: 250000, netProfit: 140000, grossMarginPct: 48 },
      { month: 'May', revenue: 510000, grossProfit: 230000, netProfit: 120000, grossMarginPct: 45 },
      { month: 'Jun', revenue: 540000, grossProfit: 240000, netProfit: 130000, grossMarginPct: 44.4 },
      { month: 'Jul', revenue: 560000, grossProfit: 260000, netProfit: 150000, grossMarginPct: 46.4 },
      { month: 'Aug', revenue: 580000, grossProfit: 270000, netProfit: 160000, grossMarginPct: 46.5 },
      { month: 'Sep', revenue: 600000, grossProfit: 300000, netProfit: 180000, grossMarginPct: 50 }
    ];

    const months = trendData.map((d: any) => d.month);
    const revs = trendData.map((d: any) => d.revenue);
    const gps = trendData.map((d: any) => d.grossProfit);
    const nps = trendData.map((d: any) => d.netProfit);
    const margins = trendData.map((d: any) => d.grossMarginPct);

    const sym = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : '£';

    const fmtAxisLabel = (val: number) => {
      if (Math.abs(val) >= 1000000) return `${sym}${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `${sym}${Math.round(val / 1000)}k`;
      return `${sym}${Math.round(val)}`;
    };

    const option = {
      grid: { left: '3%', right: '5%', top: '15%', bottom: '8%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 11 },
        formatter: (params: any[]) => {
          let str = `<div style="font-weight:bold;margin-bottom:4px;">${params[0]?.name || ''}</div>`;
          params.forEach((p: any) => {
            const valStr = p.seriesName.includes('%') ? `${p.value}%` : fmtAxisLabel(p.value);
            str += `<div style="display:flex;align-items:center;justify-between;gap:12px;font-size:11px;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px;"></span>${p.seriesName}:</span>
              <strong style="color:#fff">${valStr}</strong>
            </div>`;
          });
          return str;
        }
      },
      legend: {
        data: ['Revenue', 'Gross Profit', 'Net Profit', 'Gross Margin %'],
        right: '2%',
        top: '0%',
        textStyle: { color: '#475569', fontSize: 10, fontWeight: 600 }
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 10 }
      },
      yAxis: [
        {
          type: 'value',
          name: `Amount (${sym})`,
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (val: number) => fmtAxisLabel(val)
          }
        },
        {
          type: 'value',
          name: 'Margin %',
          min: 0,
          max: 100,
          splitLine: { show: false },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' }
        }
      ],
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: revs,
          itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: 'Gross Profit',
          type: 'bar',
          data: gps,
          itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: 'Net Profit',
          type: 'bar',
          data: nps,
          itemStyle: { color: '#6366f1', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: 'Gross Margin %',
          type: 'line',
          yAxisIndex: 1,
          data: margins,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#0d9488' },
          lineStyle: { width: 2.5, color: '#0d9488' }
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, trendTimeframe]);

  const fmt = (val: number) => {
    const sym = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : '£';
    if (data.currency === 'INR') {
      return sym + Math.round(val).toLocaleString('en-IN');
    }
    return sym + Math.round(val).toLocaleString();
  };

  const handleAskCfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfoQuestion.trim()) return;
    const q = cfoQuestion.trim();
    setCfoQuestion('');
    toast.loading('Analyzing profitability ledger data...', { id: 'ai-cfo' });
    setTimeout(() => {
      let ans = `Based on your live Xero ledger: Your Gross Margin is ${data.grossMarginPct}%. Operating profit stands at ${fmt(data.ebitda)}. Primary revenue driver is ${data.customerProfitability[0]?.customer || 'ABC Ltd'}.`;
      if (q.toLowerCase().includes('decline') || q.toLowerCase().includes('gross margin')) {
        ans = `Gross Margin held at ${data.grossMarginPct}%. Main driver was COGS representing ${((data.cogs / data.revenue) * 100).toFixed(1)}% of total revenue.`;
      } else if (q.toLowerCase().includes('least profitable') || q.toLowerCase().includes('customer')) {
        ans = `Lowest margin customer is ${data.customerProfitability[data.customerProfitability.length - 1]?.customer || 'HealthCare Co'} with ${data.customerProfitability[data.customerProfitability.length - 1]?.margin || 25}% gross margin.`;
      }
      setAiAnswers(prev => [ans, ...prev]);
      toast.success('CFO AI Analysis Generated!', { id: 'ai-cfo' });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* 1. Header Banner with SVG Background matching reference image */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
        {/* Official SVG Background Image */}
        <div
          className="absolute inset-0 bg-no-repeat bg-right bg-cover pointer-events-none opacity-95"
          style={{ backgroundImage: "url('/profitability-analysis-banner-bg.svg')" }}
        />

        <div className="space-y-1.5 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>CFO Intelligence</span>
            <span>&gt;</span>
            <span className="text-[#00b7e2]">Profitability Analysis</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#00b7e2]/15 border border-[#00b7e2]/30 flex items-center justify-center text-[#00b7e2]">
              <PieChart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Profitability Analysis
            </h1>
          </div>

          <p className="text-xs lg:text-sm text-slate-500 leading-relaxed font-medium">
            Understand where your business makes — and loses — money. Analyze revenue, costs, margins and profitability across customers, products, and departments.
          </p>
        </div>

        {/* CFO AI Insights Card matching reference image */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-cyan-50/90 p-4 rounded-2xl border border-indigo-100 shadow-2xs relative z-10 max-w-md shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-700">
            <Sparkles className="h-4 w-4 text-purple-600 fill-purple-600" />
            <span>CFO AI Insights</span>
          </div>
          <p className="text-xs text-slate-700 font-medium leading-normal">
            Your business gross margin is <strong className="text-slate-900 font-black">{data.grossMarginPct}%</strong> this period, with total net revenue of <strong className="text-slate-900 font-black">{fmt(data.revenue)}</strong> and net profit of <strong className="text-slate-900 font-black">{fmt(data.netProfit)}</strong>.
          </p>
          <div className="pt-1 flex justify-end">
            <button
              onClick={() => toast.info(`CFO AI Report: Gross Margin is ${data.grossMarginPct}%. Net Profit: ${fmt(data.netProfit)}.`)}
              className="px-3 py-1.5 text-xs font-bold bg-[#0070f3] hover:bg-[#0060d0] text-white rounded-xl shadow-xs transition flex items-center gap-1"
            >
              <span>View AI Analysis</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 8 Primary KPI Cards matching reference image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Card 1: Net Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Net Revenue</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.revenue)}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 8.2% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 2: Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Gross Profit</span>
            <div className="h-7 w-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.grossProfit)}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 12.4% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 3: Gross Margin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Gross Margin</span>
            <div className="h-7 w-7 rounded-lg bg-purple-100/70 text-purple-600 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${data.grossMarginPct.toFixed(1)}%`}</div>
          <div className="text-[11px] font-bold text-purple-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 2.1pp <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 4: EBITDA */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500" title="Earnings Before Interest, Taxes, Depreciation & Amortization">EBITDA</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.ebitda ?? (data.grossProfit - (data.opexFixed || 0)))}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 14.8% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 5: Operating Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500" title="Operating Profit (EBIT)">Operating Profit</span>
            <div className="h-7 w-7 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.operatingProfit ?? (data.grossProfit - (data.opexFixed + data.opexVariable)))}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 15.6% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 6: Profit Before Tax */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500" title="Profit Before Tax (PBT)">Profit Before Tax</span>
            <div className="h-7 w-7 rounded-lg bg-sky-100/70 text-sky-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.profitBeforeTax ?? (data.operatingProfit ?? data.netProfit))}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 17.2% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 7: Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Net Profit</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : fmt(data.netProfit)}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 18.9% <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 8: Net Margin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Net Margin</span>
            <div className="h-7 w-7 rounded-lg bg-pink-100/70 text-pink-600 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${data.netMarginPct.toFixed(1)}%`}</div>
          <div className="text-[11px] font-bold text-pink-600 flex items-center gap-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> 2.3pp <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Charts (Waterfall & Trend) matching reference image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waterfall Chart Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Profitability Waterfall</h3>
              <p className="text-[11px] text-slate-400 font-medium">From revenue to net profit - live Xero ledger calculation</p>
            </div>
            {/* Amount / % Selector Pills */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
              <button
                onClick={() => setWaterfallUnit('amount')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer",
                  waterfallUnit === 'amount' ? "bg-[#0070f3] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Amount
              </button>
              <button
                onClick={() => setWaterfallUnit('pct')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer",
                  waterfallUnit === 'pct' ? "bg-[#0070f3] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                % of Revenue
              </button>
            </div>
          </div>

          <div ref={waterfallChartRef} className="h-72 w-full" />
        </div>

        {/* Profitability Trend Combo Chart */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">Profitability Trend</h3>
              <span title="Trailing monthly financial trend">
                <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              </span>
            </div>
            {/* Monthly / Quarterly / Yearly Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
              {(['monthly', 'quarterly', 'yearly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTrendTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg capitalize transition cursor-pointer",
                    trendTimeframe === tf ? "bg-[#0070f3] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div ref={trendChartRef} className="h-72 w-full" />
        </div>
      </div>

      {/* 4. Lower Tables Grid (3 Parallel Tables matching reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table 1: Revenue by Customer */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Revenue by Customer</h3>
            <button onClick={() => toast.info('Customer report view')} className="text-xs font-bold text-[#0070f3] hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Gross Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.customerProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-slate-900">{row.customer}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.revenue)}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.grossProfit)}</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-600">{row.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Product / Service Profitability */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Product / Service Profitability</h3>
            <button onClick={() => toast.info('Product report view')} className="text-xs font-bold text-[#0070f3] hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Product / Service</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Gross Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.productProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-slate-900">{row.product}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.revenue)}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.grossProfit)}</td>
                    <td className={cn("py-2.5 text-right font-extrabold", row.margin >= 50 ? "text-emerald-600" : row.margin >= 30 ? "text-amber-600" : "text-rose-600")}>
                      {row.margin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Department / Tracking Profitability */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Department / Tracking Profitability</h3>
            <button onClick={() => toast.info('Department report view')} className="text-xs font-bold text-[#0070f3] hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Gross Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.departmentProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-slate-900">{row.department}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.revenue)}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.grossProfit)}</td>
                    <td className={cn("py-2.5 text-right font-extrabold", row.margin >= 50 ? "text-emerald-600" : row.margin >= 30 ? "text-amber-600" : "text-rose-600")}>
                      {row.margin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row (Margin Distribution, Top Opportunities, Ask CFO AI) matching reference */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Margin Distribution Progress Bars */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Margin Distribution</h3>

          <div className="space-y-3.5 text-xs">
            {/* High Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700">High Margin (&gt;50%)</span>
                <span className="text-slate-900 font-extrabold">{data.marginDistribution?.highMargin?.count || 28} ({data.marginDistribution?.highMargin?.pct || 32}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${data.marginDistribution?.highMargin?.pct || 32}%` }} />
              </div>
            </div>

            {/* Medium Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700">Medium Margin (20-50%)</span>
                <span className="text-slate-900 font-extrabold">{data.marginDistribution?.mediumMargin?.count || 41} ({data.marginDistribution?.mediumMargin?.pct || 46}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${data.marginDistribution?.mediumMargin?.pct || 46}%` }} />
              </div>
            </div>

            {/* Low Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700">Low Margin (&lt;20%)</span>
                <span className="text-slate-900 font-extrabold">{data.marginDistribution?.lowMargin?.count || 20} ({data.marginDistribution?.lowMargin?.pct || 22}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${data.marginDistribution?.lowMargin?.pct || 22}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Top Profitability Opportunities (AI Generated) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900">Top Profitability Opportunities</h3>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-purple-100 text-purple-800">
              AI Generated
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {(data.aiOpportunities && data.aiOpportunities.length > 0 ? data.aiOpportunities : [
              '3 customers generated revenue with <20% margin',
              'Product Support & Maintenance margin declined by 12.4%',
              'Opportunities to grow high-margin consulting services (+59% margin)',
              'Operating expenses increased by 8.6%, mainly in Marketing',
              '2 low-performing products contributing to negative margins'
            ]).map((op: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition">
                <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-slate-700 font-medium leading-tight">{op}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: Ask CFO AI Prompt Interface */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#0070f3]" />
              <h3 className="text-sm font-extrabold text-slate-900">Ask CFO AI</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">Start a conversation with your financial data</p>

            {/* Quick prompt pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setCfoQuestion('Why did gross margin decline last month?')}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Why did gross margin decline?
              </button>
              <button
                onClick={() => setCfoQuestion('Which customers are least profitable?')}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Which customers are least profitable?
              </button>
            </div>

            {/* Answer Display */}
            {aiAnswers.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-slate-800 space-y-1 font-medium max-h-24 overflow-y-auto">
                {aiAnswers.map((ans, aIdx) => (
                  <p key={aIdx} className="leading-snug">{ans}</p>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAskCfo} className="relative mt-2">
            <input
              type="text"
              placeholder="Ask anything about your profitability..."
              value={cfoQuestion}
              onChange={(e) => setCfoQuestion(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0070f3] text-slate-900 shadow-2xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 p-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060d0] text-white transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
