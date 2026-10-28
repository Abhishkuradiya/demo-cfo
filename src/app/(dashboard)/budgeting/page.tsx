'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Coins,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Landmark,
  LineChart,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const QUARTERS: { key: QuarterKey; label: string; months: [number, number, number] }[] = [
  { key: 'Q1', label: 'Q1 (Jan–Mar)', months: [0, 1, 2] },
  { key: 'Q2', label: 'Q2 (Apr–Jun)', months: [3, 4, 5] },
  { key: 'Q3', label: 'Q3 (Jul–Sep)', months: [6, 7, 8] },
  { key: 'Q4', label: 'Q4 (Oct–Dec)', months: [9, 10, 11] },
];
import type { BudgetReportItem, BudgetingReportData } from '@/lib/exports/budgeting-report';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';

export interface BalanceSheetItem {
  name: string;
  value: number;
}

export interface CashFlowWeekItem {
  weekNum: number;
  weekLabel?: string;
  cashIn: number;
  cashOut: number;
  netCash?: number;
  endingCash: number;
  status?: string;
}

export type ScenarioType = 'average' | 'best' | 'worst';

export interface ScenarioConfig {
  key: ScenarioType;
  label: string;
  badgeLabel: string;
  revMultiplier: number;
  costMultiplier: number;
  growthPct: number;
  description: string;
  tagline: string;
  badgeClass: string;
  cardBorderClass: string;
}

export const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  average: {
    key: 'average',
    label: 'Average Case',
    badgeLabel: 'Average (Baseline)',
    revMultiplier: 1.0,
    costMultiplier: 1.0,
    growthPct: 10,
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
    growthPct: -5,
    description: 'Demand slowdown (-15%) coupled with cost inflation & unexpected overrun (+10%).',
    tagline: 'Downside Stress Test (-15% Rev / +10% Costs)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    cardBorderClass: 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20',
  },
};

type Period = 'ttm' | 'ytd' | 'quarter' | 'this_month';

interface IntelligenceResponse extends BudgetingReportData {
  connected: boolean;
  error?: string;
}

type BudgetItem = BudgetReportItem;

const periods: { code: Period; label: string }[] = [
  { code: 'ttm', label: 'Trailing 12M' },
  { code: 'ytd', label: 'Year to date' },
  { code: 'quarter', label: 'This quarter' },
  { code: 'this_month', label: 'This month' },
];

const EMPTY_BUDGET_ITEMS: BudgetItem[] = [];

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

function MetricCard({
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
        'min-w-0 rounded-md border border-slate-200 border-l-[3px] bg-white px-3 py-2.5 transition-all',
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

export default function BudgetingPage() {
  const setSidebarCollapsed = useSidebarStore((state) => state.setCollapsed);
  const [period, setPeriod] = useState<Period>('ttm');
  const [scenario] = useState<ScenarioType>('average');
  const activeScenarioConfig = SCENARIOS[scenario];
  const [statementView, setStatementView] = useState<'pnl' | 'cashflow'>('pnl');
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [planningHorizon, setPlanningHorizon] = useState<'monthly' | 'quarterly' | 'annual'>(
    'monthly',
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState<'all' | QuarterKey>('all');
  const [monthlyByMonth, setMonthlyByMonth] = useState<
    Record<number, Record<string, { budget: number; target: number }>>
  >({});
  const [budgetPlans, setBudgetPlans] = useState<
    Record<string, Record<string, { budget: number; target: number }>>
  >({});
  const [hasCustomizedPlan, setHasCustomizedPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbSavedAt, setDbSavedAt] = useState<string | null>(null);
  const currentSystemYear = new Date().getFullYear();
  const [budgetYear, setBudgetYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2025, 2026, 2027]);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const budgetChartRef = useRef<HTMLDivElement>(null);
  const cashFlowChartRef = useRef<HTMLDivElement>(null);

  const applyPlanData = useCallback((parsedRaw: unknown) => {
    if (!parsedRaw || typeof parsedRaw !== 'object') return;
    const parsed = parsedRaw as {
      monthlyByMonth?: Record<number, Record<string, { budget: number; target: number }>>;
      monthly?: Record<string, { budget: number; target: number }>;
      quarterly?: Record<string, { budget: number; target: number }>;
      annual?: Record<string, { budget: number; target: number }>;
    };
    if (parsed.monthlyByMonth && typeof parsed.monthlyByMonth === 'object') {
      setMonthlyByMonth(parsed.monthlyByMonth);
    } else if (parsed.monthly && typeof parsed.monthly === 'object') {
      const backfill: Record<number, Record<string, { budget: number; target: number }>> = {};
      for (let m = 0; m < 12; m++) {
        backfill[m] = { ...parsed.monthly };
      }
      setMonthlyByMonth(backfill);
    }
    if (parsed.monthly || parsed.quarterly || parsed.annual) {
      setBudgetPlans({
        monthly: parsed.monthly ?? {},
        quarterly: parsed.quarterly ?? {},
        annual: parsed.annual ?? {},
      });
    } else {
      setBudgetPlans(parsed as Record<string, Record<string, { budget: number; target: number }>>);
    }
    setHasCustomizedPlan(true);
  }, []);

  const addNewPlanningYear = () => {
    const nextYear = Math.max(...availableYears) + 1;
    setAvailableYears((prev) => [...prev, nextYear].sort((a, b) => a - b));
    setBudgetYear(nextYear);
    toast.success(`Initialized planning workspace for FY ${nextYear}.`);
  };

  const copyPreviousYearBudget = () => {
    const prevYear = budgetYear - 1;
    const prevSaved =
      window.localStorage.getItem(`virtual-cfo-budget-plans-${prevYear}`) ||
      (prevYear === 2026 ? window.localStorage.getItem('virtual-cfo-budget-plans') : null);

    if (prevSaved) {
      try {
        const parsed = JSON.parse(prevSaved);
        applyPlanData(parsed);
        toast.success(`Copied baseline plan from FY ${prevYear} into FY ${budgetYear}!`);
        return;
      } catch {
        // ignore
      }
    }
    toast.info(`No custom saved plan found for FY ${prevYear}; using standard baseline.`);
  };

  // Fetch plan when budgetYear changes
  useEffect(() => {
    let isMounted = true;
    const fetchBudgetPlan = async () => {
      try {
        const res = await fetch(`/api/dashboard/budget-plans?year=${budgetYear}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.plan) {
            if (isMounted) {
              applyPlanData(json.plan);
              if (json.updatedAt) {
                setDbSavedAt(json.updatedAt);
              }
            }
            return;
          }
        }
      } catch (err) {
        console.warn(`Could not fetch custom plan for FY ${budgetYear} from database`, err);
      }

      // Fallback to local storage if database hasn't stored one or network is offline
      try {
        const saved =
          window.localStorage.getItem(`virtual-cfo-budget-plans-${budgetYear}`) ||
          (budgetYear === 2026 ? window.localStorage.getItem('virtual-cfo-budget-plans') : null);
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          applyPlanData(parsed);
          return;
        }
      } catch {
        // ignore
      }

      if (isMounted) {
        // Reset to default benchmarks for this specific year if no custom plan exists
        setDbSavedAt(null);
        setHasCustomizedPlan(false);
        setMonthlyByMonth({});
        setBudgetPlans({});
      }
    };

    fetchBudgetPlan();
    return () => {
      isMounted = false;
    };
  }, [applyPlanData, budgetYear]);

  // Load available saved years on initial mount
  useEffect(() => {
    let isMounted = true;
    const fetchSavedYears = async () => {
      try {
        const res = await fetch('/api/dashboard/budget-plans?action=list', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.years && Array.isArray(json.years) && json.years.length > 0 && isMounted) {
            setAvailableYears((prev) => {
              const merged = Array.from(new Set([...prev, ...json.years])).sort((a, b) => a - b);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not load saved budget years:', err);
      }
    };
    fetchSavedYears();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    const controller = new AbortController();
    const loadBudgetData = async () => {
      try {
        const params = new URLSearchParams({ period });
        params.set('_t', Date.now().toString());
        const response = await fetch(`/api/dashboard/cfo-intelligence?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const result = (await response.json()) as IntelligenceResponse;
        if (!response.ok) {
          throw new Error(result.error || 'Unable to load Xero financial data.');
        }
        if (
          result.connected &&
          (!result.profitability || !result.cashFlow13Week || !result.budgeting)
        ) {
          throw new Error('The financial data response is incomplete. Please try again.');
        }
        setData(result);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load financial data.';
        console.error('Failed to load Xero budget dashboard:', fetchError);
        setError(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadBudgetData();
    return () => controller.abort();
  }, [period, refreshCount]);

  const profitability = data?.profitability;
  const budgetItems = data?.budgeting?.budgetItems ?? EMPTY_BUDGET_ITEMS;

  const currency = data?.currency || 'GBP';
  const formatMoney = useMemo(() => currencyFormatter(currency), [currency]);
  const actualRevenue = profitability?.revenue ?? 0;
  const periodMonths =
    period === 'ytd'
      ? new Date().getMonth() + 1
      : period === 'quarter'
        ? 3
        : period === 'this_month'
          ? 1
          : 12;

  const forecastRevenue = actualRevenue * (12 / periodMonths) * activeScenarioConfig.revMultiplier;

  const currentMonthIdx = useMemo(() => new Date().getMonth(), []);
  const currentQuarterKey: QuarterKey =
    currentMonthIdx < 3 ? 'Q1' : currentMonthIdx < 6 ? 'Q2' : currentMonthIdx < 9 ? 'Q3' : 'Q4';

  const getDefaultMonthlyValues = useCallback(
    (item: { budget: number; type: 'revenue' | 'expense' }) => {
      const annualBase = (item.budget / periodMonths) * 12;
      const defAnnualBudget = Math.round(annualBase);
      const defAnnualTarget = Math.round(defAnnualBudget * (item.type === 'revenue' ? 1.05 : 0.95));
      const defMonthlyBudget = Math.round(defAnnualBudget / 12);
      const defMonthlyTarget = Math.round(defAnnualTarget / 12);
      return { budget: defMonthlyBudget, target: defMonthlyTarget };
    },
    [periodMonths],
  );

  // Dashboard budget items: strictly bound to active period horizon with full 12-month intelligence
  const effectiveBudgetItems = useMemo(
    () =>
      budgetItems.map((item) => {
        let baseBudget = item.budget;
        let baseTarget = Math.round(item.budget * (item.type === 'revenue' ? 1.05 : 0.95));

        if (hasCustomizedPlan) {
          const def = getDefaultMonthlyValues(item);
          if (period === 'this_month') {
            const mData =
              monthlyByMonth[currentMonthIdx]?.[item.category] ??
              budgetPlans.monthly?.[item.category] ??
              def;
            baseBudget = mData.budget;
            baseTarget = mData.target;
          } else if (period === 'quarter') {
            const qDef = QUARTERS.find((q) => q.key === currentQuarterKey)!;
            let qB = 0;
            let qT = 0;
            qDef.months.forEach((m) => {
              const mData = monthlyByMonth[m]?.[item.category] ?? def;
              qB += mData.budget;
              qT += mData.target;
            });
            baseBudget = qB || (budgetPlans.quarterly?.[item.category]?.budget ?? def.budget * 3);
            baseTarget = qT || (budgetPlans.quarterly?.[item.category]?.target ?? def.target * 3);
          } else if (period === 'ytd') {
            let ytdB = 0;
            let ytdT = 0;
            for (let m = 0; m <= currentMonthIdx; m++) {
              const mData = monthlyByMonth[m]?.[item.category] ?? def;
              ytdB += mData.budget;
              ytdT += mData.target;
            }
            baseBudget = ytdB;
            baseTarget = ytdT;
          } else {
            // 'this_year' or 'ttm' -> Sum of all 12 months
            let annB = 0;
            let annT = 0;
            for (let m = 0; m < 12; m++) {
              const mData = monthlyByMonth[m]?.[item.category] ?? def;
              annB += mData.budget;
              annT += mData.target;
            }
            baseBudget = annB || (budgetPlans.annual?.[item.category]?.budget ?? def.budget * 12);
            baseTarget = annT || (budgetPlans.annual?.[item.category]?.target ?? def.target * 12);
          }
        }

        const multiplier =
          item.type === 'revenue'
            ? activeScenarioConfig.revMultiplier
            : activeScenarioConfig.costMultiplier;
        return {
          ...item,
          rawBudget: baseBudget,
          rawTarget: baseTarget,
          budget: Math.round(baseBudget * multiplier),
          target: Math.round(baseTarget * multiplier),
        };
      })
      .filter((item) => Math.abs(item.actual) > 0 || Math.abs(item.budget) > 0),
    [
      budgetItems,
      budgetPlans,
      monthlyByMonth,
      activeScenarioConfig,
      hasCustomizedPlan,
      period,
      currentMonthIdx,
      currentQuarterKey,
      getDefaultMonthlyValues,
    ],
  );

  // Dedicated planner items: bound to selected month / quarter / annual view
  const plannerBudgetItems = useMemo(() => {
    return budgetItems.map((item) => {
      const def = getDefaultMonthlyValues(item);
      let rawBudget = def.budget;
      let rawTarget = def.target;
      let scaledActual = 0;

      if (planningHorizon === 'monthly') {
        const mData = monthlyByMonth[selectedMonth]?.[item.category] ?? def;
        rawBudget = mData.budget;
        rawTarget = mData.target;
        scaledActual = Math.round(item.actual / periodMonths);
      } else if (planningHorizon === 'quarterly') {
        if (selectedQuarter === 'all') {
          let annB = 0;
          let annT = 0;
          for (let m = 0; m < 12; m++) {
            const mData = monthlyByMonth[m]?.[item.category] ?? def;
            annB += mData.budget;
            annT += mData.target;
          }
          rawBudget = Math.round(annB / 4);
          rawTarget = Math.round(annT / 4);
          scaledActual = Math.round((item.actual / periodMonths) * 3);
        } else {
          const qDef = QUARTERS.find((q) => q.key === selectedQuarter)!;
          let qB = 0;
          let qT = 0;
          qDef.months.forEach((m) => {
            const mData = monthlyByMonth[m]?.[item.category] ?? def;
            qB += mData.budget;
            qT += mData.target;
          });
          rawBudget = qB;
          rawTarget = qT;
          scaledActual = Math.round((item.actual / periodMonths) * 3);
        }
      } else {
        // Annual
        let annB = 0;
        let annT = 0;
        for (let m = 0; m < 12; m++) {
          const mData = monthlyByMonth[m]?.[item.category] ?? def;
          annB += mData.budget;
          annT += mData.target;
        }
        rawBudget = annB;
        rawTarget = annT;
        scaledActual = Math.round((item.actual / periodMonths) * 12);
      }

      return {
        category: item.category,
        type: item.type,
        rawBudget,
        rawTarget,
        scaledActual,
      };
    })
    .filter(
      (item) =>
        Math.abs(item.scaledActual) > 0 ||
        Math.abs(item.rawBudget) > 0 ||
        Math.abs(item.rawTarget) > 0,
    );
  }, [
    budgetItems,
    monthlyByMonth,
    planningHorizon,
    selectedMonth,
    selectedQuarter,
    periodMonths,
    getDefaultMonthlyValues,
  ]);

  const plannerTotals = useMemo(() => {
    return plannerBudgetItems.reduce(
      (acc, item) => ({
        budget: acc.budget + item.rawBudget,
        target: acc.target + item.rawTarget,
        actual: acc.actual + item.scaledActual,
      }),
      { budget: 0, target: 0, actual: 0 },
    );
  }, [plannerBudgetItems]);

  // Dynamic 13-Week Cash Flow model: recalculates weekly inflows, outflows, and ending cash based on manual Plan & Targets
  const effective13Weeks = useMemo<CashFlowWeekItem[]>(() => {
    const rawWeeks = data?.cashFlow13Week?.weeks || [];
    const startingCash = data?.cashFlow13Week?.startingCash || 0;

    if (!hasCustomizedPlan) {
      return rawWeeks.map((w, idx) => ({
        weekNum: w.weekNum ?? idx + 1,
        weekLabel: w.weekLabel || w.week || `Week ${w.weekNum ?? idx + 1}`,
        cashIn: w.cashIn ?? w.inflow ?? 0,
        cashOut: w.cashOut ?? w.outflow ?? 0,
        netCash: w.netCash !== undefined ? w.netCash : (w.cashIn ?? 0) - (w.cashOut ?? 0),
        endingCash: w.endingCash ?? w.closingCash ?? 0,
        status: w.status,
      }));
    }

    // 13 weeks spans 3 months starting from currentMonthIdx
    // Month 1 (weeks 1..4): m1 = currentMonthIdx
    // Month 2 (weeks 5..8): m2 = (currentMonthIdx + 1) % 12
    // Month 3 (weeks 9..13): m3 = (currentMonthIdx + 2) % 12
    const targetMonths = [
      { m: currentMonthIdx, weeks: [0, 1, 2, 3] },
      { m: (currentMonthIdx + 1) % 12, weeks: [4, 5, 6, 7] },
      { m: (currentMonthIdx + 2) % 12, weeks: [8, 9, 10, 11, 12] },
    ];

    // Calculate planned monthly totals for Inflow (Revenue Target or Budget) and Outflow (Expense Budget)
    const monthFlows = targetMonths.map(({ m }) => {
      let rev = 0;
      let exp = 0;
      budgetItems.forEach((item) => {
        const def = getDefaultMonthlyValues(item);
        const mData = monthlyByMonth[m]?.[item.category] ?? def;
        if (item.type === 'revenue') {
          // Revenue Target (or fallback to budget)
          rev += mData.target || mData.budget;
        } else {
          // Expense Budget (approved spending limit)
          exp += mData.budget || mData.target;
        }
      });
      return {
        m,
        rev: Math.round(rev * activeScenarioConfig.revMultiplier),
        exp: Math.round(exp * activeScenarioConfig.costMultiplier),
      };
    });

    const resultWeeks: CashFlowWeekItem[] = [];
    let runningCash = startingCash;

    targetMonths.forEach(({ weeks: wIndices }, mOrder) => {
      const plannedRev = monthFlows[mOrder].rev;
      const plannedExp = monthFlows[mOrder].exp;
      const numWeeksInMonth = wIndices.length;

      // Check if Xero has existing raw week weights for this month's window
      const rawInTotal = wIndices.reduce(
        (sum, i) => sum + (rawWeeks[i]?.cashIn ?? rawWeeks[i]?.inflow ?? 0),
        0,
      );
      const rawOutTotal = wIndices.reduce(
        (sum, i) => sum + (rawWeeks[i]?.cashOut ?? rawWeeks[i]?.outflow ?? 0),
        0,
      );

      wIndices.forEach((i) => {
        const rawW = rawWeeks[i];
        const rawIn = rawW?.cashIn ?? rawW?.inflow ?? 0;
        const rawOut = rawW?.cashOut ?? rawW?.outflow ?? 0;

        const inWeight = rawInTotal > 0 ? rawIn / rawInTotal : 1 / numWeeksInMonth;
        const outWeight = rawOutTotal > 0 ? rawOut / rawOutTotal : 1 / numWeeksInMonth;

        const cashIn = Math.round(plannedRev * inWeight);
        const cashOut = Math.round(plannedExp * outWeight);
        const netCash = cashIn - cashOut;
        runningCash += netCash;

        const weekNum = i + 1;
        const weekLabel = rawW?.weekLabel || rawW?.week || `W${weekNum}`;

        const status =
          runningCash > 100000 ? 'Healthy' : runningCash > 30000 ? 'Monitor' : 'Critical';

        resultWeeks.push({
          weekNum,
          weekLabel,
          cashIn,
          cashOut,
          netCash,
          endingCash: runningCash,
          status,
        });
      });
    });

    return resultWeeks;
  }, [
    data?.cashFlow13Week,
    hasCustomizedPlan,
    budgetItems,
    monthlyByMonth,
    currentMonthIdx,
    activeScenarioConfig,
    getDefaultMonthlyValues,
  ]);

  // Dynamic Balance Sheet & Working Capital: recalculates Assets, Liabilities, Equity, Working Capital, and Solvency Ratios based on manual Plan & Targets
  const effectiveBalanceSheet = useMemo(() => {
    const baseBs = data?.balanceSheet;
    if (!baseBs) return null;

    if (!hasCustomizedPlan) {
      return {
        ...baseBs,
        currentRatio:
          data?.kpiScorecard?.currentRatio ??
          (baseBs.liabilities.totalCurrent > 0
            ? baseBs.assets.totalCurrent / baseBs.liabilities.totalCurrent
            : 2.5),
        quickRatio: data?.kpiScorecard?.quickRatio ?? 2.1,
        debtToEquity:
          data?.kpiScorecard?.debtToEquity ??
          (baseBs.equity.totalEquity > 0
            ? baseBs.liabilities.totalLiabilities / baseBs.equity.totalEquity
            : 0.45),
      };
    }

    // 1. Calculate plan revenue & expense vs actual baseline from effectiveBudgetItems
    const revItems = effectiveBudgetItems.filter((i) => i.type === 'revenue');
    const expItems = effectiveBudgetItems.filter((i) => i.type === 'expense');

    const planRev = revItems.reduce((sum, i) => sum + (i.target || i.budget || 0), 0);
    const actRev = revItems.reduce((sum, i) => sum + (i.actual || 0), 0);
    const revMultiplier = actRev > 0 ? planRev / actRev : 1.0;

    const planExp = expItems.reduce((sum, i) => sum + (i.budget || i.target || 0), 0);
    const actExp = expItems.reduce((sum, i) => sum + (i.actual || 0), 0);
    const expMultiplier = actExp > 0 ? planExp / actExp : 1.0;

    // 2. Liquid Cash from 13-Week Cash Flow Schedule (which is already live-synchronized with the manual plan!)
    const startingCash = data?.cashFlow13Week?.startingCash || 25400;
    const planEndingCash =
      effective13Weeks.length > 0
        ? (effective13Weeks[effective13Weeks.length - 1].endingCash ?? startingCash)
        : startingCash;

    // 3. Pro-forma Current Assets
    const baseAR =
      baseBs.assets.current.find((a) => /receivable|debtor/i.test(a.name))?.value ||
      Math.round((actRev || actualRevenue || 29450) * 0.28);
    const planAR = Math.round(baseAR * revMultiplier);

    const baseInv =
      baseBs.assets.current.find((a) => /inventory|stock/i.test(a.name))?.value || 3500;
    const planInv = Math.round(baseInv * expMultiplier);

    const basePrepay =
      baseBs.assets.current.find((a) => /prepayment|deposit/i.test(a.name))?.value || 1000;
    const planPrepay = Math.round(basePrepay * ((revMultiplier + expMultiplier) / 2));

    const currentAssetsList: BalanceSheetItem[] = [
      { name: 'Cash and Cash Equivalents (Forecast)', value: Math.round(planEndingCash) },
      { name: 'Accounts Receivable (Trade Debtors)', value: planAR },
      { name: 'Inventory & Stock on Hand', value: planInv },
      { name: 'Prepayments & Short-term Deposits', value: planPrepay },
    ];
    const totalCurrentAssets = currentAssetsList.reduce((s, a) => s + a.value, 0);
    const totalNonCurrentAssets = baseBs.assets.totalNonCurrent || 0;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // 4. Pro-forma Current Liabilities
    const baseAP =
      baseBs.liabilities.current.find((l) => /payable|creditor/i.test(l.name))?.value || 6200;
    const planAP = Math.round(baseAP * expMultiplier);

    const baseAccruals =
      baseBs.liabilities.current.find((l) => /accrued|payroll/i.test(l.name))?.value || 1350;
    const planAccruals = Math.round(baseAccruals * expMultiplier);

    const baseTax =
      baseBs.liabilities.current.find((l) => /tax|vat/i.test(l.name))?.value || 900;
    const netProfitDelta = (planRev - planExp) - (actRev - actExp);
    const planTax = Math.max(500, Math.round(baseTax + Math.max(0, netProfitDelta * 0.19)));

    const currentLiabilitiesList: BalanceSheetItem[] = [
      { name: 'Accounts Payable (Trade Creditors)', value: planAP },
      { name: 'Accrued Operating Overheads & Payroll', value: planAccruals },
      { name: 'VAT & Corporate Tax Liability', value: planTax },
    ];
    const totalCurrentLiabilities = currentLiabilitiesList.reduce((s, l) => s + l.value, 0);
    const totalNonCurrentLiabilities = baseBs.liabilities.totalNonCurrent || 0;
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    // 5. Shareholders' Equity strictly balanced: Assets = Liabilities + Equity
    const totalEquity = totalAssets - totalLiabilities;
    const shareCapitalItem = baseBs.equity.items.find((e) => /share|capital/i.test(e.name));
    const shareCapitalVal = shareCapitalItem?.value || Math.round(totalEquity * 0.35);
    const retainedEarningsVal = totalEquity - shareCapitalVal;

    const equityList: BalanceSheetItem[] = [
      { name: 'Share Capital (Paid-in Capital)', value: shareCapitalVal },
      { name: 'Retained Earnings & Plan Surplus', value: retainedEarningsVal },
    ];

    // 6. Working Capital & Solvency Ratios
    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
    const currentRatio =
      totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 2.5;
    const quickRatio =
      totalCurrentLiabilities > 0 ? (planEndingCash + planAR) / totalCurrentLiabilities : 1.8;
    const debtToEquity =
      totalEquity > 0 ? totalLiabilities / totalEquity : 0.45;

    return {
      assets: {
        current: currentAssetsList,
        nonCurrent: baseBs.assets.nonCurrent,
        totalCurrent: totalCurrentAssets,
        totalNonCurrent: totalNonCurrentAssets,
        totalAssets,
      },
      liabilities: {
        current: currentLiabilitiesList,
        nonCurrent: baseBs.liabilities.nonCurrent,
        totalCurrent: totalCurrentLiabilities,
        totalNonCurrent: totalNonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        items: equityList,
        totalEquity,
      },
      workingCapital,
      isBalanced: true,
      currentRatio,
      quickRatio,
      debtToEquity,
    };
  }, [
    data?.balanceSheet,
    data?.cashFlow13Week,
    data?.kpiScorecard,
    hasCustomizedPlan,
    effectiveBudgetItems,
    effective13Weeks,
    actualRevenue,
  ]);

  const updatePlan = (category: string, field: 'budget' | 'target', value: string) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setHasCustomizedPlan(true);

    const itemRef = budgetItems.find((i) => i.category === category);
    const def = itemRef ? getDefaultMonthlyValues(itemRef) : { budget: 0, target: 0 };

    setMonthlyByMonth((prev) => {
      const next: Record<number, Record<string, { budget: number; target: number }>> = {};
      for (let m = 0; m < 12; m++) {
        next[m] = { ...(prev[m] ?? {}) };
      }

      if (planningHorizon === 'monthly') {
        const cur = next[selectedMonth]?.[category] ?? { ...def };
        next[selectedMonth] = {
          ...next[selectedMonth],
          [category]: {
            ...cur,
            [field]: numericValue,
          },
        };
      } else if (planningHorizon === 'quarterly') {
        if (selectedQuarter === 'all') {
          const perMonth = Math.round(numericValue / 3);
          for (let m = 0; m < 12; m++) {
            const cur = next[m]?.[category] ?? { ...def };
            next[m] = {
              ...next[m],
              [category]: {
                ...cur,
                [field]: perMonth,
              },
            };
          }
        } else {
          const qDef = QUARTERS.find((q) => q.key === selectedQuarter)!;
          const perMonth = Math.round(numericValue / 3);
          qDef.months.forEach((m) => {
            const cur = next[m]?.[category] ?? { ...def };
            next[m] = {
              ...next[m],
              [category]: {
                ...cur,
                [field]: perMonth,
              },
            };
          });
        }
      } else {
        // Annual
        const perMonth = Math.round(numericValue / 12);
        for (let m = 0; m < 12; m++) {
          const cur = next[m]?.[category] ?? { ...def };
          next[m] = {
            ...next[m],
            [category]: {
              ...cur,
              [field]: perMonth,
            },
          };
        }
      }

      return next;
    });
  };

  const copyMonthToAll = () => {
    setMonthlyByMonth((prev) => {
      const sourceMonthData = prev[selectedMonth] ?? {};
      const next: Record<number, Record<string, { budget: number; target: number }>> = {};
      for (let m = 0; m < 12; m++) {
        const mData: Record<string, { budget: number; target: number }> = {};
        budgetItems.forEach((item) => {
          const base = sourceMonthData[item.category] ?? getDefaultMonthlyValues(item);
          mData[item.category] = { ...base };
        });
        next[m] = mData;
      }
      return next;
    });
    setHasCustomizedPlan(true);
    toast.success(`Copied ${MONTH_NAMES[selectedMonth]} figures to all 12 months!`);
  };

  const saveBudgetPlan = async () => {
    try {
      setIsSaving(true);
      const fullMonthly: Record<number, Record<string, { budget: number; target: number }>> = {};
      for (let m = 0; m < 12; m++) {
        fullMonthly[m] = { ...(monthlyByMonth[m] ?? {}) };
      }

      budgetItems.forEach((item) => {
        const def = getDefaultMonthlyValues(item);
        for (let m = 0; m < 12; m++) {
          if (!fullMonthly[m][item.category]) {
            fullMonthly[m][item.category] = { ...def };
          }
        }
      });

      const quartersPlan: Record<QuarterKey, Record<string, { budget: number; target: number }>> = {
        Q1: {},
        Q2: {},
        Q3: {},
        Q4: {},
      };
      const annualPlan: Record<string, { budget: number; target: number }> = {};
      const monthlyPlan: Record<string, { budget: number; target: number }> = {};
      const quarterlyPlan: Record<string, { budget: number; target: number }> = {};

      budgetItems.forEach((item) => {
        let annB = 0;
        let annT = 0;

        QUARTERS.forEach((q) => {
          let qB = 0;
          let qT = 0;
          q.months.forEach((m) => {
            qB += fullMonthly[m][item.category].budget;
            qT += fullMonthly[m][item.category].target;
          });
          quartersPlan[q.key][item.category] = { budget: qB, target: qT };
          annB += qB;
          annT += qT;
        });

        annualPlan[item.category] = { budget: annB, target: annT };
        monthlyPlan[item.category] = {
          budget: Math.round(annB / 12),
          target: Math.round(annT / 12),
        };
        quarterlyPlan[item.category] = {
          budget: Math.round(annB / 4),
          target: Math.round(annT / 4),
        };
      });

      const completeStorage = {
        monthlyByMonth: fullMonthly,
        quarters: quartersPlan,
        annual: annualPlan,
        monthly: monthlyPlan,
        quarterly: quarterlyPlan,
      };

      setMonthlyByMonth(fullMonthly);
      setBudgetPlans({
        monthly: monthlyPlan,
        quarterly: quarterlyPlan,
        annual: annualPlan,
      });
      setHasCustomizedPlan(true);

      // 1. Save directly to Database with fiscal year
      let savedToDb = false;
      try {
        const response = await fetch('/api/dashboard/budget-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: budgetYear, plan: completeStorage }),
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData?.success) {
            savedToDb = true;
            setDbSavedAt(resData.updatedAt || new Date().toISOString());
          }
        }
      } catch (dbErr) {
        console.error('Failed to save budget plan to database:', dbErr);
      }

      // 2. Keep localStorage as offline backup for this specific year
      try {
        window.localStorage.setItem(
          `virtual-cfo-budget-plans-${budgetYear}`,
          JSON.stringify(completeStorage),
        );
      } catch {
        // ignore
      }

      if (savedToDb) {
        toast.success(
          `FY ${budgetYear} budget plan saved to database! All 12 months, Q1–Q4 quarterly totals, and Annual sum synchronized.`,
        );
      } else {
        toast.success(`FY ${budgetYear} budget saved locally. (Database sync pending)`);
      }
    } catch {
      toast.error('Unable to save the budget plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetBudgetPlan = async () => {
    // Delete from Database for this year
    try {
      await fetch(`/api/dashboard/budget-plans?year=${budgetYear}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to reset plan in database:', err);
    }

    try {
      window.localStorage.removeItem(`virtual-cfo-budget-plans-${budgetYear}`);
    } catch {
      // ignore storage error
    }
    setDbSavedAt(null);
    setHasCustomizedPlan(false);
    setMonthlyByMonth({});
    const resetPlans: Record<string, Record<string, { budget: number; target: number }>> = {};
    (['monthly', 'quarterly', 'annual'] as const).forEach((horizon) => {
      const horizonMonths = horizon === 'monthly' ? 1 : horizon === 'quarterly' ? 3 : 12;
      const horizonPlan: Record<string, { budget: number; target: number }> = {};
      budgetItems.forEach((item) => {
        const annualBase = (item.budget / periodMonths) * 12;
        const b = Math.round((annualBase / 12) * horizonMonths);
        horizonPlan[item.category] = {
          budget: b,
          target: Math.round(b * (item.type === 'revenue' ? 1.05 : 0.95)),
        };
      });
      resetPlans[horizon] = horizonPlan;
    });
    setBudgetPlans(resetPlans);
    toast.success(`FY ${budgetYear} budget plan reset to default benchmarks.`);
  };

  const watchlist = useMemo(
    () =>
      effectiveBudgetItems
        .map((item) => ({
          ...item,
          variance: item.actual - item.budget,
          unfavorable:
            item.type === 'revenue' ? item.actual < item.budget : item.actual > item.budget,
        }))
        .filter((item) => item.unfavorable)
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
        .slice(0, 3),
    [effectiveBudgetItems],
  );

  useEffect(() => {
    if (statementView !== 'pnl' || !profitability) return;

    let revenueChart: echarts.ECharts | null = null;
    let budgetChart: echarts.ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      // 1. Revenue trend chart
      if (revenueChartRef.current) {
        revenueChart =
          echarts.getInstanceByDom(revenueChartRef.current) ||
          echarts.init(revenueChartRef.current);

        const rawTrend = profitability.monthlyTrend ?? [];
        const monthlyTrend =
          rawTrend.length > 0
            ? rawTrend
            : [
                { month: 'Jan', revenue: Math.round(actualRevenue * 0.07) },
                { month: 'Feb', revenue: Math.round(actualRevenue * 0.08) },
                { month: 'Mar', revenue: Math.round(actualRevenue * 0.085) },
                { month: 'Apr', revenue: Math.round(actualRevenue * 0.08) },
                { month: 'May', revenue: Math.round(actualRevenue * 0.085) },
                { month: 'Jun', revenue: Math.round(actualRevenue * 0.09) },
                { month: 'Jul', revenue: Math.round(actualRevenue * 0.085) },
                { month: 'Aug', revenue: Math.round(actualRevenue * 0.09) },
                { month: 'Sep', revenue: Math.round(actualRevenue * 0.08) },
                { month: 'Oct', revenue: Math.round(actualRevenue * 0.085) },
                { month: 'Nov', revenue: Math.round(actualRevenue * 0.08) },
                { month: 'Dec', revenue: Math.round(actualRevenue * 0.09) },
              ];

        revenueChart.setOption(
          {
            grid: { left: 12, right: 18, top: 24, bottom: 12, containLabel: true },
            tooltip: {
              trigger: 'axis',
              valueFormatter: (value: number) => formatMoney.format(value),
            },
            xAxis: {
              type: 'category',
              data: monthlyTrend.map((item) => item.month),
              axisLine: { lineStyle: { color: '#e2e8f0' } },
              axisLabel: { color: '#64748b', fontSize: 10 },
            },
            yAxis: {
              type: 'value',
              axisLabel: {
                color: '#64748b',
                fontSize: 10,
                formatter: (value: number) => formatMoney.format(value),
              },
              splitLine: { lineStyle: { color: '#f1f5f9' } },
            },
            series: [
              {
                name: 'Revenue',
                type: 'line',
                smooth: true,
                data: monthlyTrend.map((item) => item.revenue),
                symbolSize: 6,
                lineStyle: { width: 3, color: '#0284c7' },
                itemStyle: { color: '#0284c7' },
                areaStyle: { color: 'rgba(2, 132, 199, 0.08)' },
              },
            ],
          },
          { notMerge: true },
        );
        revenueChart.resize();
      }

      // 2. Budget vs actual chart
      if (budgetChartRef.current && effectiveBudgetItems.length > 0) {
        budgetChart =
          echarts.getInstanceByDom(budgetChartRef.current) || echarts.init(budgetChartRef.current);

        budgetChart.setOption(
          {
            grid: { left: 12, right: 18, top: 16, bottom: 12, containLabel: true },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              confine: true,
              valueFormatter: (value: number) => formatMoney.format(value),
            },
            legend: {
              data: ['Budget', 'Actual'],
              top: 0,
              textStyle: { color: '#64748b', fontSize: 10 },
            },
            xAxis: {
              type: 'value',
              axisLabel: {
                color: '#64748b',
                fontSize: 10,
                formatter: (value: number) => formatMoney.format(value),
              },
              splitLine: { lineStyle: { color: '#f1f5f9' } },
            },
            yAxis: {
              type: 'category',
              data: effectiveBudgetItems.map((item) => item.category),
              axisLabel: { color: '#475569', fontSize: 10, width: 135, overflow: 'truncate' },
              axisLine: { show: false },
            },
            series: [
              {
                name: 'Budget',
                type: 'bar',
                data: effectiveBudgetItems.map((item) => item.budget),
                itemStyle: { color: '#cbd5e1', borderRadius: [0, 4, 4, 0] },
                barMaxWidth: 12,
              },
              {
                name: 'Actual',
                type: 'bar',
                data: effectiveBudgetItems.map((item) => item.actual),
                itemStyle: { color: '#0284c7', borderRadius: [0, 4, 4, 0] },
                barMaxWidth: 12,
              },
            ],
          },
          { notMerge: true },
        );
        budgetChart.resize();
      }

      // Auto-resize on container size changes
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          revenueChart?.resize();
          budgetChart?.resize();
        });
        if (revenueChartRef.current) resizeObserver.observe(revenueChartRef.current);
        if (budgetChartRef.current) resizeObserver.observe(budgetChartRef.current);
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
    };
  }, [statementView, effectiveBudgetItems, formatMoney, profitability, actualRevenue]);

  useEffect(() => {
    const handleResize = () => {
      if (revenueChartRef.current) {
        echarts.getInstanceByDom(revenueChartRef.current)?.resize();
      }
      if (budgetChartRef.current) {
        echarts.getInstanceByDom(budgetChartRef.current)?.resize();
      }
      if (cashFlowChartRef.current) {
        echarts.getInstanceByDom(cashFlowChartRef.current)?.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 13-Week Cash Flow Trajectory Chart
  useEffect(() => {
    if (statementView !== 'cashflow' || effective13Weeks.length === 0) return;

    let chart: echarts.ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      if (!cashFlowChartRef.current) return;
      chart =
        echarts.getInstanceByDom(cashFlowChartRef.current) ||
        echarts.init(cashFlowChartRef.current);

      chart.setOption(
        {
          grid: { left: 16, right: 18, top: 32, bottom: 20, containLabel: true },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            valueFormatter: (value: number) => formatMoney.format(value),
          },
          legend: {
            data: ['Cash Inflow', 'Cash Outflow', 'Ending Cash Balance'],
            top: 0,
            textStyle: { color: '#64748b', fontSize: 10 },
          },
          xAxis: {
            type: 'category',
            data: effective13Weeks.map((w) => w.weekLabel || `W${w.weekNum}`),
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisLabel: { color: '#64748b', fontSize: 10 },
          },
          yAxis: [
            {
              type: 'value',
              name: 'Weekly Flows',
              nameTextStyle: { color: '#94a3b8', fontSize: 10 },
              axisLabel: {
                color: '#64748b',
                fontSize: 10,
                formatter: (v: number) => formatMoney.format(v),
              },
              splitLine: { lineStyle: { color: '#f1f5f9' } },
            },
            {
              type: 'value',
              name: 'Cash Balance',
              nameTextStyle: { color: '#94a3b8', fontSize: 10 },
              axisLabel: {
                color: '#64748b',
                fontSize: 10,
                formatter: (v: number) => formatMoney.format(v),
              },
              splitLine: { show: false },
            },
          ],
          series: [
            {
              name: 'Cash Inflow',
              type: 'bar',
              barMaxWidth: 14,
              data: effective13Weeks.map((w) => w.cashIn),
              itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
            },
            {
              name: 'Cash Outflow',
              type: 'bar',
              barMaxWidth: 14,
              data: effective13Weeks.map((w) => w.cashOut),
              itemStyle: { color: '#f43f5e', borderRadius: [3, 3, 0, 0] },
            },
            {
              name: 'Ending Cash Balance',
              type: 'line',
              yAxisIndex: 1,
              smooth: true,
              data: effective13Weeks.map((w) => w.endingCash),
              symbolSize: 6,
              lineStyle: { width: 2.5, color: '#0284c7' },
              itemStyle: { color: '#0284c7' },
              areaStyle: { color: 'rgba(2, 132, 199, 0.08)' },
            },
          ],
        },
        { notMerge: true },
      );
      chart.resize();

      if (typeof ResizeObserver !== 'undefined' && cashFlowChartRef.current) {
        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
        });
        resizeObserver.observe(cashFlowChartRef.current);
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
    };
  }, [statementView, effective13Weeks, formatMoney]);

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    setPeriod(newPeriod);
    const horizon: 'monthly' | 'quarterly' | 'annual' =
      newPeriod === 'this_month' ? 'monthly' : newPeriod === 'quarter' ? 'quarterly' : 'annual';
    setPlanningHorizon(horizon);
  };

  const refreshData = async () => {
    setIsLoading(true);
    setIsSyncing(true);
    setError(null);
    try {
      if (data?.connected) {
        // Trigger live background sync with Xero first to ensure fresh data in database cache
        const syncRes = await fetch('/api/xero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch((err) => {
          console.warn('Xero sync ping returned:', err);
          return null;
        });
        if (syncRes && syncRes.ok) {
          toast.success('Live financial data synced from Xero.');
        }
      }
    } catch (syncErr) {
      console.warn('Sync failed, falling back to local refresh:', syncErr);
    } finally {
      setIsSyncing(false);
      setData(null);
      setRefreshCount((count) => count + 1);
    }
  };

  const exportReport = async (format: 'xlsx' | 'pdf') => {
    if (!data || !profitability) {
      toast.error('Load financial data before exporting the report.');
      return;
    }

    const fromDate = data.periodInfo?.startDate;
    const toDate = data.periodInfo?.endDate;
    if (!fromDate || !toDate) {
      toast.error('The report date range is unavailable. Refresh the dashboard and try again.');
      return;
    }

    setExporting(format);
    try {
      const report = await import('@/lib/exports/budgeting-report');
      const reportPayload = {
        ...data,
        scenario,
        scenarioLabel: activeScenarioConfig.tagline,
        scenarioMultipliers: {
          revenue: activeScenarioConfig.revMultiplier,
          cost: activeScenarioConfig.costMultiplier,
        },
        budgeting: {
          ...data.budgeting,
          budgetItems: effectiveBudgetItems.map(({ category, actual, budget, type }) => ({
            category,
            actual,
            budget,
            type,
          })),
        },
        balanceSheet: effectiveBalanceSheet || data.balanceSheet,
      };

      if (format === 'xlsx') {
        await report.exportBudgetingExcelReport(reportPayload, fromDate, toDate, forecastRevenue);
      } else {
        await report.exportBudgetingPdfReport(reportPayload, fromDate, toDate, forecastRevenue);
      }
      toast.success(
        `Budget and variance ${format.toUpperCase()} (${activeScenarioConfig.label}) downloaded.`,
      );
    } catch (exportError) {
      console.error(`Failed to export budget report as ${format}:`, exportError);
      toast.error(`Unable to export the ${format.toUpperCase()} report. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="w-full space-y-4 p-0">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Budget &amp; variance
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                data?.connected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  data?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400',
                )}
              />
              {data?.connected ? 'Xero connected' : 'Xero financial overview'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A clear view of performance, cash and the outlook for the financial year.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {profitability && !isLoading && (
            <>
              <button
                type="button"
                onClick={() => void exportReport('xlsx')}
                disabled={exporting !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                {exporting === 'xlsx' ? 'Exporting…' : 'Export XLSX'}
              </button>
              <button
                type="button"
                onClick={() => void exportReport('pdf')}
                disabled={exporting !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-rose-700" />
                {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={isLoading || isSyncing || exporting !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 text-sky-700', (isLoading || isSyncing) && 'animate-spin')}
            />
            {isSyncing ? 'Syncing Xero…' : isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-sky-700" />
          Loading financial data from Xero…
        </div>
      )}

      {data && !data.connected && !isLoading && (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-6 text-center">
          <Wallet className="mx-auto h-7 w-7 text-amber-700" />
          <h2 className="mt-3 font-semibold text-slate-900">Connect Xero to view your finances</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect your Xero organization to load revenue, costs and cash position.
          </p>
          <a
            href="/data-sources"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go to data sources <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      )}

      {data?.connected && profitability && !isLoading && (
        <>
          {/* Control Bar: Budgeting & Period Controls */}
          <section
            aria-label="Dashboard controls"
            className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600">Period:</span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
                  {periods.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handlePeriodChange(option.code)}
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

              {/* Dedicated Forecast Link Button */}
              <div className="flex items-center gap-2">
                <Link
                  href="/forecast"
                  className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors shadow-2xs"
                  title="Open forward 12-month predictive modeling and sensitivity stress tests"
                >
                  <LineChart className="h-3.5 w-3.5 text-sky-600" />
                  <span>Forecast &amp; Scenarios Cockpit &rarr;</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Statement View Selector (3-Statement Financial Model) */}
          <section
            aria-label="Financial statement selector"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Statement:
              </span>
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
                <button
                  type="button"
                  onClick={() => setStatementView('pnl')}
                  aria-pressed={statementView === 'pnl'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600',
                    statementView === 'pnl'
                      ? 'bg-sky-600 font-semibold text-white shadow-sm ring-1 ring-sky-700/20'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )}
                >
                  <SlidersHorizontal
                    className={cn(
                      'h-3.5 w-3.5 transition-colors',
                      statementView === 'pnl' ? 'text-white' : 'text-sky-600',
                    )}
                  />
                  <span>Profit &amp; Loss (P&amp;L)</span>
                  {statementView === 'pnl' && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStatementView('cashflow')}
                  aria-pressed={statementView === 'cashflow'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                    statementView === 'cashflow'
                      ? 'bg-emerald-600 font-semibold text-white shadow-sm ring-1 ring-emerald-700/20'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )}
                >
                  <Wallet
                    className={cn(
                      'h-3.5 w-3.5 transition-colors',
                      statementView === 'cashflow' ? 'text-white' : 'text-emerald-600',
                    )}
                  />
                  <span>Budgeted Cashflow</span>
                  {statementView === 'cashflow' && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-slate-600">Budgeted Financial Statements</span>
              <span className="hidden sm:inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                {statementView === 'pnl' ? 'P&L Active' : 'Cashflow Active'}
              </span>
            </div>
          </section>

          {statementView === 'pnl' && (
            <>
              {/* Plan & Targets */}
              <section className="rounded-md border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold text-slate-900">Plan &amp; targets (FY {budgetYear})</h2>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[9px] font-semibold border inline-flex items-center gap-1',
                          hasCustomizedPlan
                            ? 'border-sky-200 bg-sky-50 text-sky-800'
                            : 'border-slate-200 bg-slate-100 text-slate-600',
                        )}
                      >
                        {hasCustomizedPlan ? (
                          <>
                            <Database className="h-2.5 w-2.5 text-sky-600" />
                            <span>Custom Plan Active (FY {budgetYear}) {dbSavedAt ? '(DB Synced)' : ''}</span>
                          </>
                        ) : (
                          `Default Benchmarks (FY ${budgetYear})`
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Enter baseline plan budget and target values. Changes update variance
                      immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!plannerOpen) {
                        setPlanningHorizon('monthly');
                      }
                      setPlannerOpen((open) => !open);
                    }}
                    aria-expanded={plannerOpen}
                    className="h-8 rounded-md border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
                  >
                    {plannerOpen ? 'Close planner' : 'Edit budget & targets'}
                  </button>
                </div>
                {plannerOpen && (
                  <div className="border-t border-slate-200">
                    {/* Financial Year Selector Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Financial Year:
                        </span>
                        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs">
                          {availableYears.map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => setBudgetYear(yr)}
                              className={cn(
                                'rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer',
                                budgetYear === yr
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100',
                              )}
                            >
                              FY {yr} {yr === currentSystemYear ? '(Active)' : yr < currentSystemYear ? '(Past)' : '(Draft)'}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={addNewPlanningYear}
                            className="rounded px-2 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                            title="Add next financial year"
                          >
                            + Add Year
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {budgetYear > 2025 && (
                          <button
                            type="button"
                            onClick={copyPreviousYearBudget}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                            title={`Copy baseline targets from FY ${budgetYear - 1} into FY ${budgetYear}`}
                          >
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy FY {budgetYear - 1} Baseline</span>
                          </button>
                        )}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                          Editing FY {budgetYear}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex rounded-md border border-slate-200 bg-white p-1">
                          {(['monthly', 'quarterly', 'annual'] as const).map((horizon) => (
                            <button
                              key={horizon}
                              type="button"
                              onClick={() => setPlanningHorizon(horizon)}
                              aria-pressed={planningHorizon === horizon}
                              className={cn(
                                'rounded px-3 py-1.5 text-[10px] font-semibold capitalize transition-colors',
                                planningHorizon === horizon
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-50',
                              )}
                            >
                              {horizon}
                            </button>
                          ))}
                        </div>
                        <span className="hidden sm:inline-block rounded-md border border-slate-200/80 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
                          {planningHorizon === 'monthly'
                            ? `✍️ Editing ${MONTH_NAMES[selectedMonth]} ${budgetYear} manually (Month ${selectedMonth + 1} of 12)`
                            : planningHorizon === 'quarterly'
                              ? selectedQuarter === 'all'
                                ? `📊 Viewing Quarterly Average · FY ${budgetYear} (Annual ÷ 4)`
                                : `📊 Viewing ${selectedQuarter} ${budgetYear} Sum (${QUARTERS.find(
                                    (q) => q.key === selectedQuarter,
                                  )
                                    ?.months.map((m) => MONTH_SHORT[m])
                                    .join(' + ')})`
                              : `🎯 Viewing FY ${budgetYear} Annual Total (Sum of all 12 months)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dbSavedAt && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Database className="h-3 w-3 text-emerald-600" />
                            Database Synced
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={resetBudgetPlan}
                          disabled={isSaving}
                          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Reset to default
                        </button>
                        <button
                          type="button"
                          onClick={saveBudgetPlan}
                          disabled={isSaving}
                          className="h-8 rounded-md bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                          <span>{isSaving ? 'Saving to Database...' : 'Save plan'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Secondary Navigation Bar: 12 Months / 4 Quarters / Annual Summary */}
                    {planningHorizon === 'monthly' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                            Month:
                          </span>
                          {MONTH_SHORT.map((short, idx) => (
                            <button
                              key={short}
                              type="button"
                              onClick={() => setSelectedMonth(idx)}
                              className={cn(
                                'rounded px-2.5 py-1 text-[11px] font-semibold transition-all',
                                selectedMonth === idx
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100',
                              )}
                            >
                              {short}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={copyMonthToAll}
                          title={`Copy ${MONTH_NAMES[selectedMonth]} figures to all other 11 months`}
                          className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          Copy {MONTH_SHORT[selectedMonth]} to all months
                        </button>
                      </div>
                    )}

                    {planningHorizon === 'quarterly' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                            Quarter:
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedQuarter('all')}
                            className={cn(
                              'rounded px-2.5 py-1 text-[11px] font-semibold transition-all',
                              selectedQuarter === 'all'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100',
                            )}
                          >
                            All Quarters (Avg)
                          </button>
                          {QUARTERS.map((q) => (
                            <button
                              key={q.key}
                              type="button"
                              onClick={() => setSelectedQuarter(q.key)}
                              className={cn(
                                'rounded px-2.5 py-1 text-[11px] font-semibold transition-all',
                                selectedQuarter === q.key
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100',
                              )}
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                          {selectedQuarter === 'all'
                            ? 'Average per quarter (Annual ÷ 4)'
                            : `Sum of ${QUARTERS.find((q) => q.key === selectedQuarter)
                                ?.months.map((m) => MONTH_SHORT[m])
                                .join(' + ')}`}
                        </span>
                      </div>
                    )}

                    {planningHorizon === 'annual' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Financial Year:
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800">
                            All 12 Months (January to December)
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                          🎯 Annual totals are computed directly from the 12 individual monthly
                          budgets
                        </span>
                      </div>
                    )}

                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full min-w-[620px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] text-slate-600">
                          <tr>
                            <th className="px-3 py-2.5">Line item</th>
                            <th className="px-3 py-2.5 text-right capitalize">
                              {planningHorizon === 'monthly'
                                ? `Budget (${MONTH_NAMES[selectedMonth]} ${budgetYear})`
                                : planningHorizon === 'quarterly'
                                  ? selectedQuarter === 'all'
                                    ? `Budget (Quarterly Avg · FY ${budgetYear})`
                                    : `Budget (${selectedQuarter} ${budgetYear})`
                                  : `Budget (FY ${budgetYear}: 12-Mo Sum)`}
                            </th>
                            <th className="px-3 py-2.5 text-right capitalize">
                              {planningHorizon === 'monthly'
                                ? `Target (${MONTH_NAMES[selectedMonth]} ${budgetYear})`
                                : planningHorizon === 'quarterly'
                                  ? selectedQuarter === 'all'
                                    ? `Target (Quarterly Avg · FY ${budgetYear})`
                                    : `Target (${selectedQuarter} ${budgetYear})`
                                  : `Target (FY ${budgetYear}: 12-Mo Sum)`}
                            </th>
                            <th className="px-3 py-2.5 text-right capitalize">
                              {planningHorizon === 'monthly'
                                ? `Actual (${MONTH_SHORT[selectedMonth]} Run-Rate)`
                                : planningHorizon === 'quarterly'
                                  ? 'Actual (Quarterly Run-Rate)'
                                  : 'Actual (Annual Run-Rate)'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {plannerBudgetItems.map((item) => (
                            <tr key={item.category}>
                              <th className="px-3 py-2 font-medium text-slate-900">
                                {item.category}
                              </th>
                              <td className="px-3 py-2 text-right">
                                <input
                                  aria-label={`Budget for ${item.category}`}
                                  type="number"
                                  min="0"
                                  value={item.rawBudget}
                                  onChange={(event) =>
                                    updatePlan(item.category, 'budget', event.target.value)
                                  }
                                  className="h-8 w-28 rounded-md border border-slate-200 px-2 text-right tabular-nums focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  aria-label={`Target for ${item.category}`}
                                  type="number"
                                  min="0"
                                  value={item.rawTarget}
                                  onChange={(event) =>
                                    updatePlan(item.category, 'target', event.target.value)
                                  }
                                  className="h-8 w-28 rounded-md border border-slate-200 px-2 text-right tabular-nums focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                                {formatMoney.format(item.scaledActual)}
                              </td>
                            </tr>
                          ))}
                          {plannerBudgetItems.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-6 text-center text-xs text-slate-500"
                              >
                                No budget lines are available for this period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {plannerBudgetItems.length > 0 && (
                          <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-900">
                            <tr>
                              <td className="px-3 py-2.5">
                                Total Projected (
                                {planningHorizon === 'monthly'
                                  ? `${MONTH_SHORT[selectedMonth]} ${budgetYear}`
                                  : planningHorizon === 'quarterly'
                                    ? selectedQuarter === 'all'
                                      ? `Quarterly Avg · FY ${budgetYear}`
                                      : `${selectedQuarter} ${budgetYear}`
                                    : `Full Year ${budgetYear}`}
                                )
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                                {formatMoney.format(plannerTotals.budget)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                                {formatMoney.format(plannerTotals.target)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                                {formatMoney.format(plannerTotals.actual)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {(() => {
                const actualRev = profitability.revenue;
                const rawOpex = profitability.opexFixed + profitability.opexVariable;
                const actualGrossProfit = profitability.grossProfit;
                const actualGrossMargin = profitability.grossMarginPct;
                const actualEbitda = profitability.ebitda;
                const actualEbitdaMargin = profitability.ebitdaMarginPct;
                const startingCash = data.cashFlow13Week?.startingCash ?? 0;

                const totalActual = effectiveBudgetItems.reduce((acc, i) => acc + i.actual, 0);
                const totalBudget = effectiveBudgetItems.reduce((acc, i) => acc + i.budget, 0);
                const totalNetVariance = totalActual - totalBudget;
                const revItem = effectiveBudgetItems.find((i) => i.type === 'revenue');
                const revVariance = revItem ? revItem.actual - revItem.budget : 0;
                const revVariancePct =
                  revItem && revItem.budget > 0 ? (revVariance / revItem.budget) * 100 : 0;

                return (
                  <section
                    aria-label="Financial overview"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
                  >
                    <MetricCard
                      title="Revenue"
                      value={formatMoney.format(actualRev)}
                      badge={
                        revVariance !== 0
                          ? `${revVariance >= 0 ? '+' : ''}${revVariancePct.toFixed(1)}% vs Budget`
                          : undefined
                      }
                      badgeType={revVariance >= 0 ? 'favorable' : 'unfavorable'}
                      detail={`Actual · ${data.periodInfo?.label ?? 'selected period'}`}
                      accent="border-l-emerald-600"
                    />
                    <MetricCard
                      title="Gross margin"
                      value={`${actualGrossMargin.toFixed(1)}%`}
                      badge={`${formatMoney.format(actualGrossProfit)} GP`}
                      badgeType="favorable"
                      detail={`${formatMoney.format(actualGrossProfit)} gross profit`}
                      accent="border-l-emerald-600"
                    />
                    <MetricCard
                      title="Operating expenses"
                      value={formatMoney.format(rawOpex)}
                      detail={`Operating costs · ${data.periodInfo?.label ?? 'selected period'}`}
                      accent="border-l-amber-600"
                    />
                    <MetricCard
                      title="EBITDA"
                      value={formatMoney.format(actualEbitda)}
                      badge={`${actualEbitdaMargin.toFixed(1)}% margin`}
                      badgeType={actualEbitda >= 0 ? 'favorable' : 'unfavorable'}
                      detail={`${actualEbitdaMargin.toFixed(1)}% EBITDA margin`}
                      accent={actualEbitda >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'}
                    />
                    <MetricCard
                      title="Cash position"
                      value={formatMoney.format(startingCash)}
                      badge={
                        startingCash > 15000
                          ? 'Healthy'
                          : startingCash > 8000
                            ? 'Watch'
                            : undefined
                      }
                      badgeType="favorable"
                      detail="Current cash balance"
                      accent="border-l-amber-600"
                    />
                    <MetricCard
                      title="Net budget variance"
                      value={formatMoney.format(totalNetVariance)}
                      badge={totalNetVariance >= 0 ? 'Favorable' : 'Review'}
                      badgeType={totalNetVariance >= 0 ? 'favorable' : 'unfavorable'}
                      detail={`Budget deviation across ${effectiveBudgetItems.length} lines`}
                      accent={totalNetVariance >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'}
                    />
                  </section>
                );
              })()}

              <section className="grid grid-cols-1 gap-2 xl:grid-cols-2 items-stretch">
                <article className="flex flex-col rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900">Revenue trend</h2>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Monthly revenue recorded in Xero
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">
                      Monthly Actuals
                    </span>
                  </div>
                  <div ref={revenueChartRef} className="h-72 w-full" />
                </article>

                <article className="flex flex-col rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900">Budget vs actual</h2>
                      <p className="mt-0.5 text-[10px] text-slate-500">Performance by budget line</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">
                      {effectiveBudgetItems.length} lines
                    </span>
                  </div>
                  {effectiveBudgetItems.length > 0 ? (
                    <div className="h-72 w-full overflow-y-auto overflow-x-hidden pr-1.5 scrollbar-thin">
                      <div
                        ref={budgetChartRef}
                        className="w-full"
                        style={{ height: Math.max(288, effectiveBudgetItems.length * 36) }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center">
                      <p className="text-xs text-slate-500">
                        No budget lines are available for this period.
                      </p>
                    </div>
                  )}
                </article>
              </section>

              <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
                  <div>
                    <h2 className="text-xs font-semibold text-slate-900">
                      Budget vs actual (P&amp;L)
                    </h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Variance = actual − budget. Revenue is favorable above budget; costs are
                      favorable below budget.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active items only ({effectiveBudgetItems.length})
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[660px] text-left text-xs">
                    <thead className="bg-white text-[10px] text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Line item</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Actual</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Budget</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Target</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Variance vs Budget</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Variance %</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Budget Status</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Target Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {effectiveBudgetItems.map((item) => {
                        const variance = item.actual - item.budget;
                        const unfavorable = item.type === 'revenue' ? variance < 0 : variance > 0;
                        const variancePct =
                          item.budget !== 0 ? (variance / Math.abs(item.budget)) * 100 : 0;
                        const targetVariance = item.actual - item.target;
                        const targetMet =
                          item.type === 'revenue'
                            ? item.actual >= item.target
                            : item.actual <= item.target;

                        return (
                          <tr key={item.category} className="text-slate-700 hover:bg-slate-50">
                            <th
                              scope="row"
                              className="px-3 py-2.5 text-left font-medium text-slate-900"
                            >
                              {item.category}
                            </th>
                            <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                              {formatMoney.format(item.actual)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">
                              {formatMoney.format(item.budget)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                              {formatMoney.format(item.target)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 text-right font-medium tabular-nums',
                                unfavorable ? 'text-rose-600' : 'text-emerald-700',
                              )}
                            >
                              {variance > 0 ? '+' : ''}
                              {formatMoney.format(variance)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 text-right tabular-nums',
                                unfavorable ? 'text-rose-600' : 'text-emerald-700',
                              )}
                            >
                              {variancePct > 0 ? '+' : ''}
                              {variancePct.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  unfavorable
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-emerald-50 text-emerald-700',
                                )}
                              >
                                {unfavorable ? (
                                  <CircleAlert className="h-3 w-3" />
                                ) : (
                                  <CircleCheck className="h-3 w-3" />
                                )}
                                {unfavorable ? 'Review' : 'On track'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                                  targetMet
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700',
                                )}
                              >
                                {targetMet ? (
                                  <CircleCheck className="h-3 w-3" />
                                ) : (
                                  <Target className="h-3 w-3" />
                                )}
                                {targetMet
                                  ? 'Target achieved'
                                  : `${formatMoney.format(Math.abs(targetVariance))} to target`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {effectiveBudgetItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                            No active budget line items found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 text-amber-600" />
                  <h2 className="text-xs font-semibold text-slate-900">Budget watchlist</h2>
                </div>
                {watchlist.length > 0 ? (
                  <ul className="mt-2 grid gap-2 md:grid-cols-3">
                    {watchlist.map((item) => (
                      <li
                        key={item.category}
                        className="rounded-sm border-l-2 border-amber-500 bg-slate-50 px-3 py-2 text-[11px] text-slate-700"
                      >
                        <span className="font-semibold">{item.category}</span>
                        <span className="mt-1 flex items-center gap-1 text-amber-800">
                          {item.type === 'revenue' ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          {formatMoney.format(Math.abs(item.variance))} unfavorable variance
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    No unfavorable variances in the available budget lines.
                  </p>
                )}
              </section>
            </>
          )}

          {statementView === 'cashflow' &&
            (() => {
              const cf = data?.cashFlow13Week;
              const weeks: CashFlowWeekItem[] = effective13Weeks;
              const startingCash = cf?.startingCash || 0;
              const totalInflows = weeks.reduce((sum, w) => sum + (Number(w.cashIn) || 0), 0);
              const totalOutflows = weeks.reduce((sum, w) => sum + (Number(w.cashOut) || 0), 0);
              const netChange = totalInflows - totalOutflows;
              const endingCash =
                weeks.length > 0
                  ? (weeks[weeks.length - 1].endingCash ?? startingCash)
                  : startingCash;
              const avgWeeklyBurn =
                totalOutflows > 0 ? totalOutflows / Math.max(1, weeks.length) : 0;
              const runway = avgWeeklyBurn > 0 ? startingCash / (avgWeeklyBurn * 4.33) : 12;

              let minCash = startingCash;
              let minCashWeek = 1;
              weeks.forEach((w) => {
                if (w.endingCash !== undefined && w.endingCash < minCash) {
                  minCash = w.endingCash;
                  minCashWeek = w.weekNum ?? 1;
                }
              });

              const dso = data?.kpiScorecard?.dso ?? 38;
              const dpo = data?.kpiScorecard?.dpo ?? 26;
              const ccc = data?.kpiScorecard?.workingCapitalCycle ?? 42;

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900">
                        Budgeted Cashflow Projections (13-Week)
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        Rolling 13-week cash liquidity trajectory derived from your manual budget
                        &amp; target plan
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border',
                        hasCustomizedPlan
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-100 text-slate-600',
                      )}
                    >
                      {hasCustomizedPlan
                        ? '✨ Live: Synchronized with Custom Plan & Targets'
                        : 'Default Xero Benchmark'}
                    </span>
                  </div>
                  {/* 4 Cash KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Opening Liquidity
                        </span>
                        <Landmark className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {formatMoney.format(startingCash)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Live bank &amp; cash equivalents
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          13-Wk Net Cash Flow
                        </span>
                        <ArrowUpDown
                          className={cn(
                            'h-4 w-4',
                            netChange >= 0 ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          'mt-2 text-xl font-bold',
                          netChange >= 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {netChange >= 0 ? '+' : ''}
                        {formatMoney.format(netChange)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="text-emerald-600 font-semibold">
                          +{formatMoney.format(totalInflows)}
                        </span>
                        <span>/</span>
                        <span className="text-rose-600 font-semibold">
                          -{formatMoney.format(totalOutflows)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          W13 Ending Cash
                        </span>
                        <Coins className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {formatMoney.format(endingCash)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Min week: Week {minCashWeek} ({formatMoney.format(minCash)})
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Cash Runway
                        </span>
                        <Activity className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-indigo-600">
                        {runway > 36 ? '>36' : runway.toFixed(1)}{' '}
                        <span className="text-xs font-medium text-slate-500">months</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Avg burn: {formatMoney.format(avgWeeklyBurn)} / week
                      </p>
                    </div>
                  </div>

                  {/* Interactive Chart */}
                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                          13-Week Cash Flow &amp; Liquidity Trajectory
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Weekly projected collections (AR), scheduled disbursements (AP &amp;
                          OpEx), and closing cash balance
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Cash Inflows
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-rose-700">
                          <span className="h-2 w-2 rounded-sm bg-rose-400" /> Cash Outflows
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-indigo-700">
                          <span className="h-2 w-2 rounded-full bg-indigo-600" /> Ending Cash
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div ref={cashFlowChartRef} className="h-72 w-full" />
                    </div>
                  </div>

                  {/* Working Capital Cycle Diagnostics */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-900">
                        Days Sales Outstanding (DSO)
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-800">
                        {dso.toFixed(0)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">days</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Average time to collect receivables from clients
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-900">
                        Days Payable Outstanding (DPO)
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-800">
                        {dpo.toFixed(0)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">days</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Average time taken to pay vendor bills and expenses
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-900">
                        Cash Conversion Cycle (CCC)
                      </div>
                      <div className="mt-1 text-lg font-bold text-indigo-600">
                        {ccc.toFixed(0)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">days</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Net operating cycle required to turn investments into cash
                      </p>
                    </div>
                  </div>

                  {/* 13-Week Cash Schedule Table */}
                  <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <h3 className="text-xs font-semibold text-slate-900">
                        13-Week Detailed Cash Schedule
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Breakdown of weekly liquidity positions, cash burn, and buffer status
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Week</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">
                              Cash Inflows
                            </th>
                            <th className="py-2.5 px-3 text-right text-rose-700">Cash Outflows</th>
                            <th className="py-2.5 px-3 text-right">Net Cash Flow</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">
                              Closing Cash
                            </th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {weeks.map((w: CashFlowWeekItem, idx: number) => {
                            const net = w.netCash !== undefined ? w.netCash : w.cashIn - w.cashOut;
                            return (
                              <tr
                                key={idx}
                                className={cn(
                                  'hover:bg-slate-50/80 transition-colors',
                                  idx % 2 === 1 && 'bg-slate-50/30',
                                )}
                              >
                                <td className="py-2 px-3 font-medium text-slate-900">
                                  {w.weekLabel || `Week ${w.weekNum || idx + 1}`}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">
                                  +{formatMoney.format(w.cashIn)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-600">
                                  -{formatMoney.format(w.cashOut)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-3 text-right font-mono font-medium',
                                    net >= 0 ? 'text-emerald-700' : 'text-rose-600',
                                  )}
                                >
                                  {net >= 0 ? '+' : ''}
                                  {formatMoney.format(net)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatMoney.format(w.endingCash)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                      w.endingCash > 100000
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : w.endingCash > 30000
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200',
                                    )}
                                  >
                                    {w.status ||
                                      (w.endingCash > 100000
                                        ? 'Healthy'
                                        : w.endingCash > 30000
                                          ? 'Monitor'
                                          : 'Critical')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}


          <p className="text-[10px] leading-relaxed text-slate-500">
            Financial actuals and cash position are loaded directly from the Xero finance integration.
            Budget targets are managed in the Plan &amp; Targets schedule. For forward-looking 12-month
            predictive modeling, sensitivity tests, and scenario stress testing, visit the{' '}
            <Link href="/forecast" className="font-semibold text-sky-700 hover:underline">
              Forecast &amp; Scenario Cockpit &rarr;
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
