"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts';
import {
  TrendingUp,
  LineChart,
  Sliders,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ForecastPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'optimistic' | 'downside'>('base');
  const [revGrowthPct, setRevGrowthPct] = useState(10); // +10% default
  const [costInflationPct, setCostInflationPct] = useState(3); // +3% default
  const [currency, setCurrency] = useState('GBP');

  const [baseData, setBaseData] = useState({
    annualRevenue: 29450,
    annualCogs: 11200,
    annualOpex: 11450,
    startingCash: 25400,
    monthlyBurn: 1200
  });

  const chartRef = useRef<HTMLDivElement>(null);

  const fetchForecastData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/cfo-intelligence?period=ttm');
      if (res.ok) {
        const result = await res.json();
        if (result.profitability) {
          setBaseData({
            annualRevenue: result.profitability.revenue || 29450,
            annualCogs: result.profitability.cogs || 11200,
            annualOpex: (result.profitability.opexFixed + result.profitability.opexVariable) || 11450,
            startingCash: result.cashFlow13Week?.startingCash || 25400,
            monthlyBurn: Math.max(500, Math.round((result.profitability.cogs + result.profitability.opexFixed + result.profitability.opexVariable - result.profitability.revenue) / 12))
          });
        }
        if (result.currency) {
          setCurrency(result.currency);
        }
      }
    } catch (err) {
      console.error('Failed to load forecast data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, []);

  const handleScenarioSelect = (type: 'base' | 'optimistic' | 'downside') => {
    setSelectedScenario(type);
    if (type === 'base') {
      setRevGrowthPct(10);
      setCostInflationPct(3);
    } else if (type === 'optimistic') {
      setRevGrowthPct(25);
      setCostInflationPct(1);
    } else if (type === 'downside') {
      setRevGrowthPct(-15);
      setCostInflationPct(8);
    }
  };

  // Computations based on sliders
  const projRev = Math.round(baseData.annualRevenue * (1 + revGrowthPct / 100));
  const projCogs = Math.round(baseData.annualCogs * (1 + costInflationPct / 100));
  const projOpex = Math.round(baseData.annualOpex * (1 + costInflationPct / 100));
  const projGrossProfit = projRev - projCogs;
  const projNetProfit = projGrossProfit - projOpex;
  const projNetMargin = projRev > 0 ? parseFloat(((projNetProfit / projRev) * 100).toFixed(1)) : 0;

  // Monthly cash flow simulation for next 12 months
  const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  let currentCash = baseData.startingCash;
  const monthlyCashTrajectory = months.map((m) => {
    const monthlyRev = projRev / 12;
    const monthlyCost = (projCogs + projOpex) / 12;
    const netMonthlyCash = monthlyRev - monthlyCost;
    currentCash += netMonthlyCash;
    return Math.round(currentCash);
  });

  const finalEndingCash = monthlyCashTrajectory[11];
  const avgMonthlyBurnOrGain = (projRev - (projCogs + projOpex)) / 12;
  const runwayMonths = avgMonthlyBurnOrGain >= 0
    ? 'Infinite (Positive Cashflow)'
    : (baseData.startingCash / Math.abs(avgMonthlyBurnOrGain)).toFixed(1) + ' Months';

  // ECharts trajectory chart
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option = {
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0b1329',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      legend: {
        data: ['Projected Cash Balance', 'Base-Case Baseline'],
        right: '2%',
        top: '0%',
        textStyle: { color: '#64748b', fontSize: 11, fontWeight: 600 }
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11 }
      },
      series: [
        {
          name: 'Projected Cash Balance',
          type: 'line',
          smooth: true,
          data: monthlyCashTrajectory,
          itemStyle: { color: '#00b7e2' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 183, 226, 0.35)' },
              { offset: 1, color: 'rgba(0, 183, 226, 0.0)' }
            ])
          }
        },
        {
          name: 'Base-Case Baseline',
          type: 'line',
          smooth: true,
          lineStyle: { type: 'dashed', width: 2, color: '#94a3b8' },
          data: months.map((_, idx) => {
            const mRev = baseData.annualRevenue * 1.1 / 12;
            const mCost = (baseData.annualCogs * 1.03 + baseData.annualOpex * 1.03) / 12;
            return Math.round(baseData.startingCash + (idx + 1) * (mRev - mCost));
          })
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
  }, [revGrowthPct, costInflationPct, baseData]);

  const fmt = (val: number) => {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '£';
    return sym + Math.round(val).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-linear-to-r from-[#0b1736] via-[#0f2347] to-[#133863] p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#00b7e2]/20 border border-[#00b7e2]/40 flex items-center justify-center text-[#00b7e2]">
              <LineChart className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Forecast & Scenario Planning Cockpit</h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              Virtual CFO Predictive Engine
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Model forward 12-month revenue growth, cost inflation, profit margins, and cash runway under custom strategic scenarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={fetchForecastData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#00b7e2] hover:bg-[#009ec3] text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Base Case */}
        <div
          onClick={() => handleScenarioSelect('base')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer space-y-2 relative",
            selectedScenario === 'base'
              ? "bg-cyan-950/20 border-[#00b7e2] shadow-md ring-1 ring-[#00b7e2]"
              : "bg-white border-slate-200 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Base Case Scenario</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-100 text-cyan-800">10% Growth</span>
          </div>
          <div className="text-xl font-black text-slate-900">Moderate Growth</div>
          <p className="text-xs text-slate-500">+10% revenue expansion with modest +3% cost inflation benchmark.</p>
        </div>

        {/* Optimistic */}
        <div
          onClick={() => handleScenarioSelect('optimistic')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer space-y-2 relative",
            selectedScenario === 'optimistic'
              ? "bg-emerald-950/20 border-emerald-500 shadow-md ring-1 ring-emerald-500"
              : "bg-white border-slate-200 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Optimistic Growth</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">+25% Revenue</span>
          </div>
          <div className="text-xl font-black text-slate-900">Aggressive Expansion</div>
          <p className="text-xs text-slate-500">+25% accelerated top-line growth with lean cost control (+1% cost).</p>
        </div>

        {/* Downside */}
        <div
          onClick={() => handleScenarioSelect('downside')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer space-y-2 relative",
            selectedScenario === 'downside'
              ? "bg-rose-950/20 border-rose-500 shadow-md ring-1 ring-rose-500"
              : "bg-white border-slate-200 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Downside Stress Test</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">-15% Revenue</span>
          </div>
          <div className="text-xl font-black text-slate-900">Contraction Warning</div>
          <p className="text-xs text-slate-500">-15% drop in revenue combined with +8% cost inflation pressure.</p>
        </div>
      </div>

      {/* Interactive Scenario Sliders */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#00b7e2]" />
            <h3 className="text-sm font-bold text-slate-900">Custom Growth & Cost Parameters</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Drag sliders to adjust forward projection</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Growth Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Annual Revenue Growth Target (%):</span>
              <span className={cn("font-black px-2 py-0.5 rounded text-xs", revGrowthPct >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00b7e2]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-30% Contraction</span>
              <span>0% Flat</span>
              <span>+50% High Growth</span>
            </div>
          </div>

          {/* Cost Inflation Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Cost Inflation & Overhead Increase (%):</span>
              <span className={cn("font-black px-2 py-0.5 rounded text-xs", costInflationPct <= 5 ? "bg-cyan-50 text-cyan-600" : "bg-amber-50 text-amber-600")}>
                +{costInflationPct}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="1"
              value={costInflationPct}
              onChange={(e) => setCostInflationPct(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-10% Cost Reduction</span>
              <span>+3% Normal</span>
              <span>+30% High Inflation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Output Key Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projected 12M Revenue</div>
          <div className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(projRev)}</div>
          <div className={cn("text-xs font-bold flex items-center gap-1", revGrowthPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {revGrowthPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {revGrowthPct >= 0 ? `+${revGrowthPct}% vs Baseline` : `${revGrowthPct}% vs Baseline`}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projected Net Profit</div>
          <div className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(projNetProfit)}</div>
          <div className="text-xs text-blue-600 font-bold">{projNetMargin}% Projected Net Margin</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">End-of-Year Cash Position</div>
          <div className="text-2xl font-black text-slate-900">{isLoading ? '...' : fmt(finalEndingCash)}</div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Projected Ending Reserves
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projected Cash Runway</div>
          <div className="text-xl font-black text-slate-900">{isLoading ? '...' : runwayMonths}</div>
          <div className="text-xs text-slate-500 font-medium">Solvency horizon projection</div>
        </div>
      </div>

      {/* 12-Month Projected Trajectory Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Forward 12-Month Cash & Capital Trajectory</h3>
            <p className="text-xs text-slate-500">Simulated monthly cash balance trajectory comparing custom scenario vs baseline</p>
          </div>
        </div>

        <div ref={chartRef} className="h-72 w-full" />
      </div>
    </div>
  );
}
