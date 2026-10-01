"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Clock,
  Landmark,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function KpiScorecardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('ttm');
  const [periodInfo, setPeriodInfo] = useState<any>({
    label: 'Trailing 12 Months (TTM)',
    dataSource: 'Xero Organization Live Ledger (PostgreSQL Cache)'
  });
  const [kpis, setKpis] = useState({
    dso: 34,           // Debtor Days (DSO)
    dpo: 28,           // Creditor Days (DPO)
    dio: 22,           // Inventory Days (DIO)
    workingCapitalCycle: 28, // Cash Conversion Cycle = 34 + 22 - 28
    currentRatio: 2.15,
    quickRatio: 1.65,
    roce: 18.4,
    roe: 22.1,
    assetTurnover: 1.4,
    interestCoverage: 6.8,
    debtToEquity: 0.45,
    currency: 'GBP'
  });

  const fetchKpis = async (periodCode = selectedPeriod) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/cfo-intelligence?period=${periodCode}`);
      if (res.ok) {
        const result = await res.json();
        if (result.kpiScorecard) {
          setKpis({
            ...result.kpiScorecard,
            currency: result.currency || 'GBP'
          });
        }
        if (result.periodInfo) {
          setPeriodInfo(result.periodInfo);
        }
      }
    } catch (err) {
      console.error('Failed to load KPI scorecard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    fetchKpis(newPeriod);
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-linear-to-r from-[#0b1736] via-[#0f2347] to-[#133863] p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#00b7e2]/20 border border-[#00b7e2]/40 flex items-center justify-center text-[#00b7e2]">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Financial KPI Scorecard & Ratios</h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              Virtual CFO Live Ratios
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Comprehensive financial efficiency ratios, debtor days, working capital cycle, liquidity, and return metrics calculated from accounting records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Interactive Period Selector */}
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            {[
              { code: 'ttm', label: 'Trailing 12M (TTM)' },
              { code: 'ytd', label: 'YTD (FY26)' },
              { code: 'quarter', label: 'This Quarter' },
              { code: 'this_month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.code}
                onClick={() => handlePeriodChange(p.code)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer",
                  selectedPeriod === p.code
                    ? "bg-[#00b7e2] text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchKpis(selectedPeriod)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#00b7e2] hover:bg-[#009ec3] text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh Ratios</span>
          </button>
        </div>
      </div>

      {/* Time Period & Calculation Transparency Box */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-200">
          <Activity className="h-4 w-4 text-[#00b7e2] shrink-0" />
          <div>
            <span className="font-bold text-white">Active Ratio Calculation Period: </span>
            <span className="text-cyan-300 font-semibold">{periodInfo?.label || 'Trailing 12 Months (TTM)'}</span>
            <span className="text-slate-400 ml-2">({periodInfo?.startDate} to {periodInfo?.endDate})</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
            {periodInfo?.dataSource || 'Xero Organization Live Ledger (PostgreSQL Cache)'}
          </span>
        </div>
      </div>

      {/* 1. Working Capital & Efficiency Ratios with ? Tooltips */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Working Capital & Efficiency Cycle</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* DSO Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Debtor Days (DSO)</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#00b7e2]" />
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    <div className="font-bold text-[#00b7e2] mb-1">Days Sales Outstanding (DSO)</div>
                    Average number of days required to collect payment after a sales invoice is issued. Lower is better.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${kpis.dso} Days`}</div>
            <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Target: &lt; 40 Days (Healthy)
            </div>
          </div>

          {/* DPO Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Creditor Days (DPO)</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-500" />
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    <div className="font-bold text-purple-400 mb-1">Days Payables Outstanding (DPO)</div>
                    Average number of days taken to pay supplier bills. Longer window preserves operating cash.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${kpis.dpo} Days`}</div>
            <div className="text-xs text-slate-500 font-medium">Average payment window to vendors</div>
          </div>

          {/* DIO Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Inventory Days (DIO)</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    <div className="font-bold text-amber-400 mb-1">Days Inventory Outstanding (DIO)</div>
                    Average days stock is held before being sold. Lower DIO indicates fast inventory turnover.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${kpis.dio} Days`}</div>
            <div className="text-xs text-slate-500 font-medium">Inventory holding & turnover speed</div>
          </div>

          {/* Working Capital Cycle Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cash Conversion Cycle</span>
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    <div className="font-bold text-emerald-400 mb-1">Cash Conversion Cycle (CCC)</div>
                    Net days required to turn inventory & supplier outlays back into cash inflows (DSO + DIO - DPO).
                  </div>
                </div>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{isLoading ? '...' : `${kpis.workingCapitalCycle} Days`}</div>
            <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Fast Working Capital Conversion
            </div>
          </div>
        </div>
      </div>

      {/* 2. Liquidity & Solvency Ratios Grid with ? Tooltips */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Liquidity, Solvency & Return Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Ratio Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Current Ratio</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    Current Assets / Current Liabilities. Ratio &gt; 1.5 indicates robust short-term liquidity buffer.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">Optimal</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.currentRatio.toFixed(2)}x`}</div>
            <p className="text-xs text-slate-500">Current Assets / Current Liabilities. Measures ability to cover short-term debts.</p>
          </div>

          {/* Quick Ratio Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Quick Ratio (Acid Test)</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    (Cash + Receivables) / Current Liabilities. Excludes inventory from liquid assets.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">Strong</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.quickRatio.toFixed(2)}x`}</div>
            <p className="text-xs text-slate-500">(Cash + Receivables) / Current Liabilities. Immediate liquid solvency indicator.</p>
          </div>

          {/* ROCE Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Return on Capital (ROCE)</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    Operating Profit / Capital Employed. Efficiency of capital deployment in generating profit.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-200">High Return</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.roce.toFixed(1)}%`}</div>
            <p className="text-xs text-slate-500">Operating Profit / Capital Employed. Profitability per capital unit.</p>
          </div>

          {/* ROE Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Return on Equity (ROE)</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    Net Profit / Shareholder Equity. Return generated on owner/shareholder equity investment.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200">Strong</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.roe.toFixed(1)}%`}</div>
            <p className="text-xs text-slate-500">Net Profit / Shareholder Equity. Measures equity profitability return.</p>
          </div>

          {/* Interest Coverage Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Interest Coverage Ratio</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    EBIT / Interest Expense. Ability to comfortably service debt interest obligations.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">Low Risk</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.interestCoverage.toFixed(1)}x`}</div>
            <p className="text-xs text-slate-500">EBIT / Interest Expense. Safety buffer for debt interest coverage.</p>
          </div>

          {/* Debt to Equity Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Debt-to-Equity Ratio</span>
                <div className="group/tip relative cursor-help">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                  <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                    Total Debt Liabilities / Shareholder Equity. Financial leverage & capital structure ratio.
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">Conservative</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{isLoading ? '...' : `${kpis.debtToEquity.toFixed(2)}x`}</div>
            <p className="text-xs text-slate-500">Total Liabilities / Shareholder Equity. Conservative debt leverage safety.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
