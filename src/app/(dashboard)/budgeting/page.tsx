"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts';
import {
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Download,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BudgetingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('ttm');
  const [periodInfo, setPeriodInfo] = useState<any>({
    label: 'Trailing 12 Months (TTM)',
    dataSource: 'Xero Organization Live Ledger (PostgreSQL Cache)'
  });
  const [currency, setCurrency] = useState('GBP');
  const [data, setData] = useState({
    revBudget: 32000,
    revActual: 29450,
    expBudget: 21500,
    expActual: 22650,
    netBudget: 10500,
    netActual: 6800,
    budgetItems: [
      { category: 'Sales Revenue', budget: 32000, actual: 29450, type: 'revenue' },
      { category: 'Direct Cost of Goods Sold (COGS)', budget: 11000, actual: 11200, type: 'expense' },
      { category: 'Salaries & Payroll', budget: 5500, actual: 5600, type: 'expense' },
      { category: 'Marketing & Advertising', budget: 2000, actual: 2450, type: 'expense' },
      { category: 'Software & Cloud Infrastructure', budget: 1200, actual: 1400, type: 'expense' },
      { category: 'Office Rent & Facilities', budget: 1500, actual: 1500, type: 'expense' },
      { category: 'Professional & Legal Fees', budget: 300, actual: 500, type: 'expense' }
    ]
  });

  const chartRef = useRef<HTMLDivElement>(null);

  const fetchBudget = async (periodCode = selectedPeriod) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/cfo-intelligence?period=${periodCode}`);
      if (res.ok) {
        const result = await res.json();
        if (result.budgeting) {
          setData(result.budgeting);
        }
        if (result.currency) {
          setCurrency(result.currency);
        }
        if (result.periodInfo) {
          setPeriodInfo(result.periodInfo);
        }
      }
    } catch (err) {
      console.error('Failed to load budgeting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    fetchBudget(newPeriod);
  };

  useEffect(() => {
    fetchBudget();
  }, []);

  // ECharts Budget vs Actual Bar Chart
  useEffect(() => {
    if (!chartRef.current || !data.budgetItems) return;
    const chart = echarts.init(chartRef.current);

    const categories = data.budgetItems.map(i => i.category);
    const budgetVals = data.budgetItems.map(i => i.budget);
    const actualVals = data.budgetItems.map(i => i.actual);

    const option = {
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0b1329',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      legend: {
        data: ['Budget Target', 'Actual Performance'],
        right: '2%',
        top: '0%',
        textStyle: { color: '#64748b', fontSize: 11, fontWeight: 600 }
      },
      xAxis: {
        type: 'category',
        data: categories.map(c => c.length > 15 ? c.slice(0, 15) + '...' : c),
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 15 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11 }
      },
      series: [
        {
          name: 'Budget Target',
          type: 'bar',
          data: budgetVals,
          itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: 'Actual Performance',
          type: 'bar',
          data: actualVals,
          itemStyle: { color: '#00b7e2', borderRadius: [4, 4, 0, 0] }
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
  }, [data]);

  const fmt = (val: number) => {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '£';
    return sym + Math.round(val).toLocaleString();
  };

  const revVariance = data.revActual - data.revBudget;
  const expVariance = data.expActual - data.expBudget;
  const netVariance = data.netActual - data.netBudget;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-linear-to-r from-[#0b1736] via-[#0f2347] to-[#133863] p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#00b7e2]/20 border border-[#00b7e2]/40 flex items-center justify-center text-[#00b7e2]">
              <Target className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Budgeting & Variance Analysis</h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              Virtual CFO Budget Engine
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Compare monthly & YTD financial targets vs actual P&L performance with detailed line-item variances calculated from live database records.
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
            onClick={() => fetchBudget(selectedPeriod)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#00b7e2] hover:bg-[#009ec3] text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Reload Budget Data</span>
          </button>
        </div>
      </div>

      {/* Time Period & Calculation Transparency Box */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-200">
          <Target className="h-4 w-4 text-[#00b7e2] shrink-0" />
          <div>
            <span className="font-bold text-white">Active Budget Period: </span>
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

      {/* Primary Budget vs Actual KPI Cards with ? Tooltips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Revenue Target vs Actual</span>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#00b7e2]" />
              <div className="group/tip relative cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                  <div className="font-bold text-[#00b7e2] mb-1">Revenue Budget Variance</div>
                  Measures actual sales revenue achieved against the monthly budgeted target.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(data.revActual)}</span>
            <span className="text-xs text-slate-400 font-bold">/ {fmt(data.revBudget)} Target</span>
          </div>
          <div className={cn("text-xs font-bold flex items-center gap-1", revVariance >= 0 ? "text-emerald-600" : "text-amber-600")}>
            {revVariance >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            Variance: {fmt(revVariance)} ({data.revBudget > 0 ? ((revVariance / data.revBudget) * 100).toFixed(1) : 0}%)
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Operating Expenses Budget</span>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div className="group/tip relative cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                  <div className="font-bold text-purple-400 mb-1">Expenses Budget Variance</div>
                  Compares actual operating spend (OPEX) against monthly budget allowance. Warns on overspend.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(data.expActual)}</span>
            <span className="text-xs text-slate-400 font-bold">/ {fmt(data.expBudget)} Budget</span>
          </div>
          <div className={cn("text-xs font-bold flex items-center gap-1", expVariance <= 0 ? "text-emerald-600" : "text-rose-600")}>
            {expVariance <= 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {expVariance <= 0 ? 'Under Budget' : `Over Budget by ${fmt(expVariance)}`}
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Profit Target</span>
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-500" />
              <div className="group/tip relative cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                <div className="absolute right-0 top-6 hidden group-hover/tip:block z-50 w-60 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                  <div className="font-bold text-emerald-400 mb-1">Net Profit Target</div>
                  Bottom-line net profit performance vs budgeted goal for the period.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(data.netActual)}</span>
            <span className="text-xs text-slate-400 font-bold">/ {fmt(data.netBudget)} Target</span>
          </div>
          <div className={cn("text-xs font-bold flex items-center gap-1", netVariance >= 0 ? "text-emerald-600" : "text-amber-600")}>
            Net Variance: {fmt(netVariance)} ({data.netBudget > 0 ? ((netVariance / data.netBudget) * 100).toFixed(1) : 0}%)
          </div>
        </div>
      </div>

      {/* Budget vs Actual Comparison Chart with ? Tooltip */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 relative">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Line-Item Budget vs Actual Comparison</h3>
              <p className="text-xs text-slate-500">Visual variance across major revenue & cost centers</p>
            </div>
            <div className="group/tip relative cursor-help">
              <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600 transition" />
              <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-64 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                <div className="font-bold text-[#00b7e2] mb-1">Line-Item Variance Graph</div>
                Side-by-side comparison bar chart for target budget allowance vs actual spend per category.
              </div>
            </div>
          </div>
        </div>

        <div ref={chartRef} className="h-72 w-full" />
      </div>

      {/* Line-Item Budget Variance Table with ? Tooltip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Detailed Budget Variance Schedule</h3>
            <div className="group/tip relative cursor-help">
              <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600 transition" />
              <div className="absolute left-0 top-6 hidden group-hover/tip:block z-50 w-64 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                <div className="font-bold text-[#00b7e2] mb-1">Variance Schedule Table</div>
                Itemized variance table highlighting exact dollar and percentage deviations from budget targets.
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">Monthly Period</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Line Item / Category</th>
                <th className="py-3 px-4 text-right">Budget Target</th>
                <th className="py-3 px-4 text-right">Actual Amount</th>
                <th className="py-3 px-4 text-right">Variance ($)</th>
                <th className="py-3 px-4 text-right">Variance (%)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.budgetItems && data.budgetItems.map((item, idx) => {
                const diff = item.actual - item.budget;
                const pct = item.budget > 0 ? (diff / item.budget) * 100 : 0;
                const isOverBudget = item.type === 'expense' ? diff > 0 : diff < 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.category}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">{fmt(item.budget)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{fmt(item.actual)}</td>
                    <td className={cn("py-3 px-4 text-right font-bold", isOverBudget ? "text-rose-600" : "text-emerald-600")}>
                      {diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                    </td>
                    <td className={cn("py-3 px-4 text-right font-bold", isOverBudget ? "text-rose-600" : "text-emerald-600")}>
                      {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "px-2.5 py-0.5 text-[10px] font-bold rounded-full border inline-block",
                        isOverBudget ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}>
                        {isOverBudget ? 'OVER BUDGET' : 'ON TARGET'}
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
}
