"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Landmark,
  AlertTriangle,
  Coins,
  Clock,
  ArrowUpDown,
  Calendar,
  RefreshCw,
  ChevronDown,
  Lightbulb,
  Download,
  Sliders,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThirteenWeekCashFlowPage() {
  const [activeTab, setActiveTab] = useState<'why' | 'drivers' | 'actions'>('why');
  const [selectedScenario, setSelectedScenario] = useState('1');
  const [additionalReceipts, setAdditionalReceipts] = useState(100000);
  const [delayPayments, setDelayPayments] = useState(0);
  const [reduceExpenses, setReduceExpenses] = useState(0);

  const forecastChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);

  // Initialize Main Forecast Combo Chart
  useEffect(() => {
    if (!forecastChartRef.current) return;
    const chart = echarts.init(forecastChartRef.current);

    const weeks = [
      'W1\nOct 01', 'W2\nOct 08', 'W3\nOct 15', 'W4\nOct 22', 'W5\nOct 29',
      'W6\nNov 05', 'W7\nNov 12', 'W8\nNov 19', 'W9\nNov 26', 'W10\nDec 03',
      'W11\nDec 10', 'W12\nDec 17', 'W13\nDec 24'
    ];

    const inflows = [85, 72, 68, 64, 55, 60, 42, 38, 25, 45, 50, 55, 65];
    const outflows = [95, 87, 92, 78, 88, 95, 102, 58, 50, 55, 60, 62, 60];
    const cashBalance = [440, 420, 400, 380, 350, 310, 260, 220, 184, 190, 210, 230, 260];

    const option: echarts.EChartsOption = {
      grid: { left: '4%', right: '4%', top: '10%', bottom: '12%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10, interval: 0, fontWeight: 500 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 800,
        interval: 200,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'solid' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (val: number) => val === 0 ? '£0' : `£${val}K`
        }
      },
      series: [
        {
          name: 'Inflows',
          type: 'bar',
          barWidth: '22%',
          barGap: '10%',
          data: inflows,
          itemStyle: { color: '#34d399', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: 'Outflows',
          type: 'bar',
          barWidth: '22%',
          data: outflows,
          itemStyle: { color: '#f87171', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: 'Cash Balance',
          type: 'line',
          smooth: true,
          data: cashBalance,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#2563eb' },
          lineStyle: { width: 2.5, color: '#2563eb' },
          markLine: {
            symbol: 'none',
            data: [
              {
                yAxis: 200,
                lineStyle: { type: 'dashed', color: '#ef4444', width: 1.5 },
                label: { show: false }
              }
            ]
          },
          markPoint: {
            symbol: 'circle',
            symbolSize: 12,
            data: [{ name: 'Lowest Point', coord: [8, 184], itemStyle: { color: '#ef4444' } }]
          }
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
  }, []);

  // Initialize Donut Chart
  useEffect(() => {
    if (!donutChartRef.current) return;
    const chart = echarts.init(donutChartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#ffffff', fontSize: 11 }
      },
      series: [
        {
          name: 'Cash Movement',
          type: 'pie',
          radius: ['62%', '85%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: 640000, name: 'Customer Receipts', itemStyle: { color: '#34d399' } },
            { value: 28000, name: 'Other Inflows', itemStyle: { color: '#a7f3d0' } },
            { value: 320000, name: 'Supplier Payments', itemStyle: { color: '#f87171' } },
            { value: 180000, name: 'Payroll', itemStyle: { color: '#fb7185' } },
            { value: 124000, name: 'Tax Payments', itemStyle: { color: '#e11d48' } },
            { value: 156000, name: 'Other Outflows', itemStyle: { color: '#fca5a5' } }
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
  }, []);

  const weeklyBreakdownData = [
    { week: 'W1 (Oct 01)', open: '£420,000', in: '£85,000', out: '-£95,000', net: '-£10,000', close: '£410,000', isAlert: false },
    { week: 'W2 (Oct 08)', open: '£410,000', in: '£72,000', out: '-£87,000', net: '-£15,000', close: '£395,000', isAlert: false },
    { week: 'W3 (Oct 15)', open: '£395,000', in: '£68,000', out: '-£92,000', net: '-£24,000', close: '£371,000', isAlert: false },
    { week: 'W4 (Oct 22)', open: '£371,000', in: '£64,000', out: '-£78,000', net: '-£14,000', close: '£357,000', isAlert: false },
    { week: 'W5 (Oct 29)', open: '£357,000', in: '£55,000', out: '-£88,000', net: '-£33,000', close: '£324,000', isAlert: false },
    { week: 'W6 (Nov 05)', open: '£324,000', in: '£60,000', out: '-£95,000', net: '-£35,000', close: '£289,000', isAlert: false },
    { week: 'W7 (Nov 12)', open: '£289,000', in: '£42,000', out: '-£102,000', net: '-£60,000', close: '£229,000', isAlert: false },
    { week: 'W8 (Nov 19)', open: '£229,000', in: '£38,000', out: '-£58,000', net: '-£20,000', close: '£209,000', isAlert: false },
    { week: 'W9 (Nov 26)', open: '£209,000', in: '£25,000', out: '-£50,000', net: '-£25,000', close: '£184,000', isAlert: true },
  ];

  return (
    <div className="space-y-4 text-slate-800">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {/* Date Picker Button */}
        <button className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>Oct 01, 2026 – Dec 31, 2026</span>
        </button>

        {/* Scenario Selector */}
        <div className="relative">
          <select className="appearance-none bg-white border border-slate-200/90 rounded-xl pr-8 pl-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition outline-none cursor-pointer">
            <option>Base Scenario</option>
            <option>Optimistic Scenario</option>
            <option>Conservative Scenario</option>
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Refresh Button */}
        <button className="flex items-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl px-4 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Forecast</span>
        </button>
      </div>

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Current Cash Balance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Current Cash Balance</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">£420,000</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              ↑ 12%
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">vs. previous period</span>
            {/* Sparkline Graphic */}
            <svg className="w-14 h-5 text-blue-500 overflow-visible" viewBox="0 0 50 20">
              <path d="M0,15 Q12,12 25,8 T50,2" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 2: Projected Minimum Cash */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Projected Minimum Cash</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">£184,000</span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              ↓ 36%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">in Week 9 (Nov 26, 2026)</p>
        </div>

        {/* Card 3: Projected Ending Cash */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Coins className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Projected Ending Cash</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">£260,000</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              ↑ 8%
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">by Week 13 (Dec 31, 2026)</span>
            <svg className="w-14 h-5 text-emerald-500 overflow-visible" viewBox="0 0 50 20">
              <path d="M0,18 Q15,15 30,10 T50,4" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 4: Cash Runway */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Cash Runway</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">10 Weeks</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">based on forecast outflows</span>
            {/* Bar indicators */}
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 bg-emerald-300 h-2 rounded-xs" />
              <span className="w-1 bg-emerald-400 h-3 rounded-xs" />
              <span className="w-1 bg-emerald-500 h-4 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Card 5: Net Cash Flow */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <ArrowUpDown className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Net Cash Flow (13 Weeks)</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-rose-600 tracking-tight">-£160,000</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <div>
              <span>Total inflows £640K</span>
              <span className="block">Total outflows £800K</span>
            </div>
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 bg-emerald-400 h-4 rounded-xs" />
              <span className="w-1.5 bg-rose-400 h-5 rounded-xs" />
              <span className="w-1.5 bg-rose-300 h-3 rounded-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Forecast Chart & AI Insight Sidebar (Middle Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: 13-Week Cash Forecast Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">13-Week Cash Forecast</h2>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>Cash Balance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-400" />
                <span>Inflows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-400" />
                <span>Outflows</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-4 border-b-2 border-dashed border-rose-500" />
                <span>Minimum Threshold</span>
              </div>

              <div className="relative ml-2">
                <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-2.5 py-1 text-xs text-slate-700 outline-none cursor-pointer">
                  <option>View as</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative">
            <div ref={forecastChartRef} className="h-72 w-full" />

            {/* Popover Callout box for Week 9 */}
            <div className="absolute left-[64%] top-[40%] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 text-center pointer-events-none z-10 animate-pulse">
              <div className="text-[10px] font-bold text-slate-700">Week 9</div>
              <div className="text-sm font-extrabold text-rose-600">£184,000</div>
              <div className="text-[9.5px] text-slate-400 font-medium">Lowest cash position</div>
              <div className="w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Insight (Beta) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">AI Insight</h2>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Beta</span>
              </div>
              <span className="text-[11px] text-slate-400">Last updated: 2 hours ago</span>
            </div>

            {/* Red Alert Banner */}
            <div className="bg-rose-50/90 border border-rose-100 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="text-xs font-bold text-rose-700">Cash pressure expected in Week 9</span>
                </div>
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">High</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Your projected minimum cash is <strong className="text-slate-900">£184,000</strong>, which is <strong className="text-rose-600">£66,000</strong> below your configured safety threshold of £250,000.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 text-xs border-b border-slate-100 pb-2">
              <button
                onClick={() => setActiveTab('why')}
                className={cn(
                  "font-bold transition cursor-pointer pb-0.5",
                  activeTab === 'why' ? "text-slate-900 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Why is this happening?
              </button>
              <button
                onClick={() => setActiveTab('drivers')}
                className={cn(
                  "font-medium transition cursor-pointer pb-0.5",
                  activeTab === 'drivers' ? "text-slate-900 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Key Drivers
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={cn(
                  "font-medium transition cursor-pointer pb-0.5",
                  activeTab === 'actions' ? "text-slate-900 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Recommended Actions
              </button>
            </div>

            {/* Bullets List */}
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <span>Large supplier payments of £120,000 in Week 7–9</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <span>Payroll outflow of £85,000 in Week 8</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <span>Tax payment of £62,000 in Week 9</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <span>Receivables collection is lower than average</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                <span>No significant inflows expected in this period.</span>
              </li>
            </ul>
          </div>

          {/* Yellow Lightbulb Recommendation Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 mt-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 shrink-0">
              <Lightbulb className="h-4 w-4" />
            </div>
            <p className="text-[11.5px] text-amber-900 font-medium leading-normal">
              Consider accelerating receivables collection or negotiating supplier payment terms to improve cash position.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom 3 Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Weekly Breakdown Table */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Weekly Breakdown</h2>
            <div className="relative">
              <button className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                <Download className="h-3 w-3 text-slate-400" />
                <span>Export</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2 font-medium">Week</th>
                  <th className="pb-2 text-right font-medium">Opening Cash</th>
                  <th className="pb-2 text-right font-medium">Inflows</th>
                  <th className="pb-2 text-right font-medium">Outflows</th>
                  <th className="pb-2 text-right font-medium">Net Flow</th>
                  <th className="pb-2 text-right font-medium">Closing Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {weeklyBreakdownData.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors",
                      r.isAlert ? "bg-rose-50/80 font-bold text-rose-600" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="py-2">{r.week}</td>
                    <td className="py-2 text-right">{r.open}</td>
                    <td className="py-2 text-right">{r.in}</td>
                    <td className="py-2 text-right">{r.out}</td>
                    <td className={cn("py-2 text-right", r.isAlert ? "text-rose-600 font-bold" : "text-rose-500")}>
                      {r.net}
                    </td>
                    <td className="py-2 text-right font-semibold">{r.close}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Cash Inflows vs Outflows Donut Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Cash Inflows vs Outflows</h2>
              <div className="relative">
                <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-2.5 py-1 text-xs text-slate-700 outline-none cursor-pointer">
                  <option>This Period</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 items-center gap-2">
              {/* Donut Chart with Center Text */}
              <div className="relative h-44 w-full">
                <div ref={donutChartRef} className="h-full w-full" />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-slate-900">£1.44M</span>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-tight">Total Movement</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#34d399] shrink-0" />
                    <span className="text-slate-600 truncate">Customer Receipts</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">£640,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">44%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#a7f3d0] shrink-0" />
                    <span className="text-slate-600 truncate">Other Inflows</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">£28,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">2%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#f87171] shrink-0" />
                    <span className="text-slate-600 truncate">Supplier Payments</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-600">-£320,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">22%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#fb7185] shrink-0" />
                    <span className="text-slate-600 truncate">Payroll</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-600">-£180,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">12%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#e11d48] shrink-0" />
                    <span className="text-slate-600 truncate">Tax Payments</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-600">-£124,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">9%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#fca5a5] shrink-0" />
                    <span className="text-slate-600 truncate">Other Outflows</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-600">-£156,000</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">11%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Blue Callout Box */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5">
            <div className="p-1 rounded bg-blue-100 text-blue-600 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-blue-900 block">Inflows cover 80% of total outflows.</span>
              <span className="text-blue-700 text-[11.5px]">There is a net cash outflow of £160,000 over 13 weeks.</span>
            </div>
          </div>
        </div>

        {/* Card 3: Scenario Analysis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Scenario Analysis</h2>
              <button className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer">
                <Sliders className="h-3.5 w-3.5" />
                <span>Simulate</span>
              </button>
            </div>

            {/* Scenario Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Scenario</label>
              <div className="relative">
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs outline-none cursor-pointer"
                >
                  <option value="1">1. Improve Receivables (Collect £100K early)</option>
                  <option value="2">2. Delay Supplier Payments (+14 Days)</option>
                  <option value="3">3. Reduce Operating Expenses (-10%)</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Interactive Sliders */}
            <div className="space-y-3 pt-1">
              {/* Additional Receipts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Additional Receipts</span>
                  <span className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                    £{additionalReceipts.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="250000"
                  step="10000"
                  value={additionalReceipts}
                  onChange={(e) => setAdditionalReceipts(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Delay Supplier Payments */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Delay Supplier Payments (days)</span>
                  <span className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                    {delayPayments}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={delayPayments}
                  onChange={(e) => setDelayPayments(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Reduce Operating Expenses */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Reduce Operating Expenses</span>
                  <span className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                    {reduceExpenses}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={reduceExpenses}
                  onChange={(e) => setReduceExpenses(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Bottom Green Callout Box */}
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 flex items-start gap-2.5">
            <div className="p-1 rounded bg-emerald-100 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-emerald-950 block">
                Projected minimum cash increases to £284,000
              </span>
              <span className="text-emerald-800 text-[11.5px] block">
                Your cash position improves by £100,000 in Week 9.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
