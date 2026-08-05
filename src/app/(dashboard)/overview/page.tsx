"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as echarts from 'echarts/core';
import { LineChart, GaugeChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register the required ECharts features
echarts.use([
  LineChart,
  GaugeChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);
import {
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  Landmark,
  Layers,
  Briefcase,
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function OverviewPage() {
  const [revenueTimeframe, setRevenueTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for ECharts initialization
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const healthGaugeRef = useRef<HTMLDivElement>(null);
  const dataQualityRef = useRef<HTMLDivElement>(null);

  // 1. Metric Cards data
  const metricCards = [
    {
      title: "Revenue (MTD)",
      value: "₹42,58,450",
      change: "↑ 18.6% vs Mar 2024",
      changeClass: "text-[#10b981]",
      iconBg: "bg-[#e8f0fe] rounded-xl border border-blue-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.34 19a10 10 0 1 1 17.32 0" />
          <polyline points="12 12 16 8" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      )
    },
    {
      title: "Net Profit (MTD)",
      value: "₹8,75,210",
      change: "↑ 12.4% vs Mar 2024",
      changeClass: "text-[#10b981]",
      iconBg: "bg-[#e6fcf5] rounded-xl border border-emerald-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="13" width="4" height="7" rx="1" />
          <rect x="10" y="8" width="4" height="12" rx="1" />
          <rect x="17" y="3" width="4" height="17" rx="1" />
          <path d="M5 11c3-4 6-4 14-8" />
        </svg>
      )
    },
    {
      title: "Total Cash",
      value: "₹15,64,320",
      change: "↑ 5.3% vs Mar 2024",
      changeClass: "text-[#10b981]",
      iconBg: "bg-[#e6fcf5] rounded-xl border border-emerald-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    },
    {
      title: "Accounts Receivable",
      value: "₹18,32,450",
      change: "↑ 8.7% vs Mar 2024",
      changeClass: "text-[#f59e0b]",
      iconBg: "bg-[#fef3c7] rounded-xl border border-amber-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
          <circle cx="15" cy="15" r="2" />
        </svg>
      )
    },
    {
      title: "Accounts Payable",
      value: "₹9,21,300",
      change: "↓ -3.2% vs Mar 2024",
      changeClass: "text-[#10b981]",
      iconBg: "bg-[#f3e8ff] rounded-xl border border-purple-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />
          <path d="M12 7V3" />
          <circle cx="12" cy="14" r="3" />
        </svg>
      )
    }
  ];

  // 2. Initialize Revenue Trend Line Chart
  useEffect(() => {
    if (!revenueChartRef.current) return;
    const chartInstance = echarts.init(revenueChartRef.current);

    const option = {
      grid: {
        left: '2%',
        right: '2%',
        top: '12%',
        bottom: '5%',
        containLabel: true
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowBlur: 10,
        textStyle: {
          color: '#334155',
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 11
        },
        formatter: function (params: any) {
          const curr = params[0];
          const prev = params[1];
          const valFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(curr.value);
          const prevVal = prev ? prev.value : 3590000;
          const pct = (((curr.value - prevVal) / prevVal) * 100).toFixed(1);
          return `
            <div style="font-family: var(--font-sans), sans-serif; min-width: 130px;">
              <div style="color: #94a3b8; font-weight: 600; margin-bottom: 4px;">${curr.axisValue} 2024</div>
              <div style="display: flex; items-center: center; gap: 6px; font-weight: bold; color: #334155;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0064eb;"></span>
                <span>Revenue</span>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px;">${valFormatted}</div>
              <div style="color: #10b981; font-weight: 600; margin-top: 2px;">↑ ${pct}% vs Apr 2023</div>
            </div>
          `;
        }
      },
      legend: {
        data: ['Current Year (2024)', 'Previous Year (2023)'],
        right: '0',
        top: '0',
        icon: 'circle',
        textStyle: {
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'var(--font-sans), sans-serif'
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-sans), sans-serif' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: '#f8fafc',
            type: 'dashed'
          }
        },
        axisLabel: {
          formatter: (val: number) => `₹${val / 100000}L`,
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 500,
          fontFamily: 'var(--font-sans), sans-serif'
        }
      },
      series: [
        {
          name: 'Current Year (2024)',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#0064eb', borderWidth: 2 },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 100, 235, 0.10)' },
                { offset: 1, color: 'rgba(0, 100, 235, 0.00)' }
              ]
            }
          },
          data: [2500000, 2800000, 2600000, 4258450, 4500000, 4100000, 4800000, 5200000, 4900000, 5600000, 5800000, 6100000]
        },
        {
          name: 'Previous Year (2023)',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#10b981', borderWidth: 2 },
          lineStyle: { width: 2, type: 'dashed' },
          data: [2100000, 2300000, 2100000, 3590000, 3700000, 3400000, 4000000, 4400000, 4100000, 4700000, 4900000, 5100000]
        }
      ]
    };

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [revenueTimeframe]);

  // 3. Initialize Business Health Score Gauge
  useEffect(() => {
    if (!healthGaugeRef.current) return;
    const chartInstance = echarts.init(healthGaugeRef.current);

    const option = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          radius: '95%',
          center: ['50%', '75%'],
          progress: {
            show: true,
            width: 9,
            itemStyle: {
              color: '#22c55e'
            }
          },
          axisLine: {
            lineStyle: {
              width: 9,
              color: [[1, '#f1f5f9']]
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, -10],
            fontSize: 32,
            fontWeight: '850',
            formatter: '{value}/100',
            color: '#0f172a',
            fontFamily: 'var(--font-sans), sans-serif'
          },
          data: [{ value: 92 }]
        }
      ]
    };

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, []);

  // 4. Initialize Data Quality Doughnut
  useEffect(() => {
    if (!dataQualityRef.current) return;
    const chartInstance = echarts.init(dataQualityRef.current);

    const option = {
      series: [
        {
          type: 'pie',
          radius: ['60%', '80%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: false } },
          data: [
            { value: 87, itemStyle: { color: '#10b981' } },
            { value: 13, itemStyle: { color: '#f1f5f9' } }
          ]
        }
      ]
    };

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, []);

  return (
    <div className="space-y-6 max-w-full">
      {/* 1. Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card, idx) => {
          const parts = card.change.split(' vs ');
          const percentPart = parts[0];
          const labelPart = parts[1] ? ` vs ${parts[1]}` : '';
 
          return (
            <div key={idx} className="flex items-center gap-3.5 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 select-none h-[92px]">
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-3xs", card.iconBg)}>
                {card.icon}
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-[11px] font-medium text-slate-500 leading-none truncate">{card.title}</span>
                <h4 className="text-[20px] font-bold text-slate-800 leading-none mt-1.5 tracking-normal truncate">{card.value}</h4>
                <p className="text-[11px] font-medium mt-1 leading-none whitespace-nowrap">
                  <span className={card.changeClass}>{percentPart}</span>
                  <span className="text-slate-400">{labelPart}</span>
                </p>
              </div>
            </div>
          );
        })}
 
        {/* Bank Reconciliation Card */}
        <div className="flex items-center justify-between bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 select-none h-[92px]">
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-[11px] font-medium text-slate-500 leading-none truncate">Bank Reconciliation</span>
            <h4 className="text-[20px] font-bold text-slate-800 leading-none mt-1.5">92%</h4>
            <p className="text-[11px] font-medium mt-1 leading-none whitespace-nowrap">
              <span className="text-[#10b981]">↑ 5%</span>
              <span className="text-slate-400"> vs Mar 2024</span>
            </p>
          </div>
          <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100" strokeWidth="2.5" stroke="currentColor" />
              <circle cx="18" cy="18" r="16" fill="none" className="text-emerald-500" strokeWidth="2.5" strokeDasharray="92, 100" strokeLinecap="round" stroke="currentColor" />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Line Chart, Health Score, Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue Trend Line Chart */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Revenue Trend</h3>
            
            <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50 select-none">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRevenueTimeframe(mode)}
                  className={cn(
                    "px-2.5 py-1 text-[9.5px] font-bold rounded transition cursor-pointer outline-none",
                    revenueTimeframe === mode 
                      ? "bg-white shadow-2xs text-primary font-bold" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart Container utilizing direct ref to mount successfully under React 19 */}
          <div className="h-68 w-full flex-1 min-h-[270px]">
            <div ref={revenueChartRef} className="w-full h-full" />
          </div>
        </div>

        {/* Business Health Score Gauge */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Business Health Score</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>

          <div className="relative flex flex-col items-center justify-center flex-1 min-h-[125px]">
            <div ref={healthGaugeRef} className="w-full h-28" />
            <div className="text-center mt-1">
              <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Excellent</span>
              <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-normal">Your business is in great shape!</p>
            </div>
          </div>

          {/* KPI progress bars color matching mockup */}
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-50 shrink-0">
            {[
              { label: 'Profitability', value: 95, colorClass: "bg-[#10b981]" },
              { label: 'Liquidity', value: 88, colorClass: "bg-[#0064eb]" },
              { label: 'Efficiency', value: 90, colorClass: "bg-[#f59e0b]" },
              { label: 'Solvency', value: 87, colorClass: "bg-[#ef4444]" },
              { label: 'Growth', value: 93, colorClass: "bg-[#10b981]" },
            ].map((kpi, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
                  <span>{kpi.label}</span>
                  <span className="text-slate-700 font-bold">{kpi.value}/100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className={cn("h-full rounded-full", kpi.colorClass)} style={{ width: `${kpi.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Notifications with structured rows */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Alerts & Notifications</h3>
            <Link href="/alerts" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[350px] pr-1">
            {[
              {
                title: "12 Invoices are overdue",
                sub: "Total: ₹4,32,250",
                time: "2h ago",
                color: "bg-red-500",
                icon: "!"
              },
              {
                title: "Bank reconciliation pending",
                sub: "2 accounts",
                time: "5h ago",
                color: "bg-emerald-500",
                icon: "✓"
              },
              {
                title: "GST return due in 4 days",
                sub: "Period: Apr 2024",
                time: "1d ago",
                color: "bg-amber-500",
                icon: "!"
              },
              {
                title: "3 Bills are overdue",
                sub: "Total: ₹1,25,600",
                time: "1d ago",
                color: "bg-red-500",
                icon: "!"
              },
              {
                title: "New bank transactions",
                sub: "18 transactions",
                time: "2d ago",
                color: "bg-blue-500",
                icon: "i"
              }
            ].map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[11px] leading-normal p-2.5 rounded-lg border border-slate-100 bg-slate-50/30">
                <div className={cn("flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-white font-bold text-[10px]", alert.color)}>
                  {alert.icon}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-slate-700 truncate">{alert.title}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium shrink-0">{alert.time}</span>
                  </div>
                  <div className="text-[10px] text-slate-450 font-semibold">{alert.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Tables and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Overdue Invoices Table */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs overflow-hidden select-none">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-[13.5px] font-bold text-slate-800">Top Overdue Invoices</h3>
            <Link href="/invoices" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Invoice #</th>
                  <th className="py-3 px-2">Due Date</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                  <th className="py-3 px-2 text-right w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'ABC Pvt Ltd', id: 'INV-0425', due: '10 Apr 2024', amount: '₹1,25,000', days: '15 days' },
                  { name: 'XYZ Enterprises', id: 'INV-0418', due: '05 Apr 2024', amount: '₹98,500', days: '20 days' },
                  { name: 'Global Solutions', id: 'INV-0409', due: '28 Mar 2024', amount: '₹75,250', days: '28 days' },
                  { name: 'TechSoft India', id: 'INV-0387', due: '20 Mar 2024', amount: '₹65,000', days: '36 days' },
                  { name: 'Bright Future Pvt Ltd', id: 'INV-0376', due: '15 Mar 2024', amount: '₹48,500', days: '41 days' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-bold text-slate-700">{row.name}</td>
                    <td className="py-3 px-2 text-slate-400 font-semibold">{row.id}</td>
                    <td className="py-3 px-2 text-slate-400 font-semibold">{row.due}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-800">{row.amount}</td>
                    <td className="py-3 px-2 text-right font-bold text-[#ef4444]">{row.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank Accounts feeds list */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
            <h3 className="text-[13.5px] font-bold text-slate-800">Bank Accounts</h3>
            <Link href="/cash-flow" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-0 divide-y divide-slate-100">
            {[
              {
                name: 'HDFC Bank - 1010',
                balance: '₹6,45,230',
                update: 'Updated 2 min ago',
                isNegative: false,
                logo: (
                  <svg className="h-5.5 w-5.5 rounded shrink-0 border border-blue-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" fill="#004c8f" />
                    <rect x="5" y="5" width="14" height="14" fill="#ffffff" />
                    <rect x="8.5" y="8.5" width="7" height="7" fill="#004c8f" />
                    <rect x="11" y="5" width="2" height="14" fill="#004c8f" />
                    <rect x="5" y="11" width="14" height="2" fill="#004c8f" />
                  </svg>
                )
              },
              {
                name: 'ICICI Bank - 9876',
                balance: '₹4,32,120',
                update: 'Updated 2 min ago',
                isNegative: false,
                logo: (
                  <svg className="h-5.5 w-5.5 rounded shrink-0 border border-orange-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" fill="#f26e21" />
                    <circle cx="12" cy="12" r="7" fill="#ffffff" />
                    <path d="M12 9v6M10 9h4M10 15h4" stroke="#f26e21" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                name: 'State Bank of India - 5555',
                balance: '₹2,15,870',
                update: 'Updated 2 min ago',
                isNegative: false,
                logo: (
                  <svg className="h-5.5 w-5.5 rounded shrink-0 border border-cyan-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" fill="#00a8e8" />
                    <circle cx="12" cy="11" r="5" stroke="#ffffff" strokeWidth="2" fill="none" />
                    <line x1="12" y1="13.5" x2="12" y2="19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                name: 'Axis Bank - 1234',
                balance: '₹2,71,100',
                update: 'Updated 2 min ago',
                isNegative: false,
                logo: (
                  <svg className="h-5.5 w-5.5 rounded shrink-0 border border-rose-900/20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" fill="#841a41" />
                    <path d="M12 5l6 14H6l6-14z" fill="#ffffff" />
                    <path d="M12 9l3.5 8h-7L12 9z" fill="#841a41" />
                    <line x1="10" y1="14" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.2" />
                  </svg>
                )
              },
              {
                name: 'Kotak Bank - 4321',
                balance: '-₹48,000',
                update: 'Updated 2 min ago',
                isNegative: true,
                logo: (
                  <svg className="h-5.5 w-5.5 rounded shrink-0 border border-red-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" fill="#d81d24" />
                    <circle cx="12" cy="12" r="7" stroke="#ffffff" strokeWidth="1.8" fill="none" />
                    <path d="M9.5 9v6M13.5 9l-2.5 3 2.5 3M11 12h2" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              }
            ].map((bank, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  {bank.logo}
                  <span className="font-bold text-slate-700 text-[11.5px]">{bank.name}</span>
                </div>
                <div className="flex items-center gap-3.5">
                  <span className={cn(
                    "font-bold text-[11.5px]",
                    bank.isNegative ? "text-red-500" : "text-slate-800"
                  )}>
                    {bank.balance}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {bank.update}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit & Loss summary widget */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
            <h3 className="text-[13.5px] font-bold text-slate-800">Profit & Loss (MTD)</h3>
            <Link href="/reports" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
              <span>View Report</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-4 pt-2">
            {[
              { label: 'Revenue', value: '₹42,58,450', percent: 100, color: 'bg-emerald-500', showBar: true },
              { label: 'Cost of Goods Sold', value: '₹21,45,230', percent: 50.4, color: 'bg-red-500', showBar: true },
              { label: 'Gross Profit', value: '₹21,13,220', percent: 49.6, showBar: false, isLabelBold: true, hasDividerAbove: true },
              { label: 'Operating Expenses', value: '₹12,38,010', percent: 29.1, color: 'bg-red-500', showBar: true },
              { label: 'Net Profit', value: '₹8,75,210', percent: 20.5, color: 'bg-emerald-500', showBar: true, isLabelBold: true, hasDividerAbove: true },
            ].map((row, idx) => (
              <React.Fragment key={idx}>
                {row.hasDividerAbove && (
                  <div className="border-t border-slate-100 my-2.5" />
                )}
                <div className="grid grid-cols-[120px_1fr_95px] gap-2 items-center text-[11px] min-h-[32px]">
                  <div className="flex flex-col min-w-0">
                    <span className={cn(row.isLabelBold ? "font-bold text-slate-800" : "text-slate-500 font-semibold", "truncate")}>
                      {row.label}
                    </span>
                    {row.label === 'Gross Profit' && <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">49.6%</span>}
                    {row.label === 'Net Profit' && <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">20.5%</span>}
                  </div>
                  
                  <div className="flex-1 px-1">
                    {row.showBar && row.percent ? (
                      <div className="h-1 w-full bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", row.color)} style={{ width: `${row.percent}%` }} />
                      </div>
                    ) : (
                      <div className="h-1 w-full" />
                    )}
                  </div>

                  <div className="text-right font-bold text-slate-800 text-[11.5px] whitespace-nowrap">
                    {row.value}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="text-center pt-2">
            <span className="text-[9.5px] text-slate-400 font-semibold">*All values are in INR</span>
          </div>
        </div>
      </div>

      {/* 4. Bottom-Most Grid: Data Quality, Sync Status, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Data Quality Score Card */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Data Quality Score</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>

          <div className="flex items-center gap-5 flex-1 py-1">
            {/* Doughnut Chart on Left */}
            <div className="flex items-center gap-3">
              <div className="relative h-18 w-18 shrink-0 flex items-center justify-center">
                <div ref={dataQualityRef} className="w-full h-full" />
                <div className="absolute text-center">
                  <span className="text-[15px] font-extrabold text-slate-800 leading-none">87%</span>
                </div>
              </div>
              <div className="flex flex-col select-none shrink-0">
                <span className="text-[12.5px] font-bold text-[#10b981]">Good</span>
                <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 leading-none">Improve data accuracy</span>
              </div>
            </div>

            {/* List on Right */}
            <div className="flex-1 space-y-2 pl-4 border-l border-slate-100">
              {[
                { label: 'Missing Customer Email', value: 18 },
                { label: 'Missing GSTIN', value: 12 },
                { label: 'Duplicate Contacts', value: 7 },
                { label: 'Missing Tax Rate', value: 5 }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10.5px]">
                  <span className="font-semibold text-slate-500">{item.label}</span>
                  <span className="font-extrabold text-red-500">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Xero Sync Status */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="pb-3 flex flex-col gap-1.5 shrink-0 select-none">
            <h3 className="text-[13.5px] font-bold text-slate-800">Xero Sync Status</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#10b981] font-bold">
              <svg className="h-3.5 w-3.5 text-[#10b981]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>All systems operational</span>
            </div>
          </div>

          {/* 4 Box Grid Layout matching mockup */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-lg flex flex-col justify-between h-[74px]">
              <span className="text-[9px] font-semibold text-slate-400">Last Sync</span>
              <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">2 min ago</span>
              <span className="text-[8px] text-slate-400 font-semibold">Successful</span>
            </div>
            <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-lg flex flex-col justify-between h-[74px]">
              <span className="text-[9px] font-semibold text-slate-400">Records Synced</span>
              <span className="text-[11px] font-bold text-slate-800">25,430</span>
              <span className="text-[8px] text-[#10b981] font-bold">+124 today</span>
            </div>
            <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-lg flex flex-col justify-between h-[74px]">
              <span className="text-[9px] font-semibold text-slate-400">API Calls</span>
              <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">1,250/5,000</span>
              <span className="text-[8px] text-[#10b981] font-bold">25% used</span>
            </div>
            <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-lg flex flex-col justify-between h-[74px]">
              <span className="text-[9px] font-semibold text-slate-400">Next Sync</span>
              <span className="text-[11px] font-bold text-slate-800">In 8 min</span>
              <span className="text-[8px] text-slate-400 font-semibold">Auto</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Quick Actions</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
          
          <div className="grid grid-cols-5 gap-2 mt-1">
            {[
              { 
                label: 'Sync Now', 
                icon: (
                  <svg className="h-4.5 w-4.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                ), 
                onClick: () => toast.success("Syncing triggered!") 
              },
              { 
                label: 'Import Bank Transactions', 
                icon: (
                  <svg className="h-4.5 w-4.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                ), 
                onClick: () => toast.info("Opening bank feeds import...") 
              },
              { 
                label: 'Reconcile Accounts', 
                icon: (
                  <svg className="h-4.5 w-4.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="m9 15 2 2 4-4" />
                  </svg>
                ), 
                onClick: () => toast.success("Loading pending transactions...") 
              },
              { 
                label: 'Run Reports', 
                icon: (
                  <svg className="h-4.5 w-4.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" />
                    <path d="M9 12h6M9 16h6" />
                  </svg>
                ), 
                onClick: () => toast.info("Generating statement export options...") 
              },
              { 
                label: 'Data Quality Check', 
                icon: (
                  <svg className="h-4.5 w-4.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                ), 
                onClick: () => toast.info("Running compliance audit...") 
              },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex flex-col items-center justify-between p-3.5 h-[98px] rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50/50 transition cursor-pointer text-center outline-none shrink-0"
              >
                <div className="flex-1 flex items-center justify-center">
                  {action.icon}
                </div>
                <span className="text-[9px] font-bold text-slate-500 leading-tight block text-wrap mt-2">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
