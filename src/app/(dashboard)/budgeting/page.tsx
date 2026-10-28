'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Building,
  CheckCircle2,
  CircleAlert,
  CircleCheck,
  Coins,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
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
  const [scenario, setScenario] = useState<ScenarioType>('average');
  const activeScenarioConfig = SCENARIOS[scenario];
  const [statementView, setStatementView] = useState<'pnl' | 'cashflow' | 'balancesheet'>('pnl');
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

  useEffect(() => {
    let isMounted = true;
    const fetchBudgetPlan = async () => {
      try {
        const res = await fetch('/api/dashboard/budget-plans', { cache: 'no-store' });
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
        console.warn('Could not fetch custom plan from database, checking local fallback', err);
      }

      // Fallback to local storage if database hasn't stored one or network is offline
      try {
        const saved = window.localStorage.getItem('virtual-cfo-budget-plans');
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          applyPlanData(parsed);
        }
      } catch {
        // ignore
      }
    };

    fetchBudgetPlan();
    return () => {
      isMounted = false;
    };
  }, [applyPlanData]);

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
      }),
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
    });
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

      // 1. Save directly to Database
      let savedToDb = false;
      try {
        const response = await fetch('/api/dashboard/budget-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: completeStorage }),
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

      // 2. Keep localStorage as offline/instant client backup
      try {
        window.localStorage.setItem('virtual-cfo-budget-plans', JSON.stringify(completeStorage));
      } catch {
        // ignore
      }

      if (savedToDb) {
        toast.success(
          '12-month budget saved to database! All 12 months, Q1–Q4 quarterly totals, and Annual sum have been synchronized.',
        );
      } else {
        toast.success('12-month budget saved locally. (Database sync pending)');
      }
    } catch {
      toast.error('Unable to save the budget plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetBudgetPlan = async () => {
    // Delete from Database
    try {
      await fetch('/api/dashboard/budget-plans', {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to reset plan in database:', err);
    }

    try {
      window.localStorage.removeItem('virtual-cfo-budget-plans');
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
    toast.success('Budget plan reset from database and restored to default benchmarks.');
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

  const scenarioMatrix = useMemo(() => {
    const revItems = budgetItems.filter((i) => i.type === 'revenue');
    const expItems = budgetItems.filter((i) => i.type === 'expense');

    const baseRev =
      actualRevenue > 0
        ? actualRevenue
        : revItems.length > 0
          ? revItems.reduce((s, i) => s + i.actual, 0)
          : (data?.budgeting?.revBudget ?? 770000);

    const baseCost =
      (profitability?.opexFixed ?? 0) +
        (profitability?.opexVariable ?? 0) +
        (profitability?.cogs ?? 0) ||
      (expItems.length > 0
        ? expItems.reduce((s, i) => s + i.actual, 0)
        : (data?.budgeting?.expBudget ?? 552000));

    const baseProfit = baseRev - baseCost;

    return (['worst', 'average', 'best'] as const).map((key) => {
      const cfg = SCENARIOS[key];
      const projRev = Math.round(baseRev * cfg.revMultiplier);
      const projCost = Math.round(baseCost * cfg.costMultiplier);
      const projProfit = projRev - projCost;
      const marginPct = projRev > 0 ? (projProfit / projRev) * 100 : 0;
      const deltaProfit = projProfit - baseProfit;
      return {
        ...cfg,
        projRev,
        projCost,
        projProfit,
        marginPct,
        deltaProfit,
      };
    });
  }, [actualRevenue, budgetItems, data?.budgeting, profitability]);

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
          {/* Control Bar: Scenarios & Periods */}
          <section
            aria-label="Dashboard controls"
            className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Scenario selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600">Scenario:</span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1">
                  {(['average', 'best', 'worst'] as const).map((scKey) => {
                    const sc = SCENARIOS[scKey];
                    const isActive = scenario === scKey;
                    return (
                      <button
                        key={scKey}
                        type="button"
                        onClick={() => setScenario(scKey)}
                        aria-pressed={isActive}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600',
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
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
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
                  <span>Cash Flow (13-Week)</span>
                  {statementView === 'cashflow' && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStatementView('balancesheet')}
                  aria-pressed={statementView === 'balancesheet'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                    statementView === 'balancesheet'
                      ? 'bg-indigo-600 font-semibold text-white shadow-sm ring-1 ring-indigo-700/20'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )}
                >
                  <Scale
                    className={cn(
                      'h-3.5 w-3.5 transition-colors',
                      statementView === 'balancesheet' ? 'text-white' : 'text-indigo-600',
                    )}
                  />
                  <span>Balance Sheet &amp; Working Capital</span>
                  {statementView === 'balancesheet' && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-slate-600">Full 3-Statement Dynamic Model</span>
              <span className="hidden sm:inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                {statementView === 'pnl'
                  ? 'P&L Active'
                  : statementView === 'cashflow'
                    ? 'Cash Flow Active'
                    : 'Balance Sheet Active'}
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
                      <h2 className="text-xs font-semibold text-slate-900">Plan &amp; targets</h2>
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
                            <span>Custom Plan Active {dbSavedAt ? '(DB Synced)' : ''}</span>
                          </>
                        ) : (
                          'Default Benchmarks'
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
                            ? `✍️ Editing ${MONTH_NAMES[selectedMonth]} manually (Month ${selectedMonth + 1} of 12)`
                            : planningHorizon === 'quarterly'
                              ? selectedQuarter === 'all'
                                ? '📊 Viewing Quarterly Average (Annual ÷ 4)'
                                : `📊 Viewing ${selectedQuarter} Sum (${QUARTERS.find(
                                    (q) => q.key === selectedQuarter,
                                  )
                                    ?.months.map((m) => MONTH_SHORT[m])
                                    .join(' + ')})`
                              : '🎯 Viewing Annual Total (Sum of all 12 months)'}
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
                                ? `Budget (${MONTH_NAMES[selectedMonth]})`
                                : planningHorizon === 'quarterly'
                                  ? selectedQuarter === 'all'
                                    ? 'Budget (Quarterly Avg)'
                                    : `Budget (${selectedQuarter})`
                                  : 'Budget (Annual: 12-Mo Sum)'}
                            </th>
                            <th className="px-3 py-2.5 text-right capitalize">
                              {planningHorizon === 'monthly'
                                ? `Target (${MONTH_NAMES[selectedMonth]})`
                                : planningHorizon === 'quarterly'
                                  ? selectedQuarter === 'all'
                                    ? 'Target (Quarterly Avg)'
                                    : `Target (${selectedQuarter})`
                                  : 'Target (Annual: 12-Mo Sum)'}
                            </th>
                            <th className="px-3 py-2.5 text-right capitalize">
                              {planningHorizon === 'monthly'
                                ? `Actual (${MONTH_SHORT[selectedMonth]} run-rate)`
                                : planningHorizon === 'quarterly'
                                  ? 'Actual (Quarterly run-rate)'
                                  : 'Actual (Annual run-rate)'}
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
                                  ? MONTH_SHORT[selectedMonth]
                                  : planningHorizon === 'quarterly'
                                    ? selectedQuarter === 'all'
                                      ? 'Quarterly Avg'
                                      : selectedQuarter
                                    : 'Full Year'}
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

              {/* Scenario Sensitivity Modeling Panel */}
              <section className="rounded-md border border-slate-200 bg-white p-3.5">
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
                          activeScenarioConfig.badgeClass,
                        )}
                      >
                        Active: {activeScenarioConfig.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Compare Worst Case, Average Case, and Best Case assumptions. Figures show
                      projected performance for{' '}
                      <span className="font-medium text-slate-700">
                        {data?.periodInfo?.label ?? 'the selected period'}
                      </span>{' '}
                      with annualized run rates.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Target multipliers:</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                      Rev: {activeScenarioConfig.revMultiplier}x · Cost:{' '}
                      {activeScenarioConfig.costMultiplier}x
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  {scenarioMatrix.map((item) => {
                    const isCurrent = scenario === item.key;
                    const annualizedProjRev = Math.round((item.projRev / periodMonths) * 12);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setScenario(item.key)}
                        className={cn(
                          'group relative flex flex-col justify-between rounded-md border p-3 text-left transition-all',
                          isCurrent
                            ? cn('shadow-sm', item.cardBorderClass)
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              {item.key === 'best' && (
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              {item.key === 'worst' && (
                                <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                              )}
                              {item.key === 'average' && (
                                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600" />
                              )}
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
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-400">
                                Projected Rev ({period === 'ttm' ? 'TTM' : 'Period'}):
                              </span>
                              <p className="font-semibold tabular-nums text-slate-800">
                                {formatMoney.format(item.projRev)}
                              </p>
                              {period !== 'ttm' && (
                                <span className="text-[9px] text-slate-400">
                                  FY run-rate: {formatMoney.format(annualizedProjRev)}
                                </span>
                              )}
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

              {(() => {
                const isScenarioActive = scenario !== 'average';
                const scenarioRevMultiplier = activeScenarioConfig.revMultiplier;
                const scenarioCostMultiplier = activeScenarioConfig.costMultiplier;

                const actualRev = profitability.revenue;
                const projectedRev = Math.round(actualRev * scenarioRevMultiplier);

                const rawOpex = profitability.opexFixed + profitability.opexVariable;
                const projectedOpex = Math.round(rawOpex * scenarioCostMultiplier);

                const actualCogs = profitability.cogs ?? Math.round(actualRev * 0.38);
                const projectedCogs = Math.round(actualCogs * scenarioCostMultiplier);

                const actualGrossProfit = profitability.grossProfit;
                const projectedGrossProfit = projectedRev - projectedCogs;
                const actualGrossMargin = profitability.grossMarginPct;
                const projectedGrossMarginPct =
                  projectedRev > 0
                    ? (projectedGrossProfit / projectedRev) * 100
                    : actualGrossMargin;

                const actualEbitda = profitability.ebitda;
                const projectedEbitda = projectedGrossProfit - Math.round(projectedOpex * 0.7);
                const actualEbitdaMargin = profitability.ebitdaMarginPct;
                const projectedEbitdaMarginPct =
                  projectedRev > 0 ? (projectedEbitda / projectedRev) * 100 : 0;

                return (
                  <section
                    aria-label="Financial overview"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
                  >
                    <MetricCard
                      title="Revenue"
                      value={formatMoney.format(isScenarioActive ? projectedRev : actualRev)}
                      badge={
                        isScenarioActive
                          ? `${activeScenarioConfig.growthPct > 0 ? '+' : ''}${activeScenarioConfig.growthPct}%`
                          : undefined
                      }
                      badgeType={activeScenarioConfig.growthPct >= 0 ? 'favorable' : 'unfavorable'}
                      detail={
                        isScenarioActive
                          ? `Proj · Actual: ${formatMoney.format(actualRev)}`
                          : `Actual · ${data.periodInfo?.label ?? 'selected period'}`
                      }
                      accent={
                        isScenarioActive
                          ? scenario === 'best'
                            ? 'border-l-emerald-600'
                            : 'border-l-rose-600'
                          : 'border-l-emerald-600'
                      }
                    />
                    <MetricCard
                      title="Gross margin"
                      value={`${(isScenarioActive ? projectedGrossMarginPct : actualGrossMargin).toFixed(1)}%`}
                      badge={
                        isScenarioActive
                          ? `${projectedGrossMarginPct >= actualGrossMargin ? '+' : ''}${(projectedGrossMarginPct - actualGrossMargin).toFixed(1)}%`
                          : undefined
                      }
                      badgeType={
                        projectedGrossMarginPct >= actualGrossMargin ? 'favorable' : 'unfavorable'
                      }
                      detail={`${formatMoney.format(isScenarioActive ? projectedGrossProfit : actualGrossProfit)} gross profit`}
                      accent={
                        isScenarioActive
                          ? projectedGrossProfit >= actualGrossProfit
                            ? 'border-l-emerald-600'
                            : 'border-l-rose-600'
                          : 'border-l-emerald-600'
                      }
                    />
                    <MetricCard
                      title="Operating expenses"
                      value={formatMoney.format(isScenarioActive ? projectedOpex : rawOpex)}
                      badge={
                        isScenarioActive
                          ? `${scenarioCostMultiplier > 1 ? '+' : ''}${Math.round((scenarioCostMultiplier - 1) * 100)}%`
                          : undefined
                      }
                      badgeType={scenarioCostMultiplier <= 1 ? 'favorable' : 'unfavorable'}
                      detail={
                        isScenarioActive
                          ? `Proj · Actual: ${formatMoney.format(rawOpex)}`
                          : `Operating costs · ${data.periodInfo?.label ?? 'selected period'}`
                      }
                      accent={
                        isScenarioActive
                          ? scenarioCostMultiplier <= 1
                            ? 'border-l-emerald-600'
                            : 'border-l-rose-600'
                          : 'border-l-amber-600'
                      }
                    />
                    <MetricCard
                      title="EBITDA"
                      value={formatMoney.format(isScenarioActive ? projectedEbitda : actualEbitda)}
                      badge={
                        isScenarioActive
                          ? `${projectedEbitda >= actualEbitda ? '+' : ''}${formatMoney.format(projectedEbitda - actualEbitda)}`
                          : undefined
                      }
                      badgeType={projectedEbitda >= actualEbitda ? 'favorable' : 'unfavorable'}
                      detail={`${(isScenarioActive ? projectedEbitdaMarginPct : actualEbitdaMargin).toFixed(1)}% EBITDA margin`}
                      accent={
                        isScenarioActive
                          ? projectedEbitda >= actualEbitda
                            ? 'border-l-emerald-600'
                            : 'border-l-rose-600'
                          : 'border-l-emerald-600'
                      }
                    />
                    <MetricCard
                      title="Cash position"
                      value={formatMoney.format(data.cashFlow13Week?.startingCash ?? 0)}
                      badge={
                        (data.cashFlow13Week?.startingCash ?? 0) > 15000
                          ? 'Healthy'
                          : (data.cashFlow13Week?.startingCash ?? 0) > 8000
                            ? 'Watch'
                            : undefined
                      }
                      badgeType="favorable"
                      detail="Current cash balance"
                      accent="border-l-amber-600"
                    />
                    <MetricCard
                      title="FY forecast revenue"
                      value={formatMoney.format(forecastRevenue)}
                      badge={activeScenarioConfig.label}
                      badgeType={
                        scenario === 'best'
                          ? 'favorable'
                          : scenario === 'worst'
                            ? 'unfavorable'
                            : 'neutral'
                      }
                      detail={`Annualized run rate · ${activeScenarioConfig.tagline}`}
                      accent={
                        scenario === 'best'
                          ? 'border-l-emerald-600'
                          : scenario === 'worst'
                            ? 'border-l-rose-600'
                            : 'border-l-sky-600'
                      }
                    />
                  </section>
                );
              })()}

              <section className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <article className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2">
                    <h2 className="text-xs font-semibold text-slate-900">Revenue trend</h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Monthly revenue recorded in Xero
                    </p>
                  </div>
                  <div ref={revenueChartRef} className="h-60 w-full" />
                </article>
                <article className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2">
                    <h2 className="text-xs font-semibold text-slate-900">Budget vs actual</h2>
                    <p className="mt-1 text-[10px] text-slate-500">Performance by budget line</p>
                  </div>
                  {effectiveBudgetItems.length > 0 ? (
                    <div
                      ref={budgetChartRef}
                      className="w-full"
                      style={{ height: Math.max(256, effectiveBudgetItems.length * 42) }}
                    />
                  ) : (
                    <p className="py-16 text-center text-sm text-slate-500">
                      No budget lines are available for this period.
                    </p>
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
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {effectiveBudgetItems.length} line items
                  </span>
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
                            No budget data is available for this period.
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
                        13-Week Cash Flow Forecast
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

          {statementView === 'balancesheet' &&
            (() => {
              const bs = effectiveBalanceSheet || data?.balanceSheet;
              const caItems = bs?.assets?.current || [];
              const ncaItems = bs?.assets?.nonCurrent || [];
              const totalCurrentAssets = bs?.assets?.totalCurrent || 0;
              const totalNonCurrentAssets = bs?.assets?.totalNonCurrent || 0;
              const totalAssets =
                bs?.assets?.totalAssets || totalCurrentAssets + totalNonCurrentAssets;

              const clItems = bs?.liabilities?.current || [];
              const nclItems = bs?.liabilities?.nonCurrent || [];
              const totalCurrentLiabilities = bs?.liabilities?.totalCurrent || 0;
              const totalNonCurrentLiabilities = bs?.liabilities?.totalNonCurrent || 0;
              const totalLiabilities =
                bs?.liabilities?.totalLiabilities ||
                totalCurrentLiabilities + totalNonCurrentLiabilities;

              const equityItems = bs?.equity?.items || [];
              const totalEquity = bs?.equity?.totalEquity || totalAssets - totalLiabilities;
              const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

              const workingCapital =
                bs?.workingCapital ?? totalCurrentAssets - totalCurrentLiabilities;
              const currentRatio =
                effectiveBalanceSheet?.currentRatio ??
                data?.kpiScorecard?.currentRatio ??
                (totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 2.5);
              const quickRatio =
                effectiveBalanceSheet?.quickRatio ?? data?.kpiScorecard?.quickRatio ?? 2.1;
              const debtToEquity =
                effectiveBalanceSheet?.debtToEquity ??
                data?.kpiScorecard?.debtToEquity ??
                (totalEquity > 0 ? totalLiabilities / totalEquity : 0.45);
              const isBalanced =
                bs?.isBalanced ?? Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

              return (
                <div className="space-y-4">
                  {/* Balance Sheet Header with Live Sync Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900">
                        Balance Sheet &amp; Working Capital Pro-Forma
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        Classified financial position, net worth, and working capital solvency
                        synchronized with your manual plan
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

                  {/* 4 Balance Sheet KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Total Assets
                        </span>
                        <Building className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {formatMoney.format(totalAssets)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Current: {formatMoney.format(totalCurrentAssets)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Total Liabilities
                        </span>
                        <Coins className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {formatMoney.format(totalLiabilities)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Current: {formatMoney.format(totalCurrentLiabilities)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Net Worth (Equity)
                        </span>
                        <Scale className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="mt-2 text-xl font-bold text-sky-700">
                        {formatMoney.format(totalEquity)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Book value of enterprise equity
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Working Capital
                        </span>
                        <Activity className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div
                        className={cn(
                          'mt-2 text-xl font-bold',
                          workingCapital >= 0 ? 'text-indigo-600' : 'text-rose-600',
                        )}
                      >
                        {formatMoney.format(workingCapital)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Current Assets - Current Liab.
                      </p>
                    </div>
                  </div>

                  {/* Accounting Equation Verification Banner */}
                  <div
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm',
                      isBalanced
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                        : 'border-rose-200 bg-rose-50/70 text-rose-900',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2
                        className={cn('h-5 w-5', isBalanced ? 'text-emerald-600' : 'text-rose-600')}
                      />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          {isBalanced
                            ? 'Balance Sheet Audit: Verified in Equilibrium'
                            : 'Balance Sheet Audit: Imbalance Detected'}
                        </h4>
                        <p className="text-[11px] opacity-90">
                          Assets ({formatMoney.format(totalAssets)}) = Liabilities (
                          {formatMoney.format(totalLiabilities)}) + Equity (
                          {formatMoney.format(totalEquity)})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium uppercase opacity-75">Variance</span>
                      <div className="text-xs font-mono font-bold">
                        {formatMoney.format(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                      </div>
                    </div>
                  </div>

                  {/* Liquidity & Solvency Diagnostics */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">Current Ratio</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                            currentRatio >= 1.5
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800',
                          )}
                        >
                          {currentRatio >= 1.5 ? 'Strong' : 'Caution'}
                        </span>
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-800">
                        {currentRatio.toFixed(2)}x
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Benchmark &gt; 1.5x (Current Assets / Current Liabilities)
                      </p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          Quick Ratio (Acid-Test)
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                            quickRatio >= 1.0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800',
                          )}
                        >
                          {quickRatio >= 1.0 ? 'Liquid' : 'Tight'}
                        </span>
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-800">
                        {quickRatio.toFixed(2)}x
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Benchmark &gt; 1.0x ((Cash + AR) / Current Liabilities)
                      </p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          Debt to Equity Ratio
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                            debtToEquity < 1.0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800',
                          )}
                        >
                          {debtToEquity < 1.0 ? 'Conservative' : 'Leveraged'}
                        </span>
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-800">
                        {debtToEquity.toFixed(2)}x
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Benchmark &lt; 1.5x (Total Liabilities / Total Equity)
                      </p>
                    </div>
                  </div>

                  {/* Classified Balance Sheet Table */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Assets Column */}
                    <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-slate-200 bg-emerald-50/50 px-4 py-2.5">
                        <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Assets
                        </h3>
                        <p className="text-[10px] text-emerald-800">
                          Current &amp; long-term economic resources
                        </p>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">
                            Current Assets
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs">
                            {caItems.map((item: BalanceSheetItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-1">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {formatMoney.format(item.value)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1.5 font-semibold text-slate-900 border-t border-slate-200">
                              <span>Total Current Assets</span>
                              <span className="font-mono text-emerald-700">
                                {formatMoney.format(totalCurrentAssets)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">
                            Non-Current Assets
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs">
                            {ncaItems.map((item: BalanceSheetItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-1">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {formatMoney.format(item.value)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1.5 font-semibold text-slate-900 border-t border-slate-200">
                              <span>Total Non-Current Assets</span>
                              <span className="font-mono text-emerald-700">
                                {formatMoney.format(totalNonCurrentAssets)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between rounded-md bg-emerald-100/60 px-3 py-2 text-xs font-bold text-emerald-950 border border-emerald-200">
                          <span className="uppercase tracking-wider">Total Assets</span>
                          <span className="font-mono text-sm">
                            {formatMoney.format(totalAssets)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities & Equity Column */}
                    <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-100 px-4 py-2.5">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Liabilities &amp; Equity
                        </h3>
                        <p className="text-[10px] text-slate-600">
                          Obligations and shareholder net worth
                        </p>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">
                            Current Liabilities
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs">
                            {clItems.map((item: BalanceSheetItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-1">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {formatMoney.format(item.value)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1.5 font-semibold text-slate-900 border-t border-slate-200">
                              <span>Total Current Liabilities</span>
                              <span className="font-mono text-rose-700">
                                {formatMoney.format(totalCurrentLiabilities)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">
                            Non-Current Liabilities
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs">
                            {nclItems.map((item: BalanceSheetItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-1">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {formatMoney.format(item.value)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1.5 font-semibold text-slate-900 border-t border-slate-200">
                              <span>Total Non-Current Liabilities</span>
                              <span className="font-mono text-rose-700">
                                {formatMoney.format(totalNonCurrentLiabilities)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">
                            Shareholders&apos; Equity
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs">
                            {equityItems.map((item: BalanceSheetItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-1">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {formatMoney.format(item.value)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1.5 font-semibold text-slate-900 border-t border-slate-200">
                              <span>Total Shareholders&apos; Equity</span>
                              <span className="font-mono text-sky-700">
                                {formatMoney.format(totalEquity)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between rounded-md bg-slate-200/80 px-3 py-2 text-xs font-bold text-slate-900 border border-slate-300">
                          <span className="uppercase tracking-wider">
                            Total Liabilities &amp; Equity
                          </span>
                          <span className="font-mono text-sm">
                            {formatMoney.format(totalLiabilitiesAndEquity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          <p className="text-[10px] leading-relaxed text-slate-500">
            Financial actuals and cash position are loaded from the Xero finance integration. FY
            forecast revenue is an illustrative annualized run rate applying the selected{' '}
            {activeScenarioConfig.label} ({activeScenarioConfig.revMultiplier}x revenue multiplier /{' '}
            {activeScenarioConfig.growthPct > 0
              ? `+${activeScenarioConfig.growthPct}%`
              : `${activeScenarioConfig.growthPct}%`}{' '}
            target assumption); it is not a Xero-reported forecast.
          </p>
        </>
      )}
    </main>
  );
}
