'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Database, FileText, Flag, RefreshCw, Scale, TrendingUp, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ManagementLedgerWorkspace } from '@/components/management-accounts/ManagementLedgerWorkspace';

type Line = { name: string; value: number };
type Trend = { month: string; revenue: number | null; expenses: number | null; netProfit: number | null; available?: boolean; reason?: string | null };
type Report = {
  connected?: boolean;
  available?: boolean;
  summary?: { revenue: number; turnover?: number; otherIncome?: number; cogs?: number; expenses: number; grossProfit: number; netProfit: number; profitMargin: number | null; grossProfitMargin: number | null };
  income?: { operating: Line[]; other: Line[] };
  cogs?: Line[];
  expenses?: { operating: Line[]; other: Line[] };
  trends?: Trend[];
  assets?: { current: Line[]; nonCurrent: Line[]; unclassified?: Line[] };
  liabilities?: { current: Line[]; nonCurrent: Line[]; unclassified?: Line[] };
  equity?: Line[];
  unclassified?: Line[];
  balanceSummary?: { assets: number | null; liabilities: number | null; equity: number | null; isBalanced: boolean | null; difference: number | null; reconciliation?: string };
  summaryBalance?: { assets: number; liabilities: number; equity: number; isBalanced: boolean; difference: number };
  sourceSummary?: { assets: number | null; liabilities: number | null; equity: number | null; isBalanced: boolean | null; difference: number | null; reconciliation: string; workingCapital: { cash: number | null; receivables: number | null; payables: number | null; currentAssets: number | null; currentLiabilities: number | null; netWorkingCapital: number | null; currentRatio: number | null; receivablesToPayables: number | null; cashToPayables: number | null } | null };
  meta?: { currency?: string | null; calculatedAt?: string; organizationName?: string | null; fromDate?: string; toDate?: string; asOfDate?: string };
  error?: string;
};
type ManagementAnalysis = {
  connected?: boolean;
  comparisons?: {
    previousPeriod: { label: string; fromDate: string; toDate: string; available: boolean; totals: { revenue: number; grossProfit: number; operatingExpenses: number; netProfit: number } | null };
    priorYear: { label: string; fromDate: string; toDate: string; available: boolean; totals: { revenue: number; grossProfit: number; operatingExpenses: number; netProfit: number } | null };
    budget: { available: boolean; periodLabel: string; revenue: number; grossProfit: number; operatingExpenses: number; netProfit: number } | null;
  } | null;
  receivables?: { available: boolean; asOfDate: string; entries: { name: string; amount: number; invoiceCount?: number }[] };
  payables?: { available: boolean; asOfDate: string; entries: { name: string; amount: number; invoiceCount?: number }[] };
};
type ContactBalanceComparison = {
  available: boolean;
  loading?: boolean;
  entries: { name: string; previous: number; current: number; movement: number; changePercent: number | null }[];
};
type AdvancedManagementData = {
  connected?: boolean;
  cashMovement?: {
    accounts: { name: string; opening: number | null; inflows: number | null; outflows: number | null; closing: number | null }[];
    opening: number | null; inflows: number | null; outflows: number | null; netMovement: number | null; closing: number | null;
    reconciliationDifference: number | null; available: boolean;
  } | null;
  balanceMovement?: {
    previousDate: string; currentDate: string;
    previous: { assets: number | null; liabilities: number | null; equity: number | null };
    current: { assets: number | null; liabilities: number | null; equity: number | null };
    changes: { assets: number | null; liabilities: number | null; equity: number | null };
    changePercentages: { assets: number | null; liabilities: number | null; equity: number | null };
    contactComparisons: { receivables: ContactBalanceComparison; payables: ContactBalanceComparison };
    accounts: { name: string; category: string; previous: number | null; current: number | null; change: number | null; changePercent: number | null; accountId?: string; accountCode?: string; activity?: AccountActivity }[];
    significant: { name: string; category: string; previous: number | null; current: number | null; change: number | null; changePercent: number | null; accountId?: string; accountCode?: string; activity?: AccountActivity }[];
    equations: { date: string; difference: number | null; balanced: boolean | null }[];
    available: boolean;
  } | null;
  closeReview?: {
    controls: { id: string; name: string; category: string; status: 'verified' | 'attention' | 'not-verified' | 'not-applicable'; detail: string; evidence: string; referenceDate: string }[];
    counts: { verified: number; attention: number; notVerified: number; notApplicable: number };
    checkedAt: string;
    period: { fromDate: string; toDate: string };
  } | null;
  meta?: { currency?: string | null; calculatedAt?: string };
};

const emptyReport: Report = {};

function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function rangeFor(preset: string) { const end = new Date(); const start = new Date(end); if (preset === 'month') start.setDate(1); else if (preset === 'quarter') start.setMonth(end.getMonth() - 2, 1); else if (preset === 'half-year') start.setMonth(end.getMonth() - 5, 1); else if (preset === 'ytd') start.setMonth(0, 1); else start.setDate(start.getDate() - 364); return { from: isoDate(start), to: isoDate(end) }; }
function formatDate(value?: string) { if (!value) return 'Not available'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function formatValue(value: number | null | undefined, currency: string) { if (value === null || value === undefined || !Number.isFinite(value)) return 'Not available'; const formatter = currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }); return formatter.format(value); }
function comparisonChange(current: number, reference: number, currency: string) { const difference = current - reference; const sign = difference > 0 ? '+' : ''; const percentage = reference === 0 ? null : (difference / Math.abs(reference)) * 100; return `${sign}${formatValue(difference, currency)}${percentage === null ? '' : ` (${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%)`}`; }
function sum(lines: Line[] | undefined) { return (lines || []).reduce((total, line) => total + line.value, 0); }

type LedgerExportData = {
  connected: boolean;
  accounts: { accountId: string; accountCode: string; accountName: string; classification: string; openingBalance: number | null; totalDebits: number | null; totalCredits: number | null; netMovement: number | null; sourceClosingBalance: number | null; adjustedClosingBalance: number | null; unresolvedDifference: number | null; reconciliationStatus: string; adjustmentCount: number; pendingAdjustmentCount: number }[];
  adjustments: { accountId: string; direction: 'DEBIT' | 'CREDIT'; amount: number; status: string; adjustmentRef: string; description: string }[];
};

async function fetchLedgerExport(fromDate: string, toDate: string): Promise<LedgerExportData | null> {
  try {
    const response = await fetch(`/api/dashboard/management-accounts/ledger?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json() as LedgerExportData;
    return result.connected && Array.isArray(result.accounts) ? result : null;
  } catch { return null; }
}

function CashMovementStatement({ data, currency }: { data: AdvancedManagementData['cashMovement']; currency: string }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-900">Actual cash movement</h2><p className="mt-1 text-xs text-slate-500">Cash and bank activity reported by Xero for the selected period.</p></div>
    {!data?.available ? <p className="p-4 text-sm text-slate-500">Cash movement is unavailable because Xero did not return a complete Bank Summary for this period.</p> : <>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Opening cash', data.opening], ['Cash received', data.inflows], ['Cash spent', data.outflows], ['Closing cash', data.closing],
        ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="block text-xs text-slate-500">{label}</span><strong className="mt-1 block text-sm tabular-nums text-slate-900">{formatValue(typeof value === 'number' ? value : null, currency)}</strong></div>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Cash account</th><th className="px-4 py-3 text-right">Opening</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Spent</th><th className="px-4 py-3 text-right">Closing</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{data.accounts.map((account) => <tr key={account.name} className="hover:bg-slate-50/70"><th scope="row" className="px-4 py-3 font-medium text-slate-700">{account.name}</th><td className="px-4 py-3 text-right tabular-nums">{formatValue(account.opening, currency)}</td><td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatValue(account.inflows, currency)}</td><td className="px-4 py-3 text-right tabular-nums text-amber-800">{formatValue(account.outflows, currency)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatValue(account.closing, currency)}</td></tr>)}</tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900"><tr><th className="px-4 py-3">Net movement</th><td /><td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatValue(data.inflows, currency)}</td><td className="px-4 py-3 text-right tabular-nums text-amber-800">{formatValue(data.outflows, currency)}</td><td className="px-4 py-3 text-right tabular-nums">{formatValue(data.netMovement, currency)}</td></tr></tfoot>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>Cash received less cash spent equals net movement.</span><span className="font-semibold">Roll-forward difference: {formatValue(data.reconciliationDifference, currency)}</span></div>
    </>}
  </section>;
}

function BalanceMovementAnalysis({ data, currency }: { data: AdvancedManagementData['balanceMovement']; currency: string }) {
  const activityStart = data?.previousDate ? new Date(`${data.previousDate}T00:00:00.000Z`) : null;
  if (activityStart) activityStart.setUTCDate(activityStart.getUTCDate() + 1);
  const activityFromDate = activityStart?.toISOString().slice(0, 10) ?? '';
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-900">Balance-sheet movement</h2><p className="mt-1 text-xs text-slate-500">Xero balances at {formatDate(data?.previousDate)} compared with {formatDate(data?.currentDate)}. The comparison uses the previous month-end.</p></div>
    {!data?.available ? <p className="p-4 text-sm text-slate-500">Movement analysis is unavailable because one or both dated Xero Balance Sheet reports could not be retrieved.</p> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Previous balance</th><th className="px-4 py-3 text-right">Current balance</th><th className="px-4 py-3 text-right">Movement</th><th className="px-4 py-3 text-right">Change</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{(['assets', 'liabilities', 'equity'] as const).map((category) => <tr key={category}><th className="px-4 py-3 font-semibold capitalize text-slate-700">Total {category}</th><td className="px-4 py-3 text-right tabular-nums">{formatValue(data.previous[category], currency)}</td><td className="px-4 py-3 text-right tabular-nums">{formatValue(data.current[category], currency)}</td><td className={cn('px-4 py-3 text-right font-semibold tabular-nums', (data.changes[category] ?? 0) >= 0 ? 'text-slate-800' : 'text-rose-700')}>{formatValue(data.changes[category], currency)}</td><td className="px-4 py-3 text-right tabular-nums">{data.changePercentages[category] === null ? '—' : `${data.changePercentages[category]!.toFixed(1)}%`}</td></tr>)}</tbody>
      </table></div>
      {data.significant.length > 0 && <div className="border-t border-slate-200 p-4"><h3 className="mb-3 text-sm font-semibold text-slate-800">Largest account movements</h3><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="pb-2">Account</th><th className="pb-2">Classification</th><th className="pb-2 text-right">Previous</th><th className="pb-2 text-right">Current</th><th className="pb-2 text-right">Movement</th><th className="pb-2 text-right">Change</th></tr></thead><tbody className="divide-y divide-slate-200">{data.significant.map((account, index) => <tr key={`${account.category}-${account.name}-${index}`}><th className="py-2.5 pr-3 font-medium text-slate-700">{account.name}</th><td className="py-2.5 text-slate-500">{account.category}</td><td className="py-2.5 text-right tabular-nums">{formatValue(account.previous, currency)}</td><td className="py-2.5 text-right tabular-nums">{formatValue(account.current, currency)}</td><td className="py-2.5 text-right font-semibold tabular-nums">{formatValue(account.change, currency)}</td><td className="py-2.5 text-right tabular-nums">{account.changePercent === null ? '—' : `${account.changePercent.toFixed(1)}%`}</td></tr>)}</tbody></table></div><p className="mt-3 text-[11px] text-slate-500">Movements are ranked by absolute value. A percentage is shown only when the previous balance is positive. Xero reports do not identify the cause of each change; review the account activity for context.</p></div>}
      <div className="divide-y divide-slate-200 border-t border-slate-200">{[...new Set(data.accounts.map((account) => account.category))].map((category) => {
        const accounts = data.accounts.filter((account) => account.category === category);
        return <details key={category} className="group"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden"><span>{category}</span><span className="flex items-center gap-2 text-xs font-normal text-slate-500">{accounts.length} accounts<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span></summary><div className="overflow-x-auto border-t border-slate-100"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Account (expand for entries)</th><th className="px-4 py-2 text-right">Previous</th><th className="px-4 py-2 text-right">Current</th><th className="px-4 py-2 text-right">Movement</th><th className="px-4 py-2 text-right">Change</th></tr></thead><tbody className="divide-y divide-slate-200">{accounts.map((account, index) => <AccountMovementRow key={`${account.name}-${index}`} account={account} fromDate={activityFromDate} toDate={data?.currentDate ?? ''} currency={currency} contactComparisons={data.contactComparisons} />)}</tbody></table></div></details>;
      })}</div>
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">{data.equations.map((equation) => <div key={equation.date} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"><div><p className="text-xs font-semibold text-slate-700">Balance-sheet equation</p><p className="mt-1 text-[11px] text-slate-500">As at {formatDate(equation.date)} · difference {formatValue(equation.difference, currency)}</p></div><span className={cn('text-xs font-semibold', equation.balanced === true ? 'text-emerald-700' : equation.balanced === false ? 'text-amber-700' : 'text-slate-500')}>{equation.balanced === true ? 'Balanced' : equation.balanced === false ? 'Review required' : 'Not available'}</span></div>)}</div>
    </>}
  </section>;
}

function Section({ title, lines, total, currency, open, onToggle }: { title: string; lines: Line[]; total: number; currency: string; open: boolean; onToggle: () => void }) {
  return <div className="border-b border-slate-100 last:border-0"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer" aria-expanded={open}><span className="flex items-center gap-2 text-sm font-semibold text-slate-800">{open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}{title}</span><span className="text-sm font-semibold text-slate-900">{formatValue(total, currency)}</span></button>{open && lines.length > 0 && <div className="space-y-2 px-10 pb-3">{lines.map((line, index) => <div key={`${line.name}-${index}`} className="flex justify-between gap-4 text-xs text-slate-600"><span>{line.name}</span><span className="tabular-nums">{formatValue(line.value, currency)}</span></div>)}</div>}{open && lines.length === 0 && <p className="px-10 pb-3 text-xs text-slate-400">No account breakdown is available.</p>}</div>;
}

type AvailableTrend = Trend & { revenue: number; expenses: number; netProfit: number };

type AccountActivity = {
  available: boolean;
  message?: string | null;
  transactions: { date: string; type: string; description: string; reference: string; debit: number; credit: number; runningBalance: number | null; currency: string }[];
};

function AccountMovementRow({ account, fromDate, toDate, currency, contactComparisons }: {
  account: { name: string; category: string; previous: number | null; current: number | null; change: number | null; changePercent: number | null; accountId?: string; accountCode?: string; activity?: AccountActivity };
  fromDate: string;
  toDate: string;
  currency: string;
  contactComparisons: { receivables: ContactBalanceComparison; payables: ContactBalanceComparison };
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<AccountActivity | null>(account.activity ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const accountName = account.name.toLocaleLowerCase();
  const isReceivables = /receivable|debtor/.test(accountName);
  const isPayables = /payable|creditor/.test(accountName);
  const contactComparison = isReceivables ? contactComparisons.receivables : isPayables ? contactComparisons.payables : null;
  const contactKind = isReceivables ? 'customer' : 'supplier';

  const loadActivity = async () => {
    if (loading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ accountName: account.name, category: account.category, fromDate, toDate });
      if (account.accountId) params.set('accountId', account.accountId);
      if (account.accountCode) params.set('accountCode', account.accountCode);
      const response = await fetch(`/api/dashboard/reports/management-accounts-advanced/account-activity?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok && !result.message) throw new Error(result.error || 'Account activity could not be loaded.');
      setActivity(result as AccountActivity);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Account activity could not be loaded.');
    } finally {
      setLoading(false);
    }
  };
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !activity && !loading) void loadActivity();
  };

  return <>
    <tr className="hover:bg-slate-50/70">
      <th scope="row" className="px-4 py-2.5 text-left font-medium text-slate-700"><button type="button" onClick={() => void toggle()} aria-expanded={expanded} className="inline-flex max-w-full cursor-pointer items-center gap-1.5 text-left hover:text-cyan-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"><ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-90')} /><span className="truncate">{account.name}</span></button></th>
      <td className="px-4 py-2.5 text-right tabular-nums">{formatValue(account.previous, currency)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">{formatValue(account.current, currency)}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatValue(account.change, currency)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">{account.changePercent === null ? '—' : `${account.changePercent.toFixed(1)}%`}</td>
    </tr>
    {expanded && <tr><td colSpan={5} className="bg-slate-50/80 px-4 py-3">
      {contactComparison && <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2"><p className="text-xs font-semibold capitalize text-slate-800">{contactKind} balance comparison</p><p className="mt-0.5 text-[11px] text-slate-500">Xero aged balance by contact at the two balance-sheet dates.</p></div>
        {contactComparison.loading ? <p className="px-3 py-3 text-xs text-slate-500">Loading Xero contact balances…</p>
          : !contactComparison.available ? <p className="px-3 py-3 text-xs text-slate-500">Xero contact balance reports could not be retrieved for both dates.</p>
          : contactComparison.entries.length === 0 ? <p className="px-3 py-3 text-xs text-slate-500">No outstanding {contactKind} balances were reported on either date.</p>
            : <div className="max-h-80 overflow-auto"><table className="w-full min-w-[640px] text-left text-[11px]"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">{contactKind}</th><th className="px-3 py-2 text-right">Previous</th><th className="px-3 py-2 text-right">Current</th><th className="px-3 py-2 text-right">Movement</th><th className="px-3 py-2 text-right">Change</th></tr></thead><tbody className="divide-y divide-slate-100">{contactComparison.entries.map((entry) => <tr key={entry.name} className="hover:bg-slate-50/70"><th className="px-3 py-2 text-left font-medium text-slate-700">{entry.name}</th><td className="px-3 py-2 text-right tabular-nums">{formatValue(entry.previous, currency)}</td><td className="px-3 py-2 text-right tabular-nums">{formatValue(entry.current, currency)}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{formatValue(entry.movement, currency)}</td><td className="px-3 py-2 text-right tabular-nums">{entry.changePercent === null ? '—' : `${entry.changePercent.toFixed(1)}%`}</td></tr>)}</tbody></table></div>}
      </div>}
      {!contactComparison && (loading ? <p className="text-xs text-slate-500">Loading Xero account activity…</p>
        : loadError ? <div className="flex flex-wrap items-center gap-3 text-xs text-rose-700"><span>{loadError}</span><button type="button" onClick={() => { setActivity(null); setLoadError(null); void loadActivity(); }} className="cursor-pointer font-semibold underline">Try again</button></div>
          : activity?.transactions.length ? <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2"><p className="text-xs font-semibold text-slate-800">Xero entries for {formatDate(fromDate)} to {formatDate(toDate)}</p><p className="mt-0.5 text-[11px] text-slate-500">Debits and credits recorded against this account during the comparison period.</p></div>
            <table className="w-full min-w-[760px] text-left text-[11px]"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Running balance</th></tr></thead><tbody className="divide-y divide-slate-100">{activity.transactions.map((entry, index) => <tr key={`${entry.date}-${entry.reference}-${index}`}><td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDate(entry.date)}</td><td className="max-w-[220px] px-3 py-2 text-slate-700">{entry.description || '—'}</td><td className="px-3 py-2 text-slate-600">{entry.type || '—'}</td><td className="px-3 py-2 text-slate-600">{entry.reference || '—'}</td><td className="px-3 py-2 text-right tabular-nums">{formatValue(entry.debit, currency || entry.currency)}</td><td className="px-3 py-2 text-right tabular-nums">{formatValue(entry.credit, currency || entry.currency)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{formatValue(entry.runningBalance, currency || entry.currency)}</td></tr>)}</tbody></table>
          </div>
          : <p className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">{activity?.message || 'Xero returned no account entries for this comparison period.'}</p>)}
    </td></tr>}
  </>;
}

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function MonthlyPerformanceChart({ data, currency }: { data: Trend[]; currency: string }) {
  if (!data.length) return null;

  const compactValue = (value: number) => new Intl.NumberFormat(undefined, {
    ...(currency ? { style: 'currency' as const, currency } : {}),
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

  const option = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { left: 72, right: 20, top: 42, bottom: 38, containLabel: true },
    color: ['#2563eb', '#f59e0b', '#059669'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      extraCssText: 'border-radius: 10px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);',
      textStyle: { color: '#334155', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12 },
      formatter: (params: unknown) => {
        const points = Array.isArray(params) ? params as { axisValueLabel?: string; seriesName?: string; value?: number | null; marker?: string }[] : [];
        const title = points[0]?.axisValueLabel || '';
        const rows = points.map((point) => `${point.marker || ''} ${point.seriesName || ''}: ${point.value == null ? 'Not available' : formatValue(point.value, currency)}`);
        return `<strong>${title}</strong><br/>${rows.join('<br/>')}`;
      },
    },
    legend: {
      top: 0,
      left: 72,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20,
      icon: 'circle',
      textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'var(--font-sans), sans-serif' },
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.month),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11, hideOverlap: true, margin: 14 },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: compactValue },
      splitLine: { lineStyle: { color: '#eef2f6', type: 'dashed' } },
    },
    series: [
      { name: 'Revenue', type: 'bar', data: data.map((item) => item.available !== false && item.revenue !== null ? item.revenue : null), barMaxWidth: data.length === 1 ? 44 : data.length <= 3 ? 32 : 20, barGap: '18%', itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(37, 99, 235, 0.24)' } } },
      { name: 'Total costs', type: 'bar', data: data.map((item) => item.available !== false && item.expenses !== null ? item.expenses : null), barMaxWidth: data.length === 1 ? 44 : data.length <= 3 ? 32 : 20, itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(245, 158, 11, 0.24)' } } },
      { name: 'Net profit', type: 'bar', data: data.map((item) => item.available !== false && item.netProfit !== null ? item.netProfit : null), barMaxWidth: data.length === 1 ? 44 : data.length <= 3 ? 32 : 20, itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(5, 150, 105, 0.24)' } } },
    ],
  };

  return (
    <div className="px-3 py-4 sm:px-5">
      <ReactECharts option={option} notMerge opts={{ renderer: 'svg' }} style={{ width: '100%', height: 320 }} />
    </div>
  );
}

function PerformanceComparisons({ analysis, summary, fromDate, toDate, currency }: {
  analysis: ManagementAnalysis | null;
  summary: NonNullable<Report['summary']> | undefined;
  fromDate: string;
  toDate: string;
  currency: string;
}) {
  const comparisons = analysis?.comparisons;
  if (!comparisons || !summary) return null;
  const previous = comparisons.previousPeriod;
  const priorYear = comparisons.priorYear;
  const budget = comparisons.budget?.available ? comparisons.budget : null;
  const metrics = [
    { label: 'Revenue', current: summary.revenue, previous: previous.totals?.revenue, priorYear: priorYear.totals?.revenue, budget: budget?.revenue },
    { label: 'Gross profit', current: summary.grossProfit, previous: previous.totals?.grossProfit, priorYear: priorYear.totals?.grossProfit, budget: budget?.grossProfit },
    { label: 'Operating expenses', current: summary.expenses, previous: previous.totals?.operatingExpenses, priorYear: priorYear.totals?.operatingExpenses, budget: budget?.operatingExpenses },
    { label: 'Net profit', current: summary.netProfit, previous: previous.totals?.netProfit, priorYear: priorYear.totals?.netProfit, budget: budget?.netProfit },
  ];
  const hasPrevious = previous.available && previous.totals !== null;
  const hasPriorYear = priorYear.available && priorYear.totals !== null;

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-900">Period performance</h2>
      <p className="mt-1 text-xs text-slate-500">{formatDate(fromDate)} – {formatDate(toDate)} compared with the previous period and the same dates last year.</p>
    </div>
    <div className="overflow-x-auto">
      <table className={`w-full ${budget ? 'min-w-[980px]' : 'min-w-[780px]'} text-left text-xs`}>
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>
          <th scope="col" className="px-4 py-3 font-semibold">Measure</th>
          <th scope="col" className="px-3 py-3 text-right font-semibold">Selected period</th>
          <th scope="col" className="px-3 py-3 text-right font-semibold"><span className="block">Previous period</span><span className="mt-1 block text-[9px] font-normal normal-case tracking-normal">{formatDate(previous.fromDate)} – {formatDate(previous.toDate)}</span></th>
          <th scope="col" className="px-3 py-3 text-right font-semibold">Change</th>
          <th scope="col" className="px-3 py-3 text-right font-semibold"><span className="block">Same dates last year</span><span className="mt-1 block text-[9px] font-normal normal-case tracking-normal">{formatDate(priorYear.fromDate)} – {formatDate(priorYear.toDate)}</span></th>
          <th scope="col" className="px-3 py-3 text-right font-semibold">Change</th>
          {budget && <><th scope="col" className="px-3 py-3 text-right font-semibold">Xero budget</th><th scope="col" className="px-3 py-3 text-right font-semibold">Variance</th></>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {metrics.map((metric, index) => <tr key={metric.label} className={index % 2 ? 'bg-slate-50/40' : 'bg-white'}>
            <th scope="row" className="px-4 py-3 font-semibold text-slate-700">{metric.label}</th>
            <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatValue(metric.current, currency)}</td>
            <td className="px-3 py-3 text-right tabular-nums text-slate-600">{hasPrevious ? formatValue(metric.previous, currency) : 'Not available'}</td>
            <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-700">{hasPrevious ? comparisonChange(metric.current, metric.previous!, currency) : '—'}</td>
            <td className="px-3 py-3 text-right tabular-nums text-slate-600">{hasPriorYear ? formatValue(metric.priorYear, currency) : 'Not available'}</td>
            <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-700">{hasPriorYear ? comparisonChange(metric.current, metric.priorYear!, currency) : '—'}</td>
            {budget && <><td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatValue(metric.budget, currency)}</td><td className="px-3 py-3 text-right font-medium tabular-nums text-slate-700">{comparisonChange(metric.current, metric.budget!, currency)}</td></>}
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">Figures compare the selected dates with the previous period and the same dates last year. {budget ? 'Budget figures are allocated across the selected dates.' : 'Budget figures appear when available.'}</div>
  </section>;
}
export default function ManagementAccountsPage() {
  const initialRange = rangeFor('ttm');
  const [preset, setPreset] = useState('ttm');
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [pnl, setPnl] = useState<Report>(emptyReport);
  const [bs, setBs] = useState<Report>(emptyReport);
  const [analysis, setAnalysis] = useState<ManagementAnalysis | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedManagementData | null>(null);
  const loadSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ revenue: false, cogs: false, expenses: false, other: false });

  const load = useCallback(async (from = fromDate, to = toDate) => {
    const requestSequence = ++loadSequence.current;
    const start = new Date(`${from}T00:00:00`); const end = new Date(`${to}T00:00:00`); const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || days < 0 || days > 364) { setError('Choose a valid reporting period of up to one year.'); return; }
    setLoading(true); setError(null); setAnalysis(null); setAdvanced(null);
    try {
      const query = `&refresh=${Date.now()}&storage=postgres`;
      const [pnlResponse, bsResponse] = await Promise.all([
        fetch(`/api/dashboard/reports/profit-and-loss?fromDate=${from}&toDate=${to}${query}`, { cache: 'no-store' }),
        fetch(`/api/dashboard/reports/balance-sheet?date=${to}${query}`, { cache: 'no-store' }),
      ]);
      const [pnlData, bsData] = await Promise.all([pnlResponse.json(), bsResponse.json()]);
      if (requestSequence !== loadSequence.current) return;
      if (!pnlResponse.ok || !bsResponse.ok || pnlData.error || bsData.error) throw new Error(pnlData.error || bsData.error || 'We could not load the reports. Please try again.');
      setPnl(pnlData); setBs(bsData);
      setLoading(false);

      // These supporting panels are independent of the core statements. In
      // particular, dated contact reports can take longer on a first Xero sync.
      void Promise.all([
        fetch(`/api/dashboard/reports/management-analysis?fromDate=${from}&toDate=${to}&storage=postgres`, { cache: 'no-store' }).then(async (response) => response.ok ? response.json() : null).catch(() => null),
        fetch(`/api/dashboard/reports/management-accounts-advanced?fromDate=${from}&toDate=${to}&storage=postgres`, { cache: 'no-store' }).then(async (response) => response.ok ? response.json() : null).catch(() => null),
      ]).then(([analysisData, advancedData]) => {
        if (requestSequence !== loadSequence.current) return;
        setAnalysis(analysisData);
        setAdvanced(advancedData);
        if (advancedData?.connected && advancedData?.balanceMovement) {
          void fetch(`/api/dashboard/reports/management-accounts-advanced/contact-comparisons?date=${to}`, { cache: 'no-store' })
            .then(async (response) => response.ok ? response.json() : { contactComparisons: {
              receivables: { available: false, loading: false, entries: [] },
              payables: { available: false, loading: false, entries: [] },
            } })
            .then((comparisonData) => {
              if (requestSequence !== loadSequence.current) return;
              setAdvanced((current) => current?.balanceMovement
                ? { ...current, balanceMovement: { ...current.balanceMovement, contactComparisons: comparisonData.contactComparisons } }
                : current);
            })
            .catch((error) => {
              console.warn('Management Accounts contact comparisons did not load:', error);
              if (requestSequence !== loadSequence.current) return;
              setAdvanced((current) => current?.balanceMovement ? { ...current, balanceMovement: { ...current.balanceMovement, contactComparisons: {
                receivables: { available: false, loading: false, entries: [] },
                payables: { available: false, loading: false, entries: [] },
              } } } : current);
            });
        }
      });
    } catch (cause) { if (requestSequence === loadSequence.current) { setError(cause instanceof Error ? cause.message : 'We could not load the reports. Please try again.'); setPnl(emptyReport); setBs(emptyReport); setAnalysis(null); setAdvanced(null); } } finally { if (requestSequence === loadSequence.current) setLoading(false); }
  }, [fromDate, toDate]);

  const initialLoad = useRef(load);
  useEffect(() => {
    const timer = window.setTimeout(() => { void initialLoad.current(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshAfterXeroSync = () => { void load(); };
    window.addEventListener('xero-sync-complete', refreshAfterXeroSync);
    return () => window.removeEventListener('xero-sync-complete', refreshAfterXeroSync);
  }, [load]);

  const currency = pnl.meta?.currency || bs.meta?.currency || '';
  const summary = pnl.summary;
  const balance = bs.balanceSummary || bs.summaryBalance;
  const hasPnl = Boolean(pnl.connected && pnl.available !== false && (pnl.income?.operating?.length || pnl.income?.other?.length || pnl.cogs?.length || pnl.expenses?.operating?.length || pnl.expenses?.other?.length));
  const hasBalance = Boolean(bs.connected && bs.available !== false && (bs.assets?.current?.length || bs.assets?.nonCurrent?.length || bs.assets?.unclassified?.length || bs.liabilities?.current?.length || bs.liabilities?.nonCurrent?.length || bs.liabilities?.unclassified?.length || bs.equity?.length || bs.unclassified?.length));
  const trends = pnl.trends || [];
  const availableTrends = trends.filter((item): item is AvailableTrend => Boolean(item.available && item.revenue !== null && item.expenses !== null && item.netProfit !== null));
  const cash = hasBalance ? bs.sourceSummary?.workingCapital?.cash ?? null : null;
  const receivables = hasBalance ? bs.sourceSummary?.workingCapital?.receivables ?? null : null;
  const payables = hasBalance ? bs.sourceSummary?.workingCapital?.payables ?? null : null;
  const unclassifiedBalanceAccounts = [
    ...(bs.assets?.unclassified || []).map((line, index) => ({ id: `other-asset-${index}`, line, name: line.name, value: line.value, category: 'Other assets' })),
    ...(bs.liabilities?.unclassified || []).map((line, index) => ({ id: `other-liability-${index}`, line, name: line.name, value: line.value, category: 'Other liabilities' })),
    ...(bs.unclassified || []).map((line, index) => ({ id: `other-balance-${index}`, line, name: line.name, value: line.value, category: 'Other balance-sheet accounts' })),
  ];
  const unclassifiedBalanceLines = unclassifiedBalanceAccounts.map((account) => account.line);
  const orgName = pnl.meta?.organizationName || bs.meta?.organizationName;
  const reportPreparedAt = pnl.meta?.calculatedAt || bs.meta?.calculatedAt;
  const applyPreset = (value: string) => { setPreset(value); const next = rangeFor(value); setFromDate(next.from); setToDate(next.to); void load(next.from, next.to); };
  const receivableEntries = (analysis?.receivables?.entries || []).map((entry, index) => ({ id: `receivable-contact-${index}`, name: entry.name, value: entry.amount, invoiceCount: entry.invoiceCount, category: 'Receivables by customer' }));
  const payableEntries = (analysis?.payables?.entries || []).map((entry, index) => ({ id: `payable-contact-${index}`, name: entry.name, value: entry.amount, invoiceCount: entry.invoiceCount, category: 'Payables by supplier' }));
  const hasReceivableDetails = Boolean(analysis?.receivables?.available && receivableEntries.length);
  const hasPayableDetails = Boolean(analysis?.payables?.available && payableEntries.length);
  const topBalanceFlags = [
    ...receivableEntries.filter((entry) => Number.isFinite(entry.value) && Math.abs(entry.value) > 0).sort((left, right) => Math.abs(right.value) - Math.abs(left.value)).slice(0, 5),
    ...payableEntries.filter((entry) => Number.isFinite(entry.value) && Math.abs(entry.value) > 0).sort((left, right) => Math.abs(right.value) - Math.abs(left.value)).slice(0, 5),
  ];

  const downloadPdf = async () => {
    if (loading || exporting) return;
    setExporting('pdf');
    try {
      const ledgerExport = await fetchLedgerExport(fromDate, toDate);
      const { default: JsPDF } = await import('jspdf');
      const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 18;
      const right = pageWidth - 18;
      const tableWidth = right - left;
      const contentBottom = pageHeight - 24;
      const navy = [15, 35, 68] as [number, number, number];
      const teal = [8, 145, 178] as [number, number, number];
      const muted = [91, 105, 122] as [number, number, number];
      const expenseMix = [
        { label: 'Cost of sales', value: Math.abs(sum(pnl.cogs)), color: [37, 99, 235] as [number, number, number] },
        { label: 'Operating expenses', value: Math.abs(sum(pnl.expenses?.operating)), color: [8, 145, 178] as [number, number, number] },
        { label: 'Other expenses', value: Math.abs(sum(pnl.expenses?.other)), color: [245, 158, 11] as [number, number, number] },
      ].filter((item) => Number.isFinite(item.value) && item.value > 0);
      const expenseMixTotal = expenseMix.reduce((total, item) => total + item.value, 0);
      type TocEntry = { title: string; description: string; rowIndex: number };
      type PdfSection = {
        title: string;
        subtitle: string;
        headers: string[];
        rows: string[][];
        indentDetails?: boolean;
        layout?: 'standard' | 'trend' | 'comparison' | 'statement' | 'profit-flow' | 'balance-sheet' | 'metrics' | 'exposures' | 'summary';
        summaryCards?: { label: string; value: string; detail?: string }[];
        tocEntries: TocEntry[];
      };
      const sections: PdfSection[] = [];

      if (hasPnl) {
        const pnlRows: string[][] = [];
        const addGroup = (title: string, lines: Line[], total: number) => {
          pnlRows.push([title, formatValue(total, currency), 'group']);
          lines.forEach((line) => pnlRows.push([line.name, formatValue(line.value, currency), 'detail']));
        };
        addGroup('Revenue', pnl.income?.operating || [], sum(pnl.income?.operating));
        addGroup('Cost of sales', pnl.cogs || [], sum(pnl.cogs));
        pnlRows.push(['Gross profit', formatValue(summary?.grossProfit, currency), 'total']);
        addGroup('Operating expenses', pnl.expenses?.operating || [], sum(pnl.expenses?.operating));
        addGroup('Other income', pnl.income?.other || [], sum(pnl.income?.other));
        addGroup('Other expenses', pnl.expenses?.other || [], sum(pnl.expenses?.other));
        pnlRows.push(['Net profit', formatValue(summary?.netProfit, currency), 'total']);
        sections.push({
          title: 'Profit & Loss Statement', subtitle: `${formatDate(fromDate)} to ${formatDate(toDate)}  |  ${currency || 'Currency not specified'}`,
          headers: ['ACCOUNT', 'AMOUNT'], rows: pnlRows, indentDetails: true,
          layout: 'profit-flow',
          tocEntries: [{ title: 'Profit & Loss Statement', description: 'Account groups and reported totals', rowIndex: 0 }]
        });
        if (availableTrends.length) sections.push({
          title: 'Monthly Performance', subtitle: `${formatDate(fromDate)} to ${formatDate(toDate)}  |  ${currency || 'Currency not specified'}`,
          headers: ['MONTH', 'REVENUE', 'TOTAL COSTS', 'NET PROFIT'],
          rows: availableTrends.map((item) => [item.month, formatValue(item.revenue, currency), formatValue(item.expenses, currency), formatValue(item.netProfit, currency), 'detail']),
          layout: 'trend',
          tocEntries: [{ title: 'Monthly Performance', description: 'Reported activity by month', rowIndex: 0 }]
        });
        const comparisons = analysis?.comparisons;
        const hasComparisonData = Boolean(comparisons?.previousPeriod.available || comparisons?.priorYear.available || comparisons?.budget?.available);
        if (summary && comparisons && hasComparisonData) {
          const hasBudget = Boolean(comparisons.budget?.available);
          const amountAndChange = (current: number, baseline: number | undefined, available: boolean) => available && baseline !== undefined
            ? [formatValue(baseline, currency), `${current - baseline > 0 ? '+' : ''}${formatValue(current - baseline, currency)}`]
            : ['Not available', 'Not available'];
          const comparisonRows: string[][] = [
            ['Revenue', formatValue(summary.revenue, currency), ...amountAndChange(summary.revenue, comparisons.previousPeriod.totals?.revenue, comparisons.previousPeriod.available), ...amountAndChange(summary.revenue, comparisons.priorYear.totals?.revenue, comparisons.priorYear.available), ...(hasBudget ? amountAndChange(summary.revenue, comparisons.budget?.revenue, true) : []), 'comparison'],
            ['Gross profit', formatValue(summary.grossProfit, currency), ...amountAndChange(summary.grossProfit, comparisons.previousPeriod.totals?.grossProfit, comparisons.previousPeriod.available), ...amountAndChange(summary.grossProfit, comparisons.priorYear.totals?.grossProfit, comparisons.priorYear.available), ...(hasBudget ? amountAndChange(summary.grossProfit, comparisons.budget?.grossProfit, true) : []), 'comparison'],
            ['Operating expenses', formatValue(summary.expenses, currency), ...amountAndChange(summary.expenses, comparisons.previousPeriod.totals?.operatingExpenses, comparisons.previousPeriod.available), ...amountAndChange(summary.expenses, comparisons.priorYear.totals?.operatingExpenses, comparisons.priorYear.available), ...(hasBudget ? amountAndChange(summary.expenses, comparisons.budget?.operatingExpenses, true) : []), 'comparison'],
            ['Net profit', formatValue(summary.netProfit, currency), ...amountAndChange(summary.netProfit, comparisons.previousPeriod.totals?.netProfit, comparisons.previousPeriod.available), ...amountAndChange(summary.netProfit, comparisons.priorYear.totals?.netProfit, comparisons.priorYear.available), ...(hasBudget ? amountAndChange(summary.netProfit, comparisons.budget?.netProfit, true) : []), 'comparison'],
          ];
          sections.push({
            title: 'Performance Comparisons',
            subtitle: `Selected: ${fromDate}–${toDate} | Previous: ${comparisons.previousPeriod.fromDate}–${comparisons.previousPeriod.toDate} | Last year: ${comparisons.priorYear.fromDate}–${comparisons.priorYear.toDate}${hasBudget ? ' | Budget available' : ''}`,
            headers: hasBudget ? ['MEASURE', 'SELECTED', 'PREVIOUS', 'CHANGE', 'LAST YEAR', 'CHANGE', 'BUDGET', 'VARIANCE'] : ['MEASURE', 'SELECTED', 'PREVIOUS', 'CHANGE', 'LAST YEAR', 'CHANGE'],
            rows: comparisonRows,
            layout: 'comparison',
            tocEntries: [{ title: 'Performance Comparisons', description: 'Results versus previous period, prior year and available budget', rowIndex: 0 }]
          });
        }
      }

      if (hasBalance) {
        const balanceRows: string[][] = [];
        const currentAssets = bs.assets?.current || [];
        const nonCurrentAssets = bs.assets?.nonCurrent || [];
        const currentLiabilities = bs.liabilities?.current || [];
        const nonCurrentLiabilities = bs.liabilities?.nonCurrent || [];
        const workingCapital = bs.sourceSummary?.workingCapital;
        balanceRows.push(['Assets', '', 'group']);
        balanceRows.push(['Current assets', '', 'group']);
        currentAssets.forEach((line) => balanceRows.push([line.name, formatValue(line.value, currency), 'detail']));
        balanceRows.push(['Total current assets', formatValue(sum(currentAssets), currency), 'subtotal']);
        balanceRows.push(['Non-current assets', '', 'group']);
        nonCurrentAssets.forEach((line) => balanceRows.push([line.name, formatValue(line.value, currency), 'detail']));
        balanceRows.push(['Total non-current assets', formatValue(sum(nonCurrentAssets), currency), 'subtotal']);
        balanceRows.push(['Total assets', formatValue(bs.sourceSummary?.assets, currency), 'total']);

        balanceRows.push(['Liabilities', '', 'group']);
        balanceRows.push(['Current liabilities', '', 'group']);
        currentLiabilities.forEach((line) => balanceRows.push([line.name, formatValue(line.value, currency), 'detail']));
        balanceRows.push(['Total current liabilities', formatValue(sum(currentLiabilities), currency), 'subtotal']);
        balanceRows.push(['Non-current liabilities', '', 'group']);
        nonCurrentLiabilities.forEach((line) => balanceRows.push([line.name, formatValue(line.value, currency), 'detail']));
        balanceRows.push(['Total non-current liabilities', formatValue(sum(nonCurrentLiabilities), currency), 'subtotal']);
        balanceRows.push(['Total liabilities', formatValue(bs.sourceSummary?.liabilities, currency), 'subtotal']);

        balanceRows.push(['Equity', '', 'group']);
        (bs.equity || []).forEach((line) => balanceRows.push([line.name, formatValue(line.value, currency), 'detail']));
        balanceRows.push(['Total equity', formatValue(bs.sourceSummary?.equity, currency), 'subtotal']);
        const liabilitiesAndEquity = bs.sourceSummary?.liabilities != null && bs.sourceSummary?.equity != null
          ? bs.sourceSummary.liabilities + bs.sourceSummary.equity : null;
        balanceRows.push(['Total liabilities and equity', formatValue(liabilitiesAndEquity, currency), 'total']);
        if (unclassifiedBalanceAccounts.length) {
          balanceRows.push(['Other balance-sheet accounts', '', 'group']);
          unclassifiedBalanceAccounts.forEach((account) => balanceRows.push([account.name, formatValue(account.value, currency), 'detail']));
        }
        if (balance) balanceRows.push(['Balance check', balance.isBalanced === null ? 'Not available' : balance.isBalanced ? 'Balanced' : `Difference of ${formatValue(balance.difference, currency)}`, 'total']);
        sections.push({
          title: 'Balance Sheet', subtitle: `As at ${formatDate(toDate)} | ${currency || 'Currency not specified'}`,
          headers: ['ACCOUNT', 'BALANCE'], rows: balanceRows, indentDetails: true,
          layout: 'balance-sheet',
          summaryCards: [
            { label: 'Total assets', value: formatValue(bs.sourceSummary?.assets, currency) },
            { label: 'Total liabilities', value: formatValue(bs.sourceSummary?.liabilities, currency) },
            { label: 'Total equity', value: formatValue(bs.sourceSummary?.equity, currency) },
          ],
          tocEntries: [{ title: 'Balance Sheet', description: 'Assets, liabilities and equity', rowIndex: 0 }]
        });

        if (workingCapital) {
          const workingCapitalRows = [
            ['Cash and bank', formatValue(workingCapital.cash, currency), 'detail'],
            ['Trade receivables', formatValue(workingCapital.receivables, currency), 'detail'],
            ['Trade payables', formatValue(workingCapital.payables, currency), 'detail'],
            ['Net working capital', formatValue(workingCapital.netWorkingCapital, currency), 'total'],
            ['Current ratio', workingCapital.currentRatio == null ? 'Not available' : `${workingCapital.currentRatio.toFixed(2)}x`, 'detail'],
            ['Receivables to payables', workingCapital.receivablesToPayables == null ? 'Not available' : `${workingCapital.receivablesToPayables.toFixed(2)}x`, 'detail'],
            ['Cash to payables', workingCapital.cashToPayables == null ? 'Not available' : `${workingCapital.cashToPayables.toFixed(2)}x`, 'detail'],
          ];
          sections.push({
            title: 'Working Capital', subtitle: `Liquidity measures as at ${formatDate(toDate)}`,
            headers: ['RATIO / MEASURE', 'VALUE'], rows: workingCapitalRows,
            layout: 'metrics',
            tocEntries: [{ title: 'Working Capital', description: 'Cash, working capital and liquidity ratios', rowIndex: 0 }]
          });
        }

        if (topBalanceFlags.length) {
          const exposureRows: string[][] = [];
          const receivableFlags = topBalanceFlags.filter((entry) => entry.category === 'Receivables by customer');
          const payableFlags = topBalanceFlags.filter((entry) => entry.category === 'Payables by supplier');
          if (receivableFlags.length) {
            exposureRows.push(['Top receivable balances', '', 'group']);
            receivableFlags.forEach((entry) => exposureRows.push([entry.name, formatValue(entry.value, currency), 'flag']));
          }
          if (payableFlags.length) {
            exposureRows.push(['Top payable balances', '', 'group']);
            payableFlags.forEach((entry) => exposureRows.push([entry.name, formatValue(entry.value, currency), 'flag']));
          }
          sections.push({
            title: 'Receivables and Payables', subtitle: 'Five largest outstanding balances in each available category',
            headers: ['CUSTOMER OR SUPPLIER', 'OUTSTANDING'], rows: exposureRows,
            layout: 'exposures',
            tocEntries: [{ title: 'Receivables and Payables', description: 'Largest outstanding customer and supplier balances', rowIndex: 0 }]
          });
        }
      }
      if (advanced?.cashMovement?.available) {
        const cash = advanced.cashMovement;
        const cashRows: string[][] = [
          ['Opening cash and bank balances', formatValue(cash.opening, currency), 'total'],
          ['Cash received', '', 'group'],
          ...cash.accounts.map((account) => [account.name, formatValue(account.inflows, currency), 'detail']),
          ['Total cash received', formatValue(cash.inflows, currency), 'subtotal'],
          ['Cash spent', '', 'group'],
          ...cash.accounts.map((account) => [account.name, formatValue(account.outflows, currency), 'detail']),
          ['Total cash spent', formatValue(cash.outflows, currency), 'subtotal'],
          ['Net cash movement', formatValue(cash.netMovement, currency), 'total'],
          ['Closing cash and bank balances', formatValue(cash.closing, currency), 'total'],
          ['Roll-forward difference', formatValue(cash.reconciliationDifference, currency), 'detail'],
        ];
        sections.push({ title: 'Actual Cash Movement', subtitle: `${formatDate(fromDate)} to ${formatDate(toDate)} | Xero Bank Summary | ${currency || 'Currency not specified'}`, headers: ['CASH MOVEMENT', 'AMOUNT'], rows: cashRows, layout: 'statement', tocEntries: [{ title: 'Actual Cash Movement', description: 'Opening cash, receipts, payments and closing position', rowIndex: 0 }] });
      }
      if (advanced?.balanceMovement?.available) {
        const movement = advanced.balanceMovement;
        const movementRows: string[][] = [];
        (['assets', 'liabilities', 'equity'] as const).forEach((category) => {
          movementRows.push([`Total ${category}`, formatValue(movement.previous[category], currency), formatValue(movement.current[category], currency), formatValue(movement.changes[category], currency), movement.changePercentages[category] === null ? '—' : `${movement.changePercentages[category]!.toFixed(1)}%`, 'total']);
          const accounts = movement.accounts.filter((account) => account.category.toLowerCase().includes(category === 'assets' ? 'asset' : category === 'liabilities' ? 'liabilit' : 'equity'));
          accounts.forEach((account) => movementRows.push([account.name, formatValue(account.previous, currency), formatValue(account.current, currency), formatValue(account.change, currency), account.changePercent === null ? '—' : `${account.changePercent.toFixed(1)}%`, 'detail']));
        });
        sections.push({ title: 'Balance-Sheet Movement', subtitle: `Previous month-end ${formatDate(movement.previousDate)} compared with ${formatDate(movement.currentDate)} | Percentages shown where the previous balance is positive | ${currency || 'Currency not specified'}`, headers: ['ACCOUNT / CATEGORY', 'PREVIOUS', 'CURRENT', 'MOVEMENT', 'CHANGE'], rows: movementRows, layout: 'comparison', tocEntries: [{ title: 'Balance-Sheet Movement', description: 'Account changes between the two Xero balance-sheet dates', rowIndex: 0 }] });
      }
      if (advanced?.closeReview) {
        const closeRows: string[][] = [
          [`Review totals: ${advanced.closeReview.counts.verified} verified · ${advanced.closeReview.counts.attention} need attention · ${advanced.closeReview.counts.notVerified} not verified`, '', 'group'],
          ...advanced.closeReview.controls.map((control) => [control.name, `${control.status === 'verified' ? 'Verified' : control.status === 'attention' ? 'Needs attention' : control.status === 'not-applicable' ? 'Not applicable' : 'Not verified'} — ${control.detail} (${control.evidence}; ${control.referenceDate})`, 'detail']),
        ];
        sections.push({ title: 'Month-End Close Review', subtitle: `${formatDate(fromDate)} to ${formatDate(toDate)} | Evidence-based review summary; not a close certification`, headers: ['CONTROL', 'STATUS AND EVIDENCE'], rows: closeRows, layout: 'metrics', tocEntries: [{ title: 'Month-End Close Review', description: 'Control status and evidence available for the selected period', rowIndex: 0 }] });
      }
      const closingRows: string[][] = [];
      if (summary) {
        closingRows.push(['Trading performance', 'group']);
        closingRows.push([`Revenue for ${formatDate(fromDate)} to ${formatDate(toDate)} was ${formatValue(summary.revenue, currency)}.`, 'detail']);
        closingRows.push([`Gross profit was ${formatValue(summary.grossProfit, currency)}${summary.grossProfitMargin == null ? '' : `, a gross margin of ${summary.grossProfitMargin.toFixed(1)}%`}.`, 'detail']);
        closingRows.push([`Operating expenses were ${formatValue(summary.expenses, currency)} and net profit was ${formatValue(summary.netProfit, currency)}${summary.profitMargin == null ? '' : `, a net margin of ${summary.profitMargin.toFixed(1)}%`}.`, 'detail']);
        const comparisons = analysis?.comparisons;
        const movement = (difference: number) => Math.abs(difference) < 0.005 ? 'unchanged' : `${formatValue(Math.abs(difference), currency)} ${difference > 0 ? 'higher' : 'lower'}`;
        if (comparisons?.previousPeriod.available && comparisons.previousPeriod.totals) {
          const revenueChange = summary.revenue - comparisons.previousPeriod.totals.revenue;
          const profitChange = summary.netProfit - comparisons.previousPeriod.totals.netProfit;
          closingRows.push([`Compared with the previous period, revenue was ${movement(revenueChange)} and net profit was ${movement(profitChange)}.`, 'detail']);
        }
        if (comparisons?.priorYear.available && comparisons.priorYear.totals) {
          const revenueChange = summary.revenue - comparisons.priorYear.totals.revenue;
          const profitChange = summary.netProfit - comparisons.priorYear.totals.netProfit;
          closingRows.push([`Compared with the same dates last year, revenue was ${movement(revenueChange)} and net profit was ${movement(profitChange)}.`, 'detail']);
        }
      }
      if (hasBalance) {
        closingRows.push(['Financial position', 'group']);
        closingRows.push([`At ${formatDate(toDate)}, total assets were ${formatValue(bs.sourceSummary?.assets, currency)}, total liabilities were ${formatValue(bs.sourceSummary?.liabilities, currency)}, and total equity was ${formatValue(bs.sourceSummary?.equity, currency)}.`, 'detail']);
        const workingCapital = bs.sourceSummary?.workingCapital;
        if (workingCapital?.netWorkingCapital != null) closingRows.push([`Net working capital was ${formatValue(workingCapital.netWorkingCapital, currency)}${workingCapital.currentRatio == null ? '' : `, with a current ratio of ${workingCapital.currentRatio.toFixed(2)}x`}.`, 'detail']);
        if (balance?.isBalanced === true) closingRows.push(['The balance sheet is in balance.', 'detail']);
        else if (balance?.isBalanced === false) closingRows.push([`The balance sheet has a difference of ${formatValue(balance.difference, currency)}.`, 'detail']);
      }
      if (ledgerExport) {
        const adjustmentTotals = new Map<string, { debit: number; credit: number }>();
        for (const item of ledgerExport.adjustments) {
          if (item.status !== 'APPROVED') continue;
          const totals = adjustmentTotals.get(item.accountId) ?? { debit: 0, credit: 0 };
          totals[item.direction === 'DEBIT' ? 'debit' : 'credit'] += item.amount;
          adjustmentTotals.set(item.accountId, totals);
        }
        const ledgerRows = ledgerExport.accounts.map((account) => {
          const totals = adjustmentTotals.get(account.accountId) ?? { debit: 0, credit: 0 };
          const internal = totals.debit || totals.credit ? `Management debit ${formatValue(totals.debit, currency)} / credit ${formatValue(totals.credit, currency)}` : '—';
          const sourceStatus = account.reconciliationStatus === 'Matches Xero activity' ? 'Balance matched' : account.reconciliationStatus === 'Difference outstanding' ? 'Variance identified' : 'Evidence unavailable';
          return [account.accountCode ? `${account.accountCode} · ${account.accountName}` : account.accountName, account.classification, formatValue(account.sourceClosingBalance, currency), internal, formatValue(account.adjustedClosingBalance, currency), formatValue(account.unresolvedDifference, currency), sourceStatus, 'detail'];
        });
        sections.push({
          title: 'Period-end Ledger Review', subtitle: `${formatDate(fromDate)} to ${formatDate(toDate)}  |  Management adjustments are separate from Xero source balances`,
          headers: ['ACCOUNT', 'CLASSIFICATION', 'XERO BALANCE', 'MANAGEMENT ADJUSTMENT', 'PRO FORMA BALANCE', 'SOURCE VARIANCE', 'SOURCE STATUS'],
          rows: ledgerRows,
          layout: 'standard',
          tocEntries: [{ title: 'Period-end Ledger Review', description: 'Xero balances, management adjustments and source variances', rowIndex: 0 }],
        });
      }
      if (closingRows.length) sections.push({
        title: 'Management Summary',
        subtitle: `${orgName || 'Organisation'} | ${formatDate(fromDate)} to ${formatDate(toDate)} | ${currency || 'Currency not specified'}`,
        headers: ['SUMMARY'],
        rows: closingRows,
        layout: 'summary',
        tocEntries: [{ title: 'Management Summary', description: 'Key results and financial position', rowIndex: 0 }],
      });

      const drawFooter = (pageNumber: number, totalPages: number) => {
        doc.setDrawColor(220, 228, 235); doc.setLineWidth(0.25); doc.line(left, pageHeight - 16, right, pageHeight - 16);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
        doc.text('VIRTUAL CFO INTELLIGENCE  |  CONFIDENTIAL', left, pageHeight - 9);
        doc.text(`${pageNumber} of ${totalPages}`, right, pageHeight - 9, { align: 'right' });
      };

      const drawExpensePie = (centerX: number, centerY: number, radius: number) => {
        let startAngle = -Math.PI / 2;
        expenseMix.forEach((item) => {
          const sweep = (item.value / expenseMixTotal) * Math.PI * 2;
          const steps = Math.max(2, Math.ceil(sweep / (Math.PI / 24)));
          doc.setFillColor(...item.color);
          for (let step = 0; step < steps; step++) {
            const angle1 = startAngle + (sweep * step) / steps;
            const angle2 = startAngle + (sweep * (step + 1)) / steps;
            doc.triangle(
              centerX, centerY,
              centerX + radius * Math.cos(angle1), centerY + radius * Math.sin(angle1),
              centerX + radius * Math.cos(angle2), centerY + radius * Math.sin(angle2),
              'F'
            );
          }
          startAngle += sweep;
        });
        doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.35); doc.circle(centerX, centerY, radius, 'S');
      };

      const drawBalanceSheetDiagram = (top: number) => {
        const assets = bs.sourceSummary?.assets;
        const liabilities = bs.sourceSummary?.liabilities;
        const equity = bs.sourceSummary?.equity;
        const segments = [
          { label: 'Current assets', value: sum(bs.assets?.current), color: [99, 166, 205] as [number, number, number] },
          { label: 'Non-current assets', value: sum(bs.assets?.nonCurrent), color: [35, 91, 137] as [number, number, number] },
          { label: 'Current liabilities', value: sum(bs.liabilities?.current), color: [154, 164, 176] as [number, number, number] },
          { label: 'Non-current liabilities', value: sum(bs.liabilities?.nonCurrent), color: [187, 119, 57] as [number, number, number] },
          { label: 'Equity', value: sum(bs.equity), color: [77, 137, 124] as [number, number, number] },
        ];
        const assetParts = segments.slice(0, 2);
        const fundingParts = segments.slice(2);
        const assetsTotal = assetParts.reduce((total, item) => total + item.value, 0);
        const fundingTotal = fundingParts.reduce((total, item) => total + item.value, 0);
        if (assets == null || liabilities == null || equity == null || assets <= 0 || segments.some((item) => item.value < 0)
          || Math.abs(assetsTotal - assets) > 0.05 || Math.abs(fundingTotal - liabilities - equity) > 0.05) return top;

        const maxTotal = Math.max(assetsTotal, fundingTotal);
        const maxBarHeight = 25;
        const baseY = top + 39;
        const barWidth = 27;
        const assetX = left + 54;
        const fundingX = left + 119;
        const drawStack = (items: typeof segments, x: number, total: number, heading: string) => {
          let y = baseY;
          items.forEach((item) => {
            const height = maxBarHeight * item.value / maxTotal;
            if (height <= 0) return;
            y -= height;
            doc.setFillColor(...item.color); doc.rect(x, y, barWidth, height, 'F');
            if (height >= 6.5) {
              doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); doc.setTextColor(255, 255, 255);
              doc.text(formatValue(item.value, currency), x + barWidth / 2, y + height / 2 + 1, { align: 'center', maxWidth: barWidth - 2 });
            }
          });
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...navy);
          doc.text(formatValue(total, currency), x + barWidth / 2, baseY - maxBarHeight * total / maxTotal - 2.5, { align: 'center' });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...muted);
          doc.text(heading, x + barWidth / 2, baseY + 4, { align: 'center' });
        };

        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...navy);
        doc.text('Balance-sheet structure', left, top + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...muted);
        doc.text(`As at ${formatDate(toDate)}  |  Category totals from Xero`, left, top + 10);
        doc.setDrawColor(220, 228, 235); doc.setLineWidth(0.25); doc.line(left + 29, baseY, right - 27, baseY);
        drawStack(assetParts, assetX, assetsTotal, 'Assets');
        drawStack(fundingParts, fundingX, fundingTotal, 'Liabilities and equity');

        const legendItems = segments;
        const legendY = top + 47;
        const legendColWidth = tableWidth / 3;
        legendItems.forEach((item, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const x = left + col * legendColWidth;
          const y = legendY + row * 9;
          doc.setFillColor(...item.color); doc.rect(x, y - 1.8, 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.7); doc.setTextColor(...muted);
          doc.text(item.label, x + 4, y - 0.2, { maxWidth: legendColWidth - 5 });
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
          doc.text(formatValue(item.value, currency), x + 4, y + 3.2, { maxWidth: legendColWidth - 5 });
        });
        return top + 65;
      };

      const drawBalanceEquation = (top: number) => {
        const assets = bs.sourceSummary?.assets;
        const liabilities = bs.sourceSummary?.liabilities;
        const equity = bs.sourceSummary?.equity;
        if (assets == null || liabilities == null || equity == null) return top;
        const difference = assets - liabilities - equity;
        const isBalanced = Math.abs(difference) <= 0.05;
        const cardWidth = 46;
        const cardHeight = 15;
        const gap = 3;
        const symbolWidth = 5;
        const contentWidth = cardWidth * 3 + gap * 4 + symbolWidth * 2;
        const startX = left + (tableWidth - contentWidth) / 2;
        const cards = [
          { label: 'TOTAL ASSETS', value: assets, color: navy },
          { label: 'TOTAL LIABILITIES', value: liabilities, color: [112, 124, 139] as [number, number, number] },
          { label: 'TOTAL EQUITY', value: equity, color: [77, 137, 124] as [number, number, number] },
        ];
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...navy);
        doc.text('Balance-sheet equation', left, top + 4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.2); doc.setTextColor(...(isBalanced ? [5, 125, 91] as [number, number, number] : [180, 83, 9] as [number, number, number]));
        doc.text(isBalanced ? 'BALANCED' : `DIFFERENCE ${formatValue(difference, currency)}`, right, top + 4, { align: 'right' });
        let x = startX;
        cards.forEach((card, index) => {
          doc.setFillColor(...card.color); doc.roundedRect(x, top + 7, cardWidth, cardHeight, 1.2, 1.2, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.3); doc.setTextColor(224, 232, 239);
          doc.text(card.label, x + 2, top + 12, { maxWidth: cardWidth - 4 });
          doc.setFontSize(7.3); doc.setTextColor(255, 255, 255);
          doc.text(formatValue(card.value, currency), x + cardWidth / 2, top + 18, { align: 'center', maxWidth: cardWidth - 4 });
          x += cardWidth;
          if (index < cards.length - 1) {
            const symbol = index === 0 ? (isBalanced ? '=' : 'vs') : '+';
            doc.setFont('helvetica', 'bold'); doc.setFontSize(symbol === '=' ? 12 : 10); doc.setTextColor(...muted);
            doc.text(symbol, x + gap + symbolWidth / 2, top + 17, { align: 'center' });
            x += gap + symbolWidth + gap;
          }
        });
        return top + 26;
      };

      const drawProfitFlow = (top: number) => {
        const revenue = summary?.revenue;
        const grossProfit = summary?.grossProfit;
        const costOfSales = sum(pnl.cogs);
        const operatingExpenses = summary?.expenses;
        const netProfit = summary?.netProfit;
        const figures = [revenue, grossProfit, operatingExpenses, netProfit];
        if (figures.some((value) => value == null || value < 0) || revenue == null || revenue <= 0 || grossProfit == null || operatingExpenses == null || netProfit == null
          || Math.abs(revenue - costOfSales - grossProfit) > 0.05 || Math.abs(grossProfit - operatingExpenses - netProfit) > 0.05) return top;
        const stages = [
          { label: 'Revenue', note: 'Reported income', value: revenue, color: navy },
          { label: 'Gross profit', note: 'After cost of sales', value: grossProfit, color: [79, 94, 120] as [number, number, number] },
          { label: 'Net profit', note: 'After operating expenses', value: netProfit, color: [50, 128, 111] as [number, number, number] },
        ];
        const maxWidth = tableWidth - 18;
        const startX = left + 3;
        const maxBar = Math.max(1, revenue);
        const positions = [top + 8, top + 28, top + 48];
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...navy); doc.text('Profit bridge', left, top + 4);
        stages.forEach((stage, index) => {
          const width = Math.max(30, maxWidth * stage.value / maxBar);
          const y = positions[index];
          doc.setFillColor(...stage.color); doc.roundedRect(startX, y, width, 12, 1.6, 1.6, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3); doc.setTextColor(255, 255, 255);
          doc.text(stage.label, startX + 4, y + 5);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.3); doc.setTextColor(229, 236, 242);
          doc.text(stage.note, startX + 4, y + 9.2);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
          doc.text(formatValue(stage.value, currency), startX + width - 3, y + 7, { align: 'right' });
        });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); doc.setTextColor(...muted);
        doc.text(`− Cost of sales  ${formatValue(costOfSales, currency)}`, startX + 4, top + 23);
        doc.text(`− Operating expenses  ${formatValue(operatingExpenses, currency)}`, startX + 4, top + 43);
        return top + 63;
      };

      // Cover page: fill the entire page with the supplied photograph, with no overlays or added text.
      const coverImage = new Image();
      coverImage.src = '/management-accounts-cover.png';
      await coverImage.decode();
      const coverRatio = pageWidth / pageHeight;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = coverImage.naturalWidth;
      let sourceHeight = coverImage.naturalHeight;
      if (sourceWidth / sourceHeight > coverRatio) {
        sourceWidth = sourceHeight * coverRatio;
        sourceX = (coverImage.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = sourceWidth / coverRatio;
        sourceY = (coverImage.naturalHeight - sourceHeight) * 0.55;
      }
      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 1200;
      coverCanvas.height = Math.round(coverCanvas.width / coverRatio);
      const coverContext = coverCanvas.getContext('2d');
      if (!coverContext) throw new Error('Unable to prepare the PDF cover image.');
      coverContext.drawImage(coverImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, coverCanvas.width, coverCanvas.height);
      const coverGradient = coverContext.createLinearGradient(0, 0, 0, coverCanvas.height);
      coverGradient.addColorStop(0, 'rgba(15, 35, 68, 0.02)');
      coverGradient.addColorStop(0.55, 'rgba(15, 35, 68, 0.04)');
      coverGradient.addColorStop(1, 'rgba(15, 35, 68, 0.24)');
      coverContext.fillStyle = coverGradient;
      coverContext.fillRect(0, 0, coverCanvas.width, coverCanvas.height);
      doc.addImage(coverCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight);
      doc.setDrawColor(230, 235, 240); doc.setLineWidth(0.65); doc.rect(2.5, 2.5, pageWidth - 5, pageHeight - 5, 'S');

      // Reserve page 2 for an index populated only after every section has paginated.
      doc.addPage();
      const indexPage = doc.getNumberOfPages();
      const pageLocations = new Map<string, { start: number; end: number }>();
      doc.addPage();
      const overviewPage = doc.getNumberOfPages();
      pageLocations.set('Management Overview', { start: overviewPage, end: overviewPage });

      // The overview follows the contents and contains figures reported by the connected Xero organisation.
      doc.setFillColor(...navy); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setFillColor(...teal); doc.rect(0, 0, 5, 40, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(145, 211, 224);
      doc.text('VIRTUAL CFO INTELLIGENCE  /  MANAGEMENT ACCOUNTS', left, 14);
      doc.setFontSize(19); doc.setTextColor(255, 255, 255); doc.text('Management Overview', left, 30);
      doc.setFillColor(246, 249, 251); doc.setDrawColor(226, 232, 238); doc.roundedRect(left, 49, tableWidth, 29, 2, 2, 'FD');
      doc.setFillColor(...teal); doc.roundedRect(left, 49, 1.5, 29, 0.7, 0.7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...teal); doc.text('REPORTING PERIOD', left + 5, 57);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...navy); doc.text(`${formatDate(fromDate)}  to  ${formatDate(toDate)}`, left + 5, 68);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(...muted);
      doc.text(`Balance sheet as at ${formatDate(toDate)}`, right - 4, 58, { align: 'right' });
      doc.text(`Reporting currency  ${currency || 'Not available'}`, right - 4, 68, { align: 'right' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...teal); doc.text('EXECUTIVE FIGURES', left, 91);
      const figures: [string, number | undefined, [number, number, number]][] = [
        ['Revenue', summary?.revenue, navy], ['Gross profit', summary?.grossProfit, navy],
        ['Operating expenses', summary?.expenses, navy], ['Net profit', summary?.netProfit, [5, 125, 91]]
      ];
      figures.forEach(([label, value, color], index) => {
        const col = index % 2; const row = Math.floor(index / 2);
        const cardWidth = (tableWidth - 6) / 2; const x = left + col * (cardWidth + 6); const y = 97 + row * 27;
        doc.setFillColor(250, 251, 252); doc.setDrawColor(226, 232, 238); doc.roundedRect(x, y, cardWidth, 23, 1.6, 1.6, 'FD');
        doc.setFillColor(...color); doc.roundedRect(x, y, 1.3, 23, 0.6, 0.6, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...muted); doc.text(label.toUpperCase(), x + 4, y + 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...color); doc.text(formatValue(value, currency), x + 4, y + 17);
      });
      doc.setDrawColor(220, 228, 235); doc.line(left, 154, right, 154);
      doc.setFillColor(250, 251, 252); doc.setDrawColor(231, 236, 240); doc.roundedRect(left, 160, tableWidth, 51, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...teal); doc.text('EXPENSE MIX', left + 4, 168);
      if (expenseMix.length && expenseMixTotal > 0) {
        drawExpensePie(left + 17, 187, 10);
        expenseMix.forEach((item, index) => {
          const y = 176 + index * 8;
          doc.setFillColor(...item.color); doc.circle(left + 34, y - 1, 1.2, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...muted);
          doc.text(item.label, left + 38, y + 0.5, { maxWidth: 38 });
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
          doc.text(`${((item.value / expenseMixTotal) * 100).toFixed(0)}%`, left + 82, y + 0.5, { align: 'right' });
        });
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
        doc.text('No expense breakdown is available for this period.', left + 4, 187);
      }
      doc.setDrawColor(220, 228, 235); doc.line(left + 96, 165, left + 96, 205);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...teal); doc.text('PROFIT MARGINS', left + 105, 168);
      if (summary) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
        doc.text('Gross margin', left + 105, 183);
        doc.text('Net margin', left + 105, 198);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...navy);
        doc.text(summary.grossProfitMargin == null ? 'Not available' : `${summary.grossProfitMargin.toFixed(1)}%`, right - 4, 183, { align: 'right' });
        doc.setTextColor(...(summary.netProfit >= 0 ? [5, 125, 91] as [number, number, number] : [190, 24, 93] as [number, number, number]));
        doc.text(summary.profitMargin == null ? 'Not available' : `${summary.profitMargin.toFixed(1)}%`, right - 4, 198, { align: 'right' });
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
      doc.text(`Source: Xero  |  Prepared ${new Date().toLocaleString()}`, left, 217);
      if (summary) {
        doc.setDrawColor(220, 228, 235); doc.line(left, 223, right, 223);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...teal); doc.text('FINANCIAL PROFILE', left, 231);
        const profile = [
          { label: 'Revenue', value: summary.revenue, color: navy },
          { label: 'Gross profit', value: summary.grossProfit, color: teal },
          { label: 'Operating expenses', value: summary.expenses, color: [217, 119, 6] as [number, number, number] },
          { label: 'Net profit', value: summary.netProfit, color: summary.netProfit >= 0 ? [5, 125, 91] as [number, number, number] : [190, 24, 93] as [number, number, number] },
        ];
        const largest = Math.max(1, ...profile.map((item) => Math.abs(item.value)));
        const trackX = left + 45;
        const trackWidth = tableWidth - 88;
        profile.forEach((item, index) => {
          const y = 239 + index * 8;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(...muted);
          doc.text(item.label, left, y + 1.5);
          doc.setFillColor(241, 245, 248); doc.roundedRect(trackX, y - 1.2, trackWidth, 2.6, 1.1, 1.1, 'F');
          doc.setFillColor(...item.color); doc.roundedRect(trackX, y - 1.2, Math.max(1.5, trackWidth * Math.abs(item.value) / largest), 2.6, 1.1, 1.1, 'F');
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
          doc.text(formatValue(item.value, currency), right, y + 1.5, { align: 'right' });
        });
      }
      let currentY = pageHeight;
      let currentBodyStart = pageHeight;
      const columnWidths = (headers: string[]) => headers[0] === 'MEASURE'
        ? headers.length === 8 ? [28, 22, 23, 18, 23, 18, 22, 20] : [32, 29, 29, 27, 32, 25]
        : headers.length === 4
        ? [40, (tableWidth - 40) / 3, (tableWidth - 40) / 3, (tableWidth - 40) / 3]
        : headers.length === 5 ? [34, (tableWidth - 34) / 4, (tableWidth - 34) / 4, (tableWidth - 34) / 4, (tableWidth - 34) / 4]
        : headers.length === 1 ? [tableWidth] : headers[0] === 'CONTROL' ? [tableWidth * 0.42, tableWidth * 0.58] : [tableWidth * 0.72, tableWidth * 0.28];
      const rowHeightFor = (section: PdfSection, row: string[]) => {
        const kind = row[row.length - 1];
        const values = ['group', 'detail', 'total', 'subtotal', 'flag', 'comparison'].includes(kind) ? row.slice(0, -1) : row;
        if (section.layout === 'balance-sheet' && kind === 'group') return 8.6;
        if (section.layout === 'balance-sheet' && kind === 'total') return 8.2;
        doc.setFont('helvetica', kind === 'group' || kind === 'total' || kind === 'subtotal' || kind === 'flag' ? 'bold' : 'normal');
        doc.setFontSize(kind === 'group' ? 8.2 : 8.6);
        const widths = columnWidths(section.headers);
        if (kind === 'comparison') doc.setFontSize(7.2);
        const lineCounts = values.map((value, column) => (doc.splitTextToSize(value, Math.max(14, (widths[column] ?? widths[0] ?? tableWidth) - 10)) as string[]).length);
        return Math.max(7.2, Math.max(1, ...lineCounts) * 4.1 + 3.1);
      };
      const drawTableHeader = (section: PdfSection, top: number) => {
        const widths = columnWidths(section.headers);
        if (section.layout === 'summary') {
          doc.setFillColor(239, 248, 247); doc.rect(left, top, tableWidth, 8, 'F');
          doc.setTextColor(...navy);
        } else if (section.layout === 'statement' || section.layout === 'metrics') {
          doc.setFillColor(241, 245, 248); doc.rect(left, top, tableWidth, 8, 'F');
          doc.setTextColor(...navy);
        } else if (section.layout === 'exposures') {
          doc.setFillColor(255, 241, 242); doc.rect(left, top, tableWidth, 8, 'F');
          doc.setTextColor(...navy);
        } else {
          doc.setFillColor(...navy); doc.rect(left, top, tableWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(section.layout === 'comparison' ? 6.7 : 7.2);
        let x = left + 4;
        section.headers.forEach((header, column) => {
          const isText = column === 0;
          doc.text(header, isText ? x : x + widths[column] - 8, top + 5.3, { align: isText ? 'left' : 'right' });
          x += widths[column];
        });
        doc.setDrawColor(...(section.layout === 'statement' ? navy : [210, 220, 228] as [number, number, number]));
        doc.setLineWidth(section.layout === 'statement' ? 0.45 : 0.25);
        doc.line(left, top + 8, right, top + 8);
        if (section.layout === 'comparison' || section.layout === 'statement') {
          const dividerColumns = section.layout === 'comparison' ? (section.headers.length === 8 ? [1, 3, 5] : [1, 3]) : [0];
          let boundary = left;
          widths.forEach((width, column) => {
            boundary += width;
            if (dividerColumns.includes(column)) {
              doc.setDrawColor(203, 213, 223); doc.setLineWidth(0.22); doc.line(boundary, top, boundary, top + 8);
            }
          });
        }
        return top + 11;
      };
      const drawSectionCards = (section: PdfSection, top: number) => {
        const cards = section.summaryCards || [];
        if (!cards.length) return top;
        const gap = 3;
        const cardWidth = (tableWidth - gap * (cards.length - 1)) / cards.length;
        const cardHeight = 21;
        cards.forEach((card, index) => {
          const x = left + index * (cardWidth + gap);
          doc.setFillColor(248, 250, 252); doc.setDrawColor(220, 228, 235); doc.setLineWidth(0.25);
          doc.roundedRect(x, top, cardWidth, cardHeight, 1.5, 1.5, 'FD');
          doc.setFillColor(...teal); doc.roundedRect(x, top, 1.4, cardHeight, 0.7, 0.7, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...muted);
          doc.text(card.label.toUpperCase(), x + 4, top + 6);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(cards.length === 3 ? 10.2 : 9.5); doc.setTextColor(...navy);
          doc.text(card.value, x + 4, top + 13.5, { maxWidth: cardWidth - 7 });
          if (card.detail) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...teal);
            doc.text(card.detail, x + 4, top + 18.2);
          }
        });
        return top + cardHeight;
      };
      const startSectionPage = (section: PdfSection, continued: boolean) => {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3); doc.setTextColor(...teal);
        doc.text('VIRTUAL CFO INTELLIGENCE  /  MANAGEMENT ACCOUNTS', left, 11);
        doc.setDrawColor(220, 228, 235); doc.line(left, 15, right, 15);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...navy);
        doc.text(continued ? `${section.title}  —  Continued` : section.title, left, 26);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); doc.text(section.subtitle, left, 33);
        if (!continued && (section.layout === 'statement' || section.layout === 'balance-sheet')) {
          const cardsBottom = drawSectionCards(section, 41);
          const diagramBottom = section.layout === 'balance-sheet'
            ? drawBalanceEquation(drawBalanceSheetDiagram(cardsBottom + 4) + 2) + 2
            : cardsBottom;
          currentBodyStart = drawTableHeader(section, diagramBottom + 4);
        } else if (!continued && section.layout === 'profit-flow') {
          currentBodyStart = drawTableHeader(section, drawProfitFlow(41) + 4);
        } else if (!continued && section.layout === 'summary') {
          currentBodyStart = drawSectionCards(section, 41) + 6;
        } else {
          currentBodyStart = drawTableHeader(section, 40);
        }
        currentY = currentBodyStart;
      };
      const startSectionOnCurrentPage = (section: PdfSection) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...navy);
        doc.text(section.title, left, currentY + 8);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...muted);
        doc.text(section.subtitle, left, currentY + 14);
        currentBodyStart = drawTableHeader(section, currentY + 18);
        currentY = currentBodyStart;
      };

      for (const section of sections) {
        const firstRowHeight = section.rows.length ? rowHeightFor(section, section.rows[0]) : 0;
        const sectionSpacing = 12;
        if (section.layout === 'statement' || section.layout === 'balance-sheet' || section.layout === 'profit-flow' || section.layout === 'summary' || currentY >= pageHeight || currentY + sectionSpacing + 30 + firstRowHeight > contentBottom) startSectionPage(section, false);
        else {
          currentY += sectionSpacing;
          startSectionOnCurrentPage(section);
        }

        const widths = columnWidths(section.headers);
        const tocStartPages = new Map<string, number>();
        const tocEndPages = new Map<string, number>();
        let activeTocEntry: TocEntry | undefined;
        let previousRowPage: number | undefined;

        for (let rowIndex = 0; rowIndex < section.rows.length; rowIndex++) {
          const row = section.rows[rowIndex];
          const kind = row[row.length - 1];
          const values = ['group', 'detail', 'total', 'subtotal', 'flag', 'comparison'].includes(kind) ? row.slice(0, -1) : row;
          const rowHeight = rowHeightFor(section, row);
          const nextRow = section.rows[rowIndex + 1];
          const keepWithNext = Boolean(nextRow && (kind === 'group' || nextRow[nextRow.length - 1] === 'total'));
          const pairHeight = keepWithNext ? rowHeight + rowHeightFor(section, nextRow!) : rowHeight;
          if (currentY + pairHeight > contentBottom && currentY > currentBodyStart + 0.1) startSectionPage(section, true);
          const startingTocEntry = section.tocEntries.find((entry) => entry.rowIndex === rowIndex);
          if (startingTocEntry) {
            if (activeTocEntry && previousRowPage !== undefined) tocEndPages.set(activeTocEntry.title, previousRowPage);
            activeTocEntry = startingTocEntry;
            if (!tocStartPages.has(startingTocEntry.title)) tocStartPages.set(startingTocEntry.title, doc.getNumberOfPages());
          }

          if (kind === 'total') {
            if (section.layout === 'balance-sheet') {
              doc.setFillColor(187, 119, 57); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
            } else {
              const totalColor = section.layout === 'statement' ? navy : teal;
              doc.setDrawColor(...totalColor); doc.setLineWidth(section.layout === 'statement' ? 0.55 : 0.45); doc.line(left, currentY, right, currentY);
              doc.setFillColor(section.layout === 'statement' ? 245 : 239, section.layout === 'statement' ? 248 : 248, section.layout === 'statement' ? 251 : 247); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
            }
          } else if (kind === 'subtotal') {
            doc.setDrawColor(210, 220, 228); doc.setLineWidth(0.25); doc.line(left, currentY, right, currentY);
            doc.setFillColor(248, 250, 252); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
          } else if (kind === 'detail' && rowIndex % 2 === 0) {
            doc.setFillColor(249, 251, 252); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
          } else if (kind === 'flag') {
            doc.setFillColor(255, 241, 242); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
          } else if (kind === 'group') {
            if (section.layout === 'balance-sheet' && ['Assets', 'Liabilities', 'Equity'].includes(values[0])) doc.setFillColor(...navy);
            else if (section.layout === 'balance-sheet') doc.setFillColor(246, 235, 218);
            else if (section.layout === 'exposures') doc.setFillColor(255, 247, 247);
            else doc.setFillColor(245, 248, 251);
            doc.rect(left, currentY, tableWidth, rowHeight, 'F');
          } else if (kind === 'comparison' && rowIndex % 2 === 0) {
            doc.setFillColor(248, 250, 252); doc.rect(left, currentY, tableWidth, rowHeight, 'F');
          }
          if (section.layout === 'summary' && kind === 'detail') {
            doc.setDrawColor(220, 229, 234); doc.setLineWidth(0.22); doc.setFillColor(255, 255, 255);
            doc.roundedRect(left + 0.8, currentY + 0.35, tableWidth - 1.6, rowHeight - 0.7, 1.2, 1.2, 'FD');
            doc.setDrawColor(...teal); doc.setLineWidth(0.7); doc.line(left + 1.2, currentY + 1, left + 1.2, currentY + rowHeight - 1);
          }
          doc.setFont('helvetica', kind === 'group' || kind === 'total' || kind === 'subtotal' || kind === 'flag' ? 'bold' : 'normal');
          doc.setFontSize(kind === 'comparison' ? 7.2 : kind === 'group' ? 8.2 : 8.6);
          const primaryBalanceGroup = section.layout === 'balance-sheet' && kind === 'group' && ['Assets', 'Liabilities', 'Equity'].includes(values[0]);
          const balanceSheetTotal = section.layout === 'balance-sheet' && kind === 'total';
          const balanceSheetSubgroup = section.layout === 'balance-sheet' && kind === 'group' && !primaryBalanceGroup;
          doc.setTextColor(...(primaryBalanceGroup || balanceSheetTotal ? [255, 255, 255] as [number, number, number] : balanceSheetSubgroup ? [153, 89, 34] as [number, number, number] : kind === 'group' ? navy : kind === 'flag' ? [190, 24, 93] as [number, number, number] : navy));
          let x = left + 4;
          values.forEach((value, column) => {
            const isText = column === 0;
            if (kind === 'comparison') {
              doc.setFont('helvetica', column === 0 || column === 1 ? 'bold' : 'normal');
              doc.setTextColor(...([3, 5, 7].includes(column) ? teal : column === 0 ? navy : muted));
            }
            const indent = isText && ((section.indentDetails && kind === 'detail') || (section.layout === 'summary' && kind === 'detail')) ? 3 : 0;
            const columnWidth = widths[column] ?? widths[0] ?? tableWidth;
            const maxWidth = Math.max(14, columnWidth - 9 - indent);
            const lines = doc.splitTextToSize(value, maxWidth) as string[];
            const position = isText ? x + indent : x + columnWidth - 8;
            doc.text(lines, position, currentY + 4.9, { align: isText ? 'left' : 'right' });
            x += widths[column];
          });
          doc.setDrawColor(204, 215, 225); doc.setLineWidth(section.layout === 'statement' ? 0.4 : 0.42); doc.line(left, currentY + rowHeight, right, currentY + rowHeight);
          if (section.layout === 'comparison' || section.layout === 'statement') {
            const dividerColumns = section.layout === 'comparison' ? (section.headers.length === 8 ? [1, 3, 5] : [1, 3]) : [0];
            let boundary = left;
            widths.forEach((width, column) => {
              boundary += width;
              if (dividerColumns.includes(column)) {
                doc.setDrawColor(222, 228, 234); doc.setLineWidth(0.2); doc.line(boundary, currentY, boundary, currentY + rowHeight);
              }
            });
          }
          currentY += rowHeight;
          previousRowPage = doc.getNumberOfPages();
          if (activeTocEntry) tocEndPages.set(activeTocEntry.title, previousRowPage);
        }
        const sectionEndPage = doc.getNumberOfPages();
        section.tocEntries.forEach((entry) => {
          const startPage = tocStartPages.get(entry.title) ?? sectionEndPage;
          const endPage = tocEndPages.get(entry.title) ?? sectionEndPage;
          pageLocations.set(entry.title, { start: startPage, end: endPage });
        });
      }

      // Build the contents from the completed pagination so every reference is current.
      doc.setPage(indexPage);
      doc.setFillColor(...navy); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setFillColor(...teal); doc.rect(0, 0, 5, 40, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(145, 211, 224);
      doc.text('VIRTUAL CFO INTELLIGENCE  /  REPORT GUIDE', left, 14);
      doc.setFontSize(19); doc.setTextColor(255, 255, 255); doc.text('Contents', left, 30);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(222, 231, 239);
      doc.text(`${formatDate(fromDate)} to ${formatDate(toDate)}  |  ${currency || 'Currency not specified'}`, right, 30, { align: 'right' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...muted);
      doc.text('SECTION', left, 54); doc.text('PAGE', right, 54, { align: 'right' });
      let indexY = 65;
      const indexEntries: TocEntry[] = [
        { title: 'Management Overview', description: 'Reporting period, key figures and expense mix', rowIndex: 0 },
        ...sections.flatMap((section) => section.tocEntries)
      ];
      indexEntries.forEach((entry, index) => {
        const pages = pageLocations.get(entry.title);
        const pageText = pages ? (pages.start === pages.end ? String(pages.start) : `${pages.start}–${pages.end}`) : '—';
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...navy);
        const titleWidth = doc.getTextWidth(entry.title);
        doc.text(String(index + 1).padStart(2, '0'), left, indexY);
        doc.text(entry.title, left + 12, indexY);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...teal);
        doc.text(entry.description, left + 12, indexY + 5.5);
        const leaderStart = Math.min(right - 29, left + 14 + titleWidth);
        doc.setDrawColor(204, 216, 225); doc.setLineWidth(0.25); doc.line(leaderStart, indexY - 1, right - 25, indexY - 1);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...teal);
        doc.text(pageText, right, indexY, { align: 'right' });
        doc.setDrawColor(231, 236, 240); doc.line(left, indexY + 10, right, indexY + 10);
        indexY += 18;
      });

      const totalPages = doc.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        doc.setPage(pageNumber);
        if (pageNumber > 1) drawFooter(pageNumber, totalPages);
      }
      const safeOrg = (orgName || 'Xero').replace(/[^a-z0-9-]+/gi, '_');
      doc.save(`Management_Accounts_${safeOrg}_${fromDate}_to_${toDate}.pdf`);
    } catch (cause) {
      console.error('Management Accounts PDF export failed:', cause);
      toast.error('The PDF could not be created. Please try again.');
    } finally { setExporting(null); }
  };
  const downloadExcel = async () => {
    if (loading || exporting) return;
    setExporting('excel');
    try {
      const ledgerExport = await fetchLedgerExport(fromDate, toDate);
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Virtual CFO'; workbook.created = new Date(); workbook.modified = new Date();
      const navyFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F2344' } };
      const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: navyFill, alignment: { vertical: 'middle' as const } };
      const moneyFormat = `#,##0.00;[Red](#,##0.00);-`;
      const addTitle = (sheet: import('exceljs').Worksheet, title: string, lastCol: number) => {
        sheet.mergeCells(1, 1, 1, lastCol); const cell = sheet.getCell(1, 1); cell.value = title; cell.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = navyFill; cell.alignment = { vertical: 'middle' }; sheet.getRow(1).height = 30;
        sheet.mergeCells(2, 1, 2, lastCol); sheet.getCell(2, 1).value = `${orgName || 'Your organisation'}  |  ${formatDate(fromDate)} to ${formatDate(toDate)}  |  ${currency || 'Currency not specified'}`; sheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };
        sheet.views = [{ state: 'frozen', ySplit: 4 }]; sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      };
      const index = workbook.addWorksheet('Contents');
      addTitle(index, 'MANAGEMENT ACCOUNTS  |  REPORT INDEX', 3);
      index.addRow([]); index.addRow(['Section', 'Worksheet', 'Source / period']);
      index.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
      const sheetIndex: [string, string, string][] = [['Executive Summary', 'Summary', 'Xero Profit & Loss and Balance Sheet']];
      if (hasPnl) sheetIndex.push(['Profit & Loss Detail', 'P&L Detail', `Xero P&L  |  ${fromDate} to ${toDate}`], ['Monthly Performance', 'Monthly Trend', 'Monthly Xero P&L reports']);
      if (hasBalance) sheetIndex.push(['Balance Sheet Snapshot', 'Balance Sheet', `Xero Balance Sheet  |  ${toDate}`]);
      if (hasPnl && analysis?.comparisons && (analysis.comparisons.previousPeriod.available || analysis.comparisons.priorYear.available || analysis.comparisons.budget?.available)) sheetIndex.push(['Performance Comparisons', 'Comparisons', `Selected period  |  ${fromDate} to ${toDate}`]);
      if (advanced?.cashMovement?.available) sheetIndex.push(['Actual Cash Movement', 'Cash Movement', `Xero Bank Summary  |  ${fromDate} to ${toDate}`]);
      if (advanced?.balanceMovement?.available) sheetIndex.push(['Balance-Sheet Movement', 'BS Movement', `${advanced.balanceMovement.previousDate} to ${advanced.balanceMovement.currentDate}`]);
      if (advanced?.closeReview) sheetIndex.push(['Month-End Close Review', 'Close Review', `Evidence checked ${new Date(advanced.closeReview.checkedAt).toLocaleString()}`]);
      if (ledgerExport) sheetIndex.push(['Period-end Ledger Review', 'Ledger Closing', `Xero balances and management adjustments  |  ${fromDate} to ${toDate}`]);
      sheetIndex.forEach((row) => index.addRow(row));
      index.columns = [{ width: 30 }, { width: 24 }, { width: 48 }]; index.autoFilter = 'A4:C4';

      const summarySheet = workbook.addWorksheet('Summary'); addTitle(summarySheet, 'EXECUTIVE SUMMARY', 3);
      summarySheet.addRow([]); summarySheet.addRow(['Measure', 'Value', 'Notes']); summarySheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
      const summaryRows: (string | number | null)[][] = [
        ['Revenue', summary?.revenue ?? null, 'Xero P&L report'], ['Gross profit', summary?.grossProfit ?? null, 'Xero P&L report'],
        ['Gross margin', summary?.grossProfitMargin ?? null, 'Percent of revenue'], ['Operating expenses', summary?.expenses ?? null, 'Xero P&L report'],
        ['Net profit', summary?.netProfit ?? null, 'Xero P&L report'], ['Net margin', summary?.profitMargin ?? null, 'Percent of revenue'],
        ['Cash & bank', cash, hasBalance ? 'Balance sheet' : 'Not available'], ['Receivables', receivables, hasBalance ? 'Balance sheet' : 'Not available'],
        ['Payables', payables, hasBalance ? 'Balance sheet' : 'Not available'],
        ['Total assets', bs.sourceSummary?.assets ?? null, 'Balance sheet total'],
        ['Total liabilities', bs.sourceSummary?.liabilities ?? null, 'Balance sheet total'],
        ['Total equity', bs.sourceSummary?.equity ?? null, 'Balance sheet total'],
        ['Net working capital', bs.sourceSummary?.workingCapital?.netWorkingCapital ?? null, 'Current assets less current liabilities'],
        ['Current ratio', bs.sourceSummary?.workingCapital?.currentRatio ?? null, 'Current assets divided by current liabilities'],
        ['Receivables / payables', bs.sourceSummary?.workingCapital?.receivablesToPayables ?? null, 'Calculated from balance sheet figures'],
        ['Cash / payables', bs.sourceSummary?.workingCapital?.cashToPayables ?? null, 'Calculated from balance sheet figures'],
        ['Balance status', balance?.isBalanced == null ? 'Not available' : balance.isBalanced ? 'Balanced' : 'Review required', `As of ${toDate}`]
      ];
      summaryRows.forEach((row) => {
        const added = summarySheet.addRow(row);
        if (typeof row[1] !== 'number') return;
        if (row[0] === 'Gross margin' || row[0] === 'Net margin') added.getCell(2).numFmt = '0.0"%"';
        else if (row[0] === 'Current ratio' || row[0] === 'Receivables / payables' || row[0] === 'Cash / payables') added.getCell(2).numFmt = '0.00x';
        else added.getCell(2).numFmt = moneyFormat;
      });
      summarySheet.columns = [{ width: 28 }, { width: 22 }, { width: 35 }]; summarySheet.autoFilter = 'A4:C4';

      if (ledgerExport) {
        const ledgerSheet = workbook.addWorksheet('Ledger Closing');
        addTitle(ledgerSheet, 'PERIOD-END LEDGER REVIEW — XERO SOURCE FIGURES', 14);
        ledgerSheet.addRow([]);
        ledgerSheet.addRow(['Account code', 'Account name', 'Classification', 'Opening balance', 'Xero debits', 'Xero credits', 'Net movement', 'Approved management debit', 'Approved management credit', 'Xero closing balance', 'Pro forma balance (unposted)', 'Source variance', 'Source status', 'Management adjustment references']);
        ledgerSheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        const approvedByAccount = new Map<string, { debit: number; credit: number; references: string[] }>();
        for (const adjustment of ledgerExport.adjustments) {
          const current = approvedByAccount.get(adjustment.accountId) ?? { debit: 0, credit: 0, references: [] };
          if (adjustment.status === 'APPROVED') {
            current[adjustment.direction === 'DEBIT' ? 'debit' : 'credit'] += adjustment.amount;
            current.references.push(adjustment.adjustmentRef);
          }
          approvedByAccount.set(adjustment.accountId, current);
        }
        for (const account of ledgerExport.accounts) {
          const adjustment = approvedByAccount.get(account.accountId) ?? { debit: 0, credit: 0, references: [] };
          const sourceStatus = account.reconciliationStatus === 'Matches Xero activity' ? 'Balance matched' : account.reconciliationStatus === 'Difference outstanding' ? 'Variance identified' : 'Evidence unavailable';
          ledgerSheet.addRow([account.accountCode, account.accountName, account.classification, account.openingBalance, account.totalDebits, account.totalCredits, account.netMovement, adjustment.debit, adjustment.credit, account.sourceClosingBalance, account.adjustedClosingBalance, account.unresolvedDifference, sourceStatus, adjustment.references.join(', ') || (account.pendingAdjustmentCount ? 'Pending approval' : '')]);
        }
        ledgerSheet.eachRow((row, rowNumber) => { if (rowNumber > 4) for (let column = 4; column <= 12; column += 1) row.getCell(column).numFmt = moneyFormat; });
        ledgerSheet.columns = [{ width: 15 }, { width: 32 }, { width: 20 }, ...Array.from({ length: 9 }, () => ({ width: 20 })), { width: 32 }, { width: 38 }];
        ledgerSheet.autoFilter = `A4:N${ledgerSheet.rowCount}`;
      }

      const comparisons = analysis?.comparisons;
      if (hasPnl && summary && comparisons && (comparisons.previousPeriod.available || comparisons.priorYear.available || comparisons.budget?.available)) {
        const compareSheet = workbook.addWorksheet('Comparisons');
        addTitle(compareSheet, 'PERFORMANCE COMPARISONS', 8);
        compareSheet.addRow([]);
        compareSheet.addRow(['Measure', 'Selected period', 'Previous period', 'Change vs previous', 'Same period last year', 'Change vs last year', 'Xero budget', 'Variance to budget']);
        compareSheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        const comparisonValues: (string | number | null)[][] = [
          ['Revenue', summary.revenue, comparisons.previousPeriod.available ? comparisons.previousPeriod.totals?.revenue ?? null : null, comparisons.previousPeriod.available ? summary.revenue - (comparisons.previousPeriod.totals?.revenue ?? summary.revenue) : null, comparisons.priorYear.available ? comparisons.priorYear.totals?.revenue ?? null : null, comparisons.priorYear.available ? summary.revenue - (comparisons.priorYear.totals?.revenue ?? summary.revenue) : null, comparisons.budget?.available ? comparisons.budget.revenue : null, comparisons.budget?.available ? summary.revenue - comparisons.budget.revenue : null],
          ['Gross profit', summary.grossProfit, comparisons.previousPeriod.available ? comparisons.previousPeriod.totals?.grossProfit ?? null : null, comparisons.previousPeriod.available ? summary.grossProfit - (comparisons.previousPeriod.totals?.grossProfit ?? summary.grossProfit) : null, comparisons.priorYear.available ? comparisons.priorYear.totals?.grossProfit ?? null : null, comparisons.priorYear.available ? summary.grossProfit - (comparisons.priorYear.totals?.grossProfit ?? summary.grossProfit) : null, comparisons.budget?.available ? comparisons.budget.grossProfit : null, comparisons.budget?.available ? summary.grossProfit - comparisons.budget.grossProfit : null],
          ['Operating expenses', summary.expenses, comparisons.previousPeriod.available ? comparisons.previousPeriod.totals?.operatingExpenses ?? null : null, comparisons.previousPeriod.available ? summary.expenses - (comparisons.previousPeriod.totals?.operatingExpenses ?? summary.expenses) : null, comparisons.priorYear.available ? comparisons.priorYear.totals?.operatingExpenses ?? null : null, comparisons.priorYear.available ? summary.expenses - (comparisons.priorYear.totals?.operatingExpenses ?? summary.expenses) : null, comparisons.budget?.available ? comparisons.budget.operatingExpenses : null, comparisons.budget?.available ? summary.expenses - comparisons.budget.operatingExpenses : null],
          ['Net profit', summary.netProfit, comparisons.previousPeriod.available ? comparisons.previousPeriod.totals?.netProfit ?? null : null, comparisons.previousPeriod.available ? summary.netProfit - (comparisons.previousPeriod.totals?.netProfit ?? summary.netProfit) : null, comparisons.priorYear.available ? comparisons.priorYear.totals?.netProfit ?? null : null, comparisons.priorYear.available ? summary.netProfit - (comparisons.priorYear.totals?.netProfit ?? summary.netProfit) : null, comparisons.budget?.available ? comparisons.budget.netProfit : null, comparisons.budget?.available ? summary.netProfit - comparisons.budget.netProfit : null],
        ];
        comparisonValues.forEach((row) => { const added = compareSheet.addRow(row); for (let column = 2; column <= 8; column++) added.getCell(column).numFmt = moneyFormat; });
        compareSheet.columns = [{ width: 25 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 25 }, { width: 22 }, { width: 20 }, { width: 20 }];
        compareSheet.autoFilter = `A4:H${compareSheet.rowCount}`;
        compareSheet.getCell('B2').value = `${orgName || 'Your organisation'}  |  ${formatDate(fromDate)} to ${formatDate(toDate)}  |  Previous: ${comparisons.previousPeriod.fromDate} to ${comparisons.previousPeriod.toDate}  |  Prior year: ${comparisons.priorYear.fromDate} to ${comparisons.priorYear.toDate}`;
      }

      if (hasPnl) {
        const detail = workbook.addWorksheet('P&L Detail'); addTitle(detail, 'PROFIT & LOSS DETAIL', 4); detail.addRow([]); detail.addRow(['Section', 'Account', 'Amount', '% of Revenue']); detail.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        const addDetail = (section: string, lines: Line[], total: number) => { const row = detail.addRow([section, `Total ${section}`, total, summary?.revenue ? total / summary.revenue : null]); row.font = { bold: true }; row.getCell(3).numFmt = moneyFormat; row.getCell(4).numFmt = '0.0%'; lines.forEach((line) => { const item = detail.addRow([section, line.name, line.value, summary?.revenue ? line.value / summary.revenue : null]); item.getCell(3).numFmt = moneyFormat; item.getCell(4).numFmt = '0.0%'; }); };
        addDetail('Revenue', pnl.income?.operating || [], sum(pnl.income?.operating)); addDetail('Cost of sales', pnl.cogs || [], sum(pnl.cogs));
        detail.addRow(['Summary', 'Gross profit', summary?.grossProfit ?? null, summary?.grossProfitMargin != null ? summary.grossProfitMargin / 100 : null]);
        addDetail('Operating expenses', pnl.expenses?.operating || [], sum(pnl.expenses?.operating)); addDetail('Other income', pnl.income?.other || [], sum(pnl.income?.other)); addDetail('Other expenses', pnl.expenses?.other || [], sum(pnl.expenses?.other));
        detail.addRow(['Summary', 'Net profit', summary?.netProfit ?? null, summary?.profitMargin != null ? summary.profitMargin / 100 : null]);
        detail.eachRow((row, number) => { if (number > 4 && row.getCell(3).value !== null) row.getCell(3).numFmt = moneyFormat; if (number > 4) row.getCell(4).numFmt = '0.0%'; });
        detail.columns = [{ width: 25 }, { width: 48 }, { width: 20 }, { width: 18 }]; detail.autoFilter = `A4:D${detail.rowCount}`;

        const monthly = workbook.addWorksheet('Monthly Trend'); addTitle(monthly, 'MONTHLY PERFORMANCE', 4); monthly.addRow([]); monthly.addRow(['Month', 'Revenue', 'Total costs', 'Net Profit']); monthly.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        availableTrends.forEach((item) => { const row = monthly.addRow([item.month, item.revenue, item.expenses, item.netProfit]); [2, 3, 4].forEach((column) => { row.getCell(column).numFmt = moneyFormat; }); });
        if (!availableTrends.length) monthly.addRow(['No monthly results are available for this period.']); monthly.columns = [{ width: 22 }, { width: 20 }, { width: 20 }, { width: 20 }]; monthly.autoFilter = `A4:D${monthly.rowCount}`;
      }
      if (hasBalance) {
        const sheet = workbook.addWorksheet('Balance Sheet'); addTitle(sheet, `BALANCE SHEET  |  AS OF ${toDate}`, 4); sheet.addRow([]); sheet.addRow(['Category', 'Account / contact', 'Balance', 'Review flag']); sheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        const addBalanceRow = (category: string, line: Line, id: string) => {
          const flagRank = topBalanceFlags.findIndex((account) => account.id === id);
          const added = sheet.addRow([category, line.name, line.value, flagRank >= 0 ? `Priority ${flagRank + 1}` : '']);
          added.getCell(3).numFmt = moneyFormat;
          if (flagRank >= 0) { added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } }; added.font = { color: { argb: 'FF9F1239' }, bold: true }; }
        };
        (bs.assets?.current || []).forEach((line, index) => addBalanceRow('Current assets', line, `current-asset-${index}`));
        (bs.assets?.nonCurrent || []).forEach((line, index) => addBalanceRow('Non-current assets', line, `non-current-asset-${index}`));
        (bs.liabilities?.current || []).forEach((line, index) => addBalanceRow('Current liabilities', line, `current-liability-${index}`));
        (bs.liabilities?.nonCurrent || []).forEach((line, index) => addBalanceRow('Non-current liabilities', line, `non-current-liability-${index}`));
        (bs.equity || []).forEach((line, index) => addBalanceRow('Equity', line, `equity-${index}`));
        unclassifiedBalanceAccounts.forEach((account) => addBalanceRow(account.category, account.line, account.id));
        if (hasReceivableDetails) receivableEntries.forEach((entry) => addBalanceRow('Receivables by customer', { name: entry.name, value: entry.value }, entry.id));
        if (hasPayableDetails) payableEntries.forEach((entry) => addBalanceRow('Payables by supplier', { name: entry.name, value: entry.value }, entry.id));
        sheet.columns = [{ width: 28 }, { width: 48 }, { width: 22 }, { width: 18 }]; sheet.autoFilter = `A4:D${sheet.rowCount}`;
      }
      if (advanced?.cashMovement?.available) {
        const movement = advanced.cashMovement;
        const sheet = workbook.addWorksheet('Cash Movement'); addTitle(sheet, 'ACTUAL CASH MOVEMENT', 5); sheet.addRow([]); sheet.addRow(['Cash account / measure', 'Opening', 'Cash received', 'Cash spent', 'Closing / movement']); sheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        movement.accounts.forEach((account) => sheet.addRow([account.name, account.opening, account.inflows, account.outflows, account.closing]));
        sheet.addRow(['Total cash movement', movement.opening, movement.inflows, movement.outflows, movement.closing]);
        sheet.addRow(['Net movement', null, null, null, movement.netMovement]);
        sheet.addRow(['Roll-forward difference', null, null, null, movement.reconciliationDifference]);
        sheet.eachRow((row, rowNumber) => { if (rowNumber > 4) for (let column = 2; column <= 5; column += 1) row.getCell(column).numFmt = moneyFormat; });
        sheet.columns = [{ width: 36 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 24 }]; sheet.autoFilter = `A4:E${sheet.rowCount}`;
      }
      if (advanced?.balanceMovement?.available) {
        const movement = advanced.balanceMovement;
        const sheet = workbook.addWorksheet('BS Movement'); addTitle(sheet, 'BALANCE-SHEET MOVEMENT', 6); sheet.getCell('A2').value = `${orgName || 'Your organisation'}  |  Previous month-end: ${movement.previousDate}  |  Current date: ${movement.currentDate}  |  ${currency || 'Currency not specified'}`; sheet.addRow([]); sheet.addRow(['Category', 'Account', 'Previous balance', 'Current balance', 'Movement', 'Change']); sheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        (['assets', 'liabilities', 'equity'] as const).forEach((category) => {
          const row = sheet.addRow([category[0].toUpperCase() + category.slice(1), `Total ${category}`, movement.previous[category], movement.current[category], movement.changes[category], movement.changePercentages[category] === null ? null : movement.changePercentages[category]! / 100]); row.font = { bold: true };
          movement.accounts.filter((account) => account.category.toLowerCase().includes(category === 'assets' ? 'asset' : category === 'liabilities' ? 'liabilit' : 'equity')).forEach((account) => sheet.addRow([account.category, account.name, account.previous, account.current, account.change, account.changePercent === null ? null : account.changePercent / 100]));
        });
        sheet.eachRow((row, rowNumber) => { if (rowNumber > 4) { for (let column = 3; column <= 5; column += 1) row.getCell(column).numFmt = moneyFormat; row.getCell(6).numFmt = '0.0%'; } });
        sheet.columns = [{ width: 28 }, { width: 42 }, { width: 21 }, { width: 21 }, { width: 21 }, { width: 15 }]; sheet.autoFilter = `A4:F${sheet.rowCount}`;
      }
      if (advanced?.closeReview) {
        const review = advanced.closeReview;
        const sheet = workbook.addWorksheet('Close Review'); addTitle(sheet, 'MONTH-END CLOSE REVIEW', 5); sheet.getCell('A2').value = `${orgName || 'Your organisation'}  |  ${formatDate(review.period.fromDate)} to ${formatDate(review.period.toDate)}  |  Checked ${new Date(review.checkedAt).toLocaleString()}`; sheet.addRow([]); sheet.addRow(['Control', 'Status', 'Details', 'Evidence', 'Reference date']); sheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));
        review.controls.forEach((control) => sheet.addRow([control.name, control.status === 'verified' ? 'Verified' : control.status === 'attention' ? 'Needs attention' : control.status === 'not-applicable' ? 'Not applicable' : 'Not verified', control.detail, control.evidence, control.referenceDate]));
        sheet.columns = [{ width: 32 }, { width: 20 }, { width: 68 }, { width: 48 }, { width: 22 }]; sheet.autoFilter = `A4:E${sheet.rowCount}`;
      }
      workbook.eachSheet((sheet) => { sheet.eachRow((row) => row.eachCell((cell) => { cell.alignment = { ...cell.alignment, vertical: 'middle' }; })); });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Management_Accounts_${(orgName || 'Xero').replace(/[^a-z0-9-]+/gi, '_')}_${fromDate}_to_${toDate}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) {
      console.error('Management Accounts Excel export failed:', cause);
      toast.error('The Excel file could not be created. Please try again.');
    } finally { setExporting(null); }
  };

  return <PageContainer className="pb-2 print:space-y-4">
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-start lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700"><FileText className="h-4 w-4" /> Management reporting</div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Management Accounts</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">A focused view of the selected Xero reporting period and balance-sheet position.</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">{orgName || 'Your organisation'}</span><span className="rounded-full bg-slate-100 px-2.5 py-1">Currency: {currency || 'Not specified'}</span></div></div><div className="flex flex-wrap items-center gap-2 print:hidden"><button type="button" disabled={loading || exporting !== null || (!hasPnl && !hasBalance)} onClick={() => void downloadPdf()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"><FileText className="h-4 w-4" />{exporting === 'pdf' ? 'Creating PDF...' : 'Download PDF'}</button><button type="button" disabled={loading || exporting !== null || (!hasPnl && !hasBalance)} onClick={() => void downloadExcel()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"><FileText className="h-4 w-4" />{exporting === 'excel' ? 'Creating Excel...' : 'Export to Excel'}</button><button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh</button></div></div>
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between print:hidden"><div className="flex flex-wrap gap-2">{[['month', 'Month'], ['quarter', 'Quarter'], ['half-year', 'Half Year'], ['ytd', 'YTD'], ['ttm', 'Trailing 12M']].map(([value, label]) => <button key={value} type="button" onClick={() => applyPreset(value)} className={cn('rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors', preset === value ? 'border-cyan-600 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{label}</button>)}</div><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-600">From<input aria-label="Report start date" type="date" value={fromDate} onChange={(event) => { setPreset('custom'); setFromDate(event.target.value); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700" /></label><label className="text-xs font-semibold text-slate-600">To<input aria-label="Report end date" type="date" value={toDate} onChange={(event) => { setPreset('custom'); setToDate(event.target.value); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700" /></label><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer">Apply</button></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-700" /><strong className="text-slate-800">Profit &amp; loss period:</strong> {formatDate(fromDate)} - {formatDate(toDate)} <span className="text-slate-400"> | </span> <strong className="text-slate-800">Balance sheet:</strong> {formatDate(toDate)}</span>{reportPreparedAt && <span className="flex items-center gap-2"><Database className="h-4 w-4" /> Prepared {new Date(reportPreparedAt).toLocaleString()}</span>}</div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Could not load management accounts</p><p className="mt-1">Please try again. If the issue continues, check your Xero connection.</p></div></div>}
    {!loading && !error && (pnl.connected === false || bs.connected === false) && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Xero is not connected</p><p className="mt-1">Connect your Xero organisation to view its management accounts.</p></div></div>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}</div> : <>
      {!hasPnl && !hasBalance && !error && pnl.connected !== false && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Scale className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-800">No report data for this period</h2><p className="mx-auto mt-1 max-w-lg text-xs text-slate-500">No financial data is available for this period.</p></div>}
      {hasPnl && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Revenue', summary?.revenue, 'text-slate-900'], ['Gross profit', summary?.grossProfit, 'text-cyan-700'], ['Operating expenses', summary?.expenses, 'text-amber-700'], ['Net profit', summary?.netProfit, summary && summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700']].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className={cn('mt-3 text-xl font-bold tabular-nums', color)}>{formatValue(value as number | undefined, currency)}</p><p className="mt-1 text-xs text-slate-400">{label === 'Gross profit' ? (summary?.grossProfitMargin == null ? 'Gross margin not available' : `${summary.grossProfitMargin.toFixed(1)}% gross margin`) : label === 'Net profit' ? (summary?.profitMargin == null ? 'Net margin not available' : `${summary.profitMargin.toFixed(1)}% net margin`) : 'For the selected period'}</p></div>)}</div>
        <PerformanceComparisons analysis={analysis} summary={summary} fromDate={fromDate} toDate={toDate} currency={currency} />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-900">Profit & loss statement</h2><p className="mt-1 text-xs text-slate-500">Income and expense accounts for the selected period.</p></div><Section title="Revenue" lines={pnl.income?.operating || []} total={sum(pnl.income?.operating)} currency={currency} open={open.revenue} onToggle={() => setOpen((state) => ({ ...state, revenue: !state.revenue }))} /><Section title="Cost of sales" lines={pnl.cogs || []} total={sum(pnl.cogs)} currency={currency} open={open.cogs} onToggle={() => setOpen((state) => ({ ...state, cogs: !state.cogs }))} /><div className="flex justify-between border-b border-slate-100 bg-cyan-50/60 px-4 py-3 text-sm font-bold text-cyan-900"><span>Gross profit</span><span>{formatValue(summary?.grossProfit, currency)}</span></div><Section title="Operating expenses" lines={pnl.expenses?.operating || []} total={sum(pnl.expenses?.operating)} currency={currency} open={open.expenses} onToggle={() => setOpen((state) => ({ ...state, expenses: !state.expenses }))} /><Section title="Other income and expenses" lines={[...(pnl.income?.other || []), ...(pnl.expenses?.other || []).map((line) => ({ ...line, name: `${line.name} (expense)` }))]} total={sum(pnl.income?.other) - sum(pnl.expenses?.other)} currency={currency} open={open.other} onToggle={() => setOpen((state) => ({ ...state, other: !state.other }))} /><div className="flex justify-between bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900"><span>Net profit</span><span>{formatValue(summary?.netProfit, currency)}</span></div></section><section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-900">Executive summary</h2><p className="mt-1 text-xs text-slate-500">A summary of results for the selected period.</p></div><div className="space-y-4 p-4 text-sm text-slate-600">{summary && <><p>Revenue of <strong className="text-slate-900">{formatValue(summary.revenue, currency)}</strong> produced gross profit of <strong className="text-slate-900">{formatValue(summary.grossProfit, currency)}</strong> at a {summary.grossProfitMargin == null ? 'not available' : `${summary.grossProfitMargin.toFixed(1)}%`} gross margin.</p><p>Net profit was <strong className={summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatValue(summary.netProfit, currency)}</strong>, representing a {summary.profitMargin == null ? 'not available' : `${summary.profitMargin.toFixed(1)}%`} net margin.</p></>}</div></section></div>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div><h2 className="font-semibold text-slate-900">Monthly performance</h2><p className="mt-1 text-xs text-slate-500">Monthly revenue, total costs and net profit for the selected dates.</p></div>
            <TrendingUp className="h-5 w-5 text-cyan-700" />
          </div>
          {trends.length > 0 && <MonthlyPerformanceChart data={trends} currency={currency} />}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <caption className="sr-only">Monthly revenue, total costs and net profit</caption>
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Month</th><th scope="col" className="px-4 py-3 text-right">Revenue</th><th scope="col" className="px-4 py-3 text-right">Total costs</th><th scope="col" className="px-4 py-3 text-right">Net profit</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {trends.length ? trends.map((item) => { const hasValues = item.available !== false && item.revenue !== null && item.expenses !== null && item.netProfit !== null; return <tr key={item.month}><th scope="row" className="px-4 py-3 font-medium text-slate-700">{item.month}</th><td className="px-4 py-3 text-right tabular-nums">{hasValues ? formatValue(item.revenue, currency) : 'Not available'}</td><td className="px-4 py-3 text-right tabular-nums">{hasValues ? formatValue(item.expenses, currency) : 'Not available'}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{hasValues ? formatValue(item.netProfit, currency) : 'Not available'}</td></tr>; }) : <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No monthly results are available for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </section></>}
      {hasBalance && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Balance-sheet snapshot</h2>
              <p className="mt-1 text-xs text-slate-500">Assets, liabilities and equity as at {formatDate(toDate)}.</p>
            </div>
            {balance && (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', balance.isBalanced === true ? 'bg-emerald-50 text-emerald-700' : balance.isBalanced === false ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                {balance.isBalanced === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {balance.isBalanced === true ? 'Reconciled' : balance.isBalanced === false ? 'Difference ' + formatValue(balance.difference, currency) : 'Reconciliation not available'}
              </span>
            )}
          </div>

          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ['Cash & bank', cash],
              ['Receivables', receivables],
              ['Payables', payables],
              ['Total assets', bs.sourceSummary?.assets ?? null],
              ['Total liabilities', bs.sourceSummary?.liabilities ?? null],
              ['Total equity', bs.sourceSummary?.equity ?? null],
            ].map(([label, value]) => (
              <div key={String(label)} className="border-l-2 border-cyan-600 bg-slate-50 px-3 py-2 transition-colors hover:bg-white hover:shadow-sm">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 font-bold tabular-nums text-slate-900">{formatValue(typeof value === 'number' ? value : null, currency)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 border-b border-slate-100 p-4 lg:grid-cols-3">
            {[
              { title: 'Assets', lines: [...(bs.assets?.current || []).map((line, index) => ({ line, id: `current-asset-${index}` })), ...(bs.assets?.nonCurrent || []).map((line, index) => ({ line, id: `non-current-asset-${index}` }))] },
              { title: 'Liabilities', lines: [...(bs.liabilities?.current || []).map((line, index) => ({ line, id: `current-liability-${index}` })), ...(bs.liabilities?.nonCurrent || []).map((line, index) => ({ line, id: `non-current-liability-${index}` }))] },
              { title: 'Equity', lines: (bs.equity || []).map((line, index) => ({ line, id: `equity-${index}` })) },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{group.title}</h3>
                {group.lines.map(({ line, id }) => {
                  const flagRank = topBalanceFlags.findIndex((account) => account.id === id);
                  return (
                  <div key={id} className={cn('flex justify-between gap-3 rounded-md py-1 text-xs', flagRank >= 0 ? 'bg-rose-50/80 px-2 text-rose-800' : 'text-slate-600')}>
                    <span className="flex min-w-0 items-center gap-1.5">{flagRank >= 0 && <Flag aria-label={`Priority ${flagRank + 1} balance`} className="h-3 w-3 shrink-0 fill-rose-600 text-rose-600" />}<span className="truncate">{line.name}</span></span>
                    <span className={cn('shrink-0 tabular-nums', flagRank >= 0 && 'font-semibold')}>{formatValue(line.value, currency)}</span>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>

          {(hasReceivableDetails || hasPayableDetails) && <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-2">
            {hasReceivableDetails && <details className="group rounded-lg border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <span><span className="block text-sm font-semibold text-slate-800">Receivables by customer</span><span className="mt-0.5 block text-[11px] text-slate-500">Outstanding invoices at {formatDate(analysis?.receivables?.asOfDate)}</span></span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">{receivableEntries.length} entries<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
              </summary>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                {receivableEntries.map((entry, index) => { const flagRank = topBalanceFlags.findIndex((flagged) => flagged.id === entry.id); return <div key={entry.id} className={cn('flex items-center justify-between gap-3 px-3 py-2 text-xs', flagRank >= 0 ? 'bg-rose-50/80 text-rose-800' : 'text-slate-600')}><span className="flex min-w-0 items-center gap-2"><span className="w-5 shrink-0 text-[10px] text-slate-400">{index + 1}</span>{flagRank >= 0 && <Flag className="h-3 w-3 shrink-0 fill-rose-600 text-rose-600" />}<span className="min-w-0 truncate">{entry.name}<span className="ml-2 text-[10px] text-slate-400">{entry.invoiceCount} invoices</span></span></span><span className="shrink-0 font-semibold tabular-nums">{formatValue(entry.value, currency)}</span></div>; })}
              </div>
            </details>}
            {hasPayableDetails && <details className="group rounded-lg border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <span><span className="block text-sm font-semibold text-slate-800">Payables by supplier</span><span className="mt-0.5 block text-[11px] text-slate-500">Outstanding bills at {formatDate(analysis?.payables?.asOfDate)}</span></span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">{payableEntries.length} entries<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
              </summary>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                {payableEntries.map((entry, index) => { const flagRank = topBalanceFlags.findIndex((flagged) => flagged.id === entry.id); return <div key={entry.id} className={cn('flex items-center justify-between gap-3 px-3 py-2 text-xs', flagRank >= 0 ? 'bg-rose-50/80 text-rose-800' : 'text-slate-600')}><span className="flex min-w-0 items-center gap-2"><span className="w-5 shrink-0 text-[10px] text-slate-400">{index + 1}</span>{flagRank >= 0 && <Flag className="h-3 w-3 shrink-0 fill-rose-600 text-rose-600" />}<span className="min-w-0 truncate">{entry.name}<span className="ml-2 text-[10px] text-slate-400">{entry.invoiceCount} bills</span></span></span><span className="shrink-0 font-semibold tabular-nums">{formatValue(entry.value, currency)}</span></div>; })}
              </div>
            </details>}
          </div>}

          {topBalanceFlags.length > 0 && <div className="border-b border-slate-100 px-4 py-4">
            <div className="mb-3 flex items-start gap-2">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 fill-rose-600 text-rose-600" />
              <div><h3 className="text-sm font-semibold text-slate-900">Largest customer and supplier balances</h3><p className="mt-0.5 text-xs text-slate-500">Top five outstanding balances for receivables and payables.</p></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {topBalanceFlags.map((account) => <div key={account.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-sm">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{account.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{account.category}</p></div>
                <strong className="shrink-0 text-sm tabular-nums text-rose-800">{formatValue(account.value, currency)}</strong>
              </div>)}
            </div>
          </div>}

          <div className="grid gap-3 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Net working capital', value: formatValue(bs.sourceSummary?.workingCapital?.netWorkingCapital, currency), note: 'Current assets less current liabilities' },
              { label: 'Current ratio', value: bs.sourceSummary?.workingCapital?.currentRatio == null ? 'Not available' : bs.sourceSummary.workingCapital.currentRatio.toFixed(2) + 'x', note: 'Current assets divided by current liabilities' },
              { label: 'Receivables / payables', value: bs.sourceSummary?.workingCapital?.receivablesToPayables == null ? 'Not available' : bs.sourceSummary.workingCapital.receivablesToPayables.toFixed(2) + 'x', note: 'Receivables divided by payables' },
              { label: 'Cash / payables', value: bs.sourceSummary?.workingCapital?.cashToPayables == null ? 'Not available' : bs.sourceSummary.workingCapital.cashToPayables.toFixed(2) + 'x', note: 'Cash divided by payables' },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-200/70 bg-white px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-sm">
                <span className="block text-xs text-slate-500">{metric.label}</span>
                <strong className="mt-1 block text-sm text-slate-900 tabular-nums">{metric.value}</strong>
                <span className="mt-1 block text-[11px] text-slate-400">{metric.note}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {pnl.connected && bs.connected && <>
        <BalanceMovementAnalysis data={advanced?.balanceMovement ?? null} currency={currency} />
        <CashMovementStatement data={advanced?.cashMovement ?? null} currency={currency} />
        <ManagementLedgerWorkspace fromDate={fromDate} toDate={toDate} sourceChecks={advanced?.closeReview ?? null} />
      </>}
      {hasBalance && unclassifiedBalanceLines.length > 0 && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-800">Other balance-sheet accounts</h2><p className="mt-1 text-xs text-slate-500">Other accounts included in the balance sheet.</p></div><div className="divide-y divide-slate-100">{unclassifiedBalanceAccounts.map((account) => { const flagRank = topBalanceFlags.findIndex((flagged) => flagged.id === account.id); return <div key={account.id} className={cn('flex justify-between gap-4 px-4 py-2 text-xs', flagRank >= 0 ? 'bg-rose-50/80 font-semibold text-rose-800' : 'text-slate-600')}><span className="flex items-center gap-1.5">{flagRank >= 0 && <Flag aria-label={`Priority ${flagRank + 1} balance`} className="h-3 w-3 fill-rose-600 text-rose-600" />}{account.name}</span><span className="tabular-nums">{formatValue(account.value, currency)}</span></div>; })}</div></section>}
    </>}
  </PageContainer>;
}


