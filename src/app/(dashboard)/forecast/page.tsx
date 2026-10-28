'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts';
import {
  Calculator,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  Layers,
  LineChart,
  Loader2,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type ScenarioType = 'average' | 'best' | 'worst';
export type PeriodType = 'ttm' | 'ytd' | 'quarter' | 'this_month';

export interface ScenarioPreset {
  key: ScenarioType;
  label: string;
  badgeLabel: string;
  revMultiplier: number;
  costMultiplier: number;
  growthPct: number;
  inflationPct: number;
  description: string;
  tagline: string;
  badgeClass: string;
  cardBorderClass: string;
}

export const SCENARIO_PRESETS: Record<ScenarioType, ScenarioPreset> = {
  average: {
    key: 'average',
    label: 'Average Case',
    badgeLabel: 'Average (Baseline)',
    revMultiplier: 1.0,
    costMultiplier: 1.0,
    growthPct: 10,
    inflationPct: 3,
    description:
      'Approved baseline budget and operational plan with standard historical run-rates.',
    tagline: 'Baseline Plan (Most Likely)',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    cardBorderClass: 'border-sky-500 ring-1 ring-sky-500 bg-sky-50/20',
  },
  best: {
    key: 'best',
    label: 'Best Case',
    badgeLabel: 'Best Case (+15% / -5%)',
    revMultiplier: 1.15,
    costMultiplier: 0.95,
    growthPct: 25,
    inflationPct: 1,
    description:
      'Accelerated sales conversion (+15%) with overhead discipline & vendor leverage (-5%).',
    tagline: 'Optimistic Upside (+15% Rev / -5% Costs)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardBorderClass: 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20',
  },
  worst: {
    key: 'worst',
    label: 'Worst Case',
    badgeLabel: 'Worst Case (-15% / +10%)',
    revMultiplier: 0.85,
    costMultiplier: 1.1,
    growthPct: -15,
    inflationPct: 8,
    description:
      'Demand slowdown (-15%) coupled with cost inflation & unexpected overrun (+10%).',
    tagline: 'Downside Stress Test (-15% Rev / +10% Costs)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    cardBorderClass: 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20',
  },
};

const PERIODS: { code: PeriodType; label: string }[] = [
  { code: 'ttm', label: 'Trailing 12M' },
  { code: 'ytd', label: 'Year to date' },
  { code: 'quarter', label: 'This quarter' },
  { code: 'this_month', label: 'This month' },
];

const MONTH_LABELS = [
  'Month 1',
  'Month 2',
  'Month 3',
  'Month 4',
  'Month 5',
  'Month 6',
  'Month 7',
  'Month 8',
  'Month 9',
  'Month 10',
  'Month 11',
  'Month 12',
];

interface BudgetItem {
  category: string;
  actual: number;
  budget: number;
  type: 'revenue' | 'expense';
}

interface IntelligenceData {
  connected: boolean;
  currency?: string;
  periodInfo?: {
    label: string;
    startDate: string;
    endDate: string;
    dataSource: string;
  };
  profitability?: {
    revenue: number;
    grossProfit: number;
    grossMarginPct: number;
    ebitda: number;
    ebitdaMarginPct: number;
    opexFixed: number;
    opexVariable: number;
    cogs?: number;
    netProfit: number;
    netMarginPct: number;
    monthlyTrend?: { month: string; revenue: number; expenses?: number }[];
  };
  cashFlow13Week?: {
    startingCash: number;
    weeks?: { weekNum: number; cashIn: number; cashOut: number; endingCash: number }[];
  };
  budgeting?: {
    revActual: number;
    revBudget: number;
    expActual: number;
    expBudget: number;
    budgetItems?: BudgetItem[];
  };
}

function ForecastMetricCard({
  title,
  value,
  detail,
  badge,
  badgeType,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  badge?: string;
  badgeType?: 'favorable' | 'unfavorable' | 'neutral';
  accent: string;
}) {
  return (
    <article
      className={cn(
        'min-w-0 rounded-md border border-slate-200 border-l-[3px] bg-white px-3 py-2.5 transition-all shadow-2xs',
        accent,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-medium text-slate-600">{title}</p>
        {badge && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none',
              badgeType === 'favorable'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : badgeType === 'unfavorable'
                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
                  : 'border border-slate-200 bg-slate-100 text-slate-600',
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 truncate text-[10px] leading-4 text-slate-500">{detail}</p>
    </article>
  );
}

export default function ForecastPage() {
  const [period, setPeriod] = useState<PeriodType>('ttm');
  const [scenario, setScenario] = useState<ScenarioType>('average');
  const [revGrowthPct, setRevGrowthPct] = useState<number>(10);
  const [costInflationPct, setCostInflationPct] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'schedule' | 'cfo-insights'>('cockpit');

  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const cashChartRef = useRef<HTMLDivElement>(null);
  const pnlChartRef = useRef<HTMLDivElement>(null);

  const activePreset = SCENARIO_PRESETS[scenario];

  // Load forecast baseline from accounting API
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch(`/api/dashboard/cfo-intelligence?period=${period}`, {
          cache: 'no-store',
        });
        if (res.ok && isMounted) {
          const result: IntelligenceData = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching forecast baseline:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [period]);

  const refreshBaseline = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/cfo-intelligence?period=${period}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const result: IntelligenceData = await res.json();
        setData(result);
        toast.success('Forecast baseline synchronized with live accounting.');
      } else {
        toast.error('Failed to refresh financial baseline.');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Network error during baseline refresh.');
    } finally {
      setIsRefreshing(false);
    }
  }, [period]);

  const handleScenarioSelect = (type: ScenarioType) => {
    setScenario(type);
    const preset = SCENARIO_PRESETS[type];
    setRevGrowthPct(preset.growthPct);
    setCostInflationPct(preset.inflationPct);
  };

  const currency = data?.currency || 'GBP';
  const formatMoney = useMemo(() => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
  }, [currency]);

  // Baseline figures from Xero actuals
  const baselineRevenue = data?.profitability?.revenue ?? 33091;
  const baselineOpex =
    (data?.profitability?.opexFixed ?? 0) + (data?.profitability?.opexVariable ?? 0) || 27054;
  const baselineCogs = data?.profitability?.cogs ?? Math.round(baselineRevenue * 0.38);
  const startingCash = data?.cashFlow13Week?.startingCash ?? 25400;

  // Multipliers derived from sliders
  const currentRevMultiplier = 1 + revGrowthPct / 100;
  const currentCostMultiplier = 1 + costInflationPct / 100;

  // Forward Projections
  const projRev = Math.round(baselineRevenue * currentRevMultiplier);
  const projCogs = Math.round(baselineCogs * currentCostMultiplier);
  const projOpex = Math.round(baselineOpex * currentCostMultiplier);
  const projTotalCost = projCogs + projOpex;
  const projGrossProfit = projRev - projCogs;
  const projGrossMarginPct = projRev > 0 ? (projGrossProfit / projRev) * 100 : 0;
  const projNetProfit = projGrossProfit - projOpex;
  const projEbitda = Math.round(projGrossProfit - projOpex * 0.7);
  const projEbitdaMarginPct = projRev > 0 ? (projEbitda / projRev) * 100 : 0;

  const simulationData = useMemo(() => {
    let runningCash = startingCash;
    let baselineRunningCash = startingCash;

    const monthlyRev = projRev / 12;
    const monthlyCost = projTotalCost / 12;

    const baseMonthlyRev = (baselineRevenue * 1.1) / 12;
    const baseMonthlyCost = (baselineCogs * 1.03 + baselineOpex * 1.03) / 12;
    const baseMonthlyNetCash = baseMonthlyRev - baseMonthlyCost;

    const cashTrajectory: number[] = [];
    const baselineTrajectory: number[] = [];
    const monthlyRevSeries: number[] = [];
    const monthlyCostSeries: number[] = [];
    const monthlyProfitSeries: number[] = [];

    for (let i = 0; i < 12; i++) {
      const seasonality = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.03;
      const mRev = Math.round(monthlyRev * seasonality);
      const mCost = Math.round(monthlyCost);
      const mProfit = mRev - mCost;

      runningCash += mProfit;
      baselineRunningCash += baseMonthlyNetCash;

      cashTrajectory.push(Math.round(runningCash));
      baselineTrajectory.push(Math.round(baselineRunningCash));
      monthlyRevSeries.push(mRev);
      monthlyCostSeries.push(mCost);
      monthlyProfitSeries.push(mProfit);
    }

    const endingCash = cashTrajectory[11] ?? startingCash;
    const netCashChange = endingCash - startingCash;
    const avgMonthlyBurnOrGain = (projRev - projTotalCost) / 12;
    const runwayMonths =
      avgMonthlyBurnOrGain >= 0
        ? 'Infinite (Cashflow +)'
        : (startingCash / Math.abs(avgMonthlyBurnOrGain)).toFixed(1) + ' Months';

    return {
      cashTrajectory,
      baselineTrajectory,
      monthlyRevSeries,
      monthlyCostSeries,
      monthlyProfitSeries,
      endingCash,
      netCashChange,
      runwayMonths,
      avgMonthlyBurnOrGain,
    };
  }, [startingCash, projRev, projTotalCost, baselineRevenue, baselineCogs, baselineOpex]);

  // Scenario Matrix Comparison
  const scenarioMatrix = useMemo(() => {
    return (['worst', 'average', 'best'] as const).map((key) => {
      const cfg = SCENARIO_PRESETS[key];
      const sRev = Math.round(baselineRevenue * cfg.revMultiplier);
      const sCost = Math.round((baselineCogs + baselineOpex) * cfg.costMultiplier);
      const sProfit = sRev - sCost;
      const sMargin = sRev > 0 ? (sProfit / sRev) * 100 : 0;
      const baseProfit = baselineRevenue - (baselineCogs + baselineOpex);
      const deltaProfit = sProfit - baseProfit;
      return {
        ...cfg,
        projRev: sRev,
        projCost: sCost,
        projProfit: sProfit,
        marginPct: sMargin,
        deltaProfit,
      };
    });
  }, [baselineRevenue, baselineCogs, baselineOpex]);

  // ECharts: Cash Balance Trajectory
  useEffect(() => {
    if (!cashChartRef.current) return;
    const chart = echarts.getInstanceByDom(cashChartRef.current) || echarts.init(cashChartRef.current);

    const option: echarts.EChartsOption = {
      grid: { left: '2%', right: '3%', top: '14%', bottom: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          let tip = `<div class="font-bold text-xs pb-1 mb-1 border-b border-slate-700">${params[0]?.name}</div>`;
          params.forEach((p: { seriesName?: string; value?: number; color?: string }) => {
            tip += `<div class="flex items-center justify-between gap-4 py-0.5 text-[11px]">
              <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" style="background:${p.color}"></span>${p.seriesName}</span>
              <span class="font-mono font-bold">${formatMoney.format(Number(p.value) || 0)}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend: {
        data: ['Projected Cash Balance', 'Base-Case Baseline'],
        right: '2%',
        top: '0%',
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 500 },
      },
      xAxis: {
        type: 'category',
        data: MONTH_LABELS,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => formatMoney.format(v),
        },
      },
      series: [
        {
          name: 'Projected Cash Balance',
          type: 'line',
          smooth: true,
          data: simulationData.cashTrajectory,
          itemStyle: { color: '#0284c7' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(2, 132, 199, 0.28)' },
              { offset: 1, color: 'rgba(2, 132, 199, 0.0)' },
            ]),
          },
        },
        {
          name: 'Base-Case Baseline',
          type: 'line',
          smooth: true,
          lineStyle: { type: 'dashed', width: 2, color: '#94a3b8' },
          itemStyle: { color: '#94a3b8' },
          data: simulationData.baselineTrajectory,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [simulationData, formatMoney]);

  // ECharts: Monthly Revenue & Cost Profile
  useEffect(() => {
    if (!pnlChartRef.current) return;
    const chart = echarts.getInstanceByDom(pnlChartRef.current) || echarts.init(pnlChartRef.current);

    const option: echarts.EChartsOption = {
      grid: { left: '2%', right: '3%', top: '14%', bottom: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 },
      },
      legend: {
        data: ['Projected Revenue', 'Projected Costs', 'Net Margin'],
        right: '2%',
        top: '0%',
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 500 },
      },
      xAxis: {
        type: 'category',
        data: MONTH_LABELS,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (v: number) => formatMoney.format(v),
          },
        },
      ],
      series: [
        {
          name: 'Projected Revenue',
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: '#0284c7', borderRadius: [3, 3, 0, 0] },
          data: simulationData.monthlyRevSeries,
        },
        {
          name: 'Projected Costs',
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: '#f43f5e', borderRadius: [3, 3, 0, 0] },
          data: simulationData.monthlyCostSeries,
        },
        {
          name: 'Net Margin',
          type: 'line',
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2 },
          data: simulationData.monthlyProfitSeries,
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [simulationData, formatMoney]);

  // Line-Item Projection Schedule derived from Xero budget items
  const lineItemProjections = useMemo(() => {
    const rawItems = data?.budgeting?.budgetItems ?? [];
    const sourceItems =
      rawItems.length > 0
        ? rawItems
        : [
            { category: 'Sales Revenue', actual: baselineRevenue, budget: baselineRevenue, type: 'revenue' as const },
            { category: 'Cost of Goods Sold (COGS)', actual: baselineCogs, budget: baselineCogs, type: 'expense' as const },
            { category: 'Advertising', actual: 2309, budget: 2425, type: 'expense' as const },
            { category: 'Rent', actual: 1091, budget: 1146, type: 'expense' as const },
            { category: 'Cleaning', actual: 400, budget: 420, type: 'expense' as const },
            { category: 'Motor Vehicle Expenses', actual: 380, budget: 399, type: 'expense' as const },
            { category: 'Travel - National', actual: 301, budget: 316, type: 'expense' as const },
            { category: 'Telephone & Internet', actual: 152, budget: 159, type: 'expense' as const },
            { category: 'Office Expenses', actual: 157, budget: 165, type: 'expense' as const },
            { category: 'General Expenses', actual: 120, budget: 126, type: 'expense' as const },
            { category: 'Light, Power, Heating', actual: 100, budget: 105, type: 'expense' as const },
            { category: 'Freight & Courier', actual: 106, budget: 111, type: 'expense' as const },
            { category: 'Consulting & Accounting', actual: 29, budget: 30, type: 'expense' as const },
          ];

    return sourceItems.map((item) => {
      const mult = item.type === 'revenue' ? currentRevMultiplier : currentCostMultiplier;
      const projectedAnnual = Math.round(item.actual * mult);
      const projectedMonthly = Math.round(projectedAnnual / 12);
      const delta = projectedAnnual - item.actual;
      const deltaPct = item.actual > 0 ? (delta / item.actual) * 100 : 0;
      return {
        ...item,
        projectedAnnual,
        projectedMonthly,
        delta,
        deltaPct,
      };
    });
  }, [data?.budgeting?.budgetItems, baselineRevenue, baselineCogs, currentRevMultiplier, currentCostMultiplier]);

  return (
    <main className="space-y-3 p-4 md:p-6 text-slate-800">
      {/* Header Banner */}
      <header className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">
              Financial Forecast &amp; Scenario Cockpit
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                data?.connected
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-amber-200 bg-amber-50 text-amber-800',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  data?.connected ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
              {data?.connected ? 'Xero connected' : 'Accounting disconnected'}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
              Virtual CFO Predictive Engine
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Forward 12-month predictive modeling, cash trajectory simulation, and sensitivity stress testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/budgeting"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Calculator className="h-3.5 w-3.5 text-sky-600" />
            <span>Budget &amp; Variance</span>
          </Link>

          <button
            type="button"
            onClick={refreshBaseline}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-slate-500', isRefreshing && 'animate-spin')} />
            <span>Refresh Baseline</span>
          </button>
        </div>
      </header>

      {/* Control Bar: Scenarios & Periods */}
      <section
        aria-label="Forecast controls"
        className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Scenario:</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
              {(['average', 'best', 'worst'] as const).map((scKey) => {
                const sc = SCENARIO_PRESETS[scKey];
                const isActive = scenario === scKey;
                return (
                  <button
                    key={scKey}
                    type="button"
                    onClick={() => handleScenarioSelect(scKey)}
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer',
                      isActive
                        ? scKey === 'best'
                          ? 'bg-emerald-600 font-semibold text-white shadow-xs'
                          : scKey === 'worst'
                            ? 'bg-rose-600 font-semibold text-white shadow-xs'
                            : 'bg-slate-900 font-semibold text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900',
                    )}
                  >
                    {scKey === 'best' && <TrendingUp className="h-3 w-3" />}
                    {scKey === 'worst' && <TrendingDown className="h-3 w-3" />}
                    {scKey === 'average' && <SlidersHorizontal className="h-3 w-3" />}
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baseline Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Baseline Period:</span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
              {PERIODS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setPeriod(option.code)}
                  aria-pressed={period === option.code}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer',
                    period === option.code
                      ? 'bg-slate-900 font-semibold text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Sensitivity Modeling Panel */}
      <section className="rounded-md border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Layers className="h-4 w-4 text-sky-700" />
              <h2 className="text-xs font-semibold text-slate-900">
                Scenario sensitivity modeling
              </h2>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  activePreset.badgeClass,
                )}
              >
                Active: {activePreset.label}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Compare Worst Case, Average Case, and Best Case assumptions. Figures show forward 12-month
              projections derived from historical run-rates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Target multipliers:</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
              Rev: {currentRevMultiplier.toFixed(2)}x · Cost: {currentCostMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {scenarioMatrix.map((item) => {
            const isCurrent = scenario === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleScenarioSelect(item.key)}
                className={cn(
                  'group relative flex flex-col justify-between rounded-md border p-3 text-left transition-all cursor-pointer',
                  isCurrent
                    ? cn('shadow-sm', item.cardBorderClass)
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      {item.key === 'best' && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                      {item.key === 'worst' && <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
                      {item.key === 'average' && <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600" />}
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                        item.key === 'best'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.key === 'worst'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700',
                      )}
                    >
                      {isCurrent ? 'Active' : 'Select'}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.description}</p>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400">Projected Rev (12M):</span>
                      <p className="font-semibold tabular-nums text-slate-800">
                        {formatMoney.format(item.projRev)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Operating Costs:</span>
                      <p className="font-semibold tabular-nums text-slate-800">
                        {formatMoney.format(item.projCost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Projected Profit:</span>
                      <p
                        className={cn(
                          'font-semibold tabular-nums',
                          item.projProfit >= 0 ? 'text-emerald-700' : 'text-rose-600',
                        )}
                      >
                        {formatMoney.format(item.projProfit)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Margin &amp; Delta:</span>
                      <p className="font-semibold tabular-nums text-slate-800">
                        {item.marginPct.toFixed(1)}%{' '}
                        {item.deltaProfit !== 0 && (
                          <span
                            className={cn(
                              'text-[9px]',
                              item.deltaProfit > 0 ? 'text-emerald-600' : 'text-rose-600',
                            )}
                          >
                            ({item.deltaProfit > 0 ? '+' : ''}
                            {formatMoney.format(item.deltaProfit)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Scenario Parameter Sliders */}
      <section className="rounded-md border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-semibold text-slate-900">Custom Sensitivity Levers</h2>
          </div>
          <span className="text-[10px] text-slate-500">
            Fine-tune annual growth and cost pressure sliders to simulate instant outcomes
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Revenue Growth Slider */}
          <div className="space-y-1.5 rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Annual Revenue Growth Target:</span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-bold tabular-nums',
                  revGrowthPct >= 0
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700',
                )}
              >
                {revGrowthPct > 0 ? `+${revGrowthPct}%` : `${revGrowthPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              step="1"
              value={revGrowthPct}
              onChange={(e) => setRevGrowthPct(parseInt(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-slate-200 accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>-30% Contraction</span>
              <span>0% Flat</span>
              <span>+50% Aggressive Expansion</span>
            </div>
          </div>

          {/* Cost Inflation Slider */}
          <div className="space-y-1.5 rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Cost Inflation &amp; Overhead Increase:</span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-bold tabular-nums',
                  costInflationPct <= 3
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                {costInflationPct > 0 ? `+${costInflationPct}%` : `${costInflationPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="1"
              value={costInflationPct}
              onChange={(e) => setCostInflationPct(parseInt(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-lg bg-slate-200 accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>-10% Overhead Cuts</span>
              <span>+3% Normal Benchmark</span>
              <span>+30% Severe Inflation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast Output Key KPI Cards */}
      <section
        aria-label="Financial overview"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        <ForecastMetricCard
          title="Projected Revenue"
          value={isLoading ? '...' : formatMoney.format(projRev)}
          badge={`${revGrowthPct >= 0 ? '+' : ''}${revGrowthPct}%`}
          badgeType={revGrowthPct >= 0 ? 'favorable' : 'unfavorable'}
          detail={`Historical Baseline: ${formatMoney.format(baselineRevenue)}`}
          accent={revGrowthPct >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'}
        />

        <ForecastMetricCard
          title="Projected Gross Margin"
          value={isLoading ? '...' : `${projGrossMarginPct.toFixed(1)}%`}
          badge={`${formatMoney.format(projGrossProfit)} GP`}
          badgeType={projGrossProfit >= baselineRevenue - baselineCogs ? 'favorable' : 'unfavorable'}
          detail={`Projected COGS: ${formatMoney.format(projCogs)}`}
          accent="border-l-sky-600"
        />

        <ForecastMetricCard
          title="Projected Operating Costs"
          value={isLoading ? '...' : formatMoney.format(projOpex)}
          badge={`+${costInflationPct}% Inflation`}
          badgeType={costInflationPct <= 3 ? 'favorable' : 'unfavorable'}
          detail={`Baseline OpEx: ${formatMoney.format(baselineOpex)}`}
          accent={costInflationPct <= 3 ? 'border-l-emerald-600' : 'border-l-amber-600'}
        />

        <ForecastMetricCard
          title="Projected EBITDA"
          value={isLoading ? '...' : formatMoney.format(projEbitda)}
          badge={`${projEbitdaMarginPct.toFixed(1)}% Margin`}
          badgeType={projEbitda >= 0 ? 'favorable' : 'unfavorable'}
          detail={`Net Profit: ${formatMoney.format(projNetProfit)}`}
          accent={projEbitda >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'}
        />

        <ForecastMetricCard
          title="Month 12 Ending Cash"
          value={isLoading ? '...' : formatMoney.format(simulationData.endingCash)}
          badge={simulationData.netCashChange >= 0 ? 'Cash Accumulating' : 'Cash Depleting'}
          badgeType={simulationData.netCashChange >= 0 ? 'favorable' : 'unfavorable'}
          detail={`Starting: ${formatMoney.format(startingCash)} (${simulationData.netCashChange >= 0 ? '+' : ''}${formatMoney.format(simulationData.netCashChange)})`}
          accent={simulationData.netCashChange >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'}
        />

        <ForecastMetricCard
          title="Cash Runway Horizon"
          value={isLoading ? '...' : simulationData.runwayMonths}
          badge={simulationData.avgMonthlyBurnOrGain >= 0 ? 'Sustainable' : 'Burn Watch'}
          badgeType={simulationData.avgMonthlyBurnOrGain >= 0 ? 'favorable' : 'unfavorable'}
          detail={`Monthly Net: ${simulationData.avgMonthlyBurnOrGain >= 0 ? '+' : ''}${formatMoney.format(simulationData.avgMonthlyBurnOrGain)}/mo`}
          accent={simulationData.avgMonthlyBurnOrGain >= 0 ? 'border-l-emerald-600' : 'border-l-amber-600'}
        />
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition cursor-pointer',
            activeTab === 'cockpit'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <LineChart className="h-3.5 w-3.5" />
          <span>Forward Trajectory Charts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition cursor-pointer',
            activeTab === 'schedule'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Line-Item Projection Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cfo-insights')}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition cursor-pointer',
            activeTab === 'cfo-insights'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Virtual CFO Advisory Insights</span>
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
          <span className="ml-2 text-xs">Loading baseline intelligence...</span>
        </div>
      )}

      {/* Tab 1: Forward Trajectory Charts */}
      {!isLoading && activeTab === 'cockpit' && (
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {/* Chart 1: Forward Cash Trajectory */}
          <article className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-xs font-semibold text-slate-900">
                  Forward 12-Month Cash &amp; Capital Trajectory
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Simulated monthly cash balance trajectory comparing {activePreset.label} vs baseline
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                Reserves Simulation
              </span>
            </div>
            <div ref={cashChartRef} className="h-64 w-full" />
          </article>

          {/* Chart 2: Monthly Revenue & Cost Profile */}
          <article className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-xs font-semibold text-slate-900">
                  Forward Monthly Revenue &amp; Cost Run-Rates
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Monthly revenue vs total cost vs net margin across the forward 12-month timeline
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                P&amp;L Run-Rate
              </span>
            </div>
            <div ref={pnlChartRef} className="h-64 w-full" />
          </article>
        </section>
      )}

      {/* Tab 2: Line-Item Projection Schedule */}
      {!isLoading && activeTab === 'schedule' && (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900">
                Forward 12-Month Itemized Projection Schedule
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Line-by-line forward projection showing annual forecast, monthly run-rate, and variance vs historical baseline.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {lineItemProjections.length} line items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-50/70 text-[10px] text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Line Item</th>
                  <th className="px-3 py-2.5 font-semibold">Account Type</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Baseline Actual</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Projected Annual (12M)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Monthly Run-Rate</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Delta vs Baseline</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Strategic Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItemProjections.map((item) => {
                  const isRev = item.type === 'revenue';
                  const favorable = isRev ? item.delta >= 0 : item.delta <= 0;
                  return (
                    <tr key={item.category} className="text-slate-700 hover:bg-slate-50/60">
                      <th scope="row" className="px-3 py-2.5 text-left font-medium text-slate-900">
                        {item.category}
                      </th>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                            isRev ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                        {formatMoney.format(item.actual)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney.format(item.projectedAnnual)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {formatMoney.format(item.projectedMonthly)}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-semibold tabular-nums',
                          favorable ? 'text-emerald-700' : 'text-rose-600',
                        )}
                      >
                        {item.delta > 0 ? '+' : ''}
                        {formatMoney.format(item.delta)} ({item.deltaPct > 0 ? '+' : ''}
                        {item.deltaPct.toFixed(1)}%)
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            favorable
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700',
                          )}
                        >
                          {favorable ? (
                            <CircleCheck className="h-3 w-3" />
                          ) : (
                            <CircleAlert className="h-3 w-3" />
                          )}
                          {isRev
                            ? item.delta >= 0
                              ? 'Growth Driver'
                              : 'Contraction Risk'
                            : item.delta <= 0
                              ? 'Cost Savings'
                              : 'Inflation Pressure'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Virtual CFO Advisory Insights */}
      {!isLoading && activeTab === 'cfo-insights' && (
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-semibold text-slate-900">
              Virtual CFO Strategic Recommendations ({activePreset.label})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                1. Top-Line Growth Plan
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Under the current {revGrowthPct >= 0 ? `+${revGrowthPct}%` : `${revGrowthPct}%`} growth lever, target annual revenue is{' '}
                <span className="font-bold text-slate-900">{formatMoney.format(projRev)}</span>. Prioritize expanding high-margin service contracts and monitoring churn on top customers.
              </p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                2. Overhead &amp; Inflation Discipline
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Projected total costs reach <span className="font-bold text-slate-900">{formatMoney.format(projTotalCost)}</span> with +{costInflationPct}% inflation. Recommend conducting quarterly vendor price renegotiations to lock in favorable supply terms.
              </p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                3. Cash Runway &amp; Liquidity
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Ending reserves are projected at <span className="font-bold text-slate-900">{formatMoney.format(simulationData.endingCash)}</span> with a runway of <span className="font-bold text-slate-900">{simulationData.runwayMonths}</span>. Current liquidity is sound and provides sufficient buffer against operational volatility.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer Disclaimer */}
      <footer className="text-[10px] leading-relaxed text-slate-500">
        Financial actuals and starting cash are loaded directly from the Xero finance integration. Forward projections apply customizable predictive run-rates, growth multipliers, and cost inflation curves; they are dynamic sensitivity simulations and not Xero-audited accounting records.
      </footer>
    </main>
  );
}
