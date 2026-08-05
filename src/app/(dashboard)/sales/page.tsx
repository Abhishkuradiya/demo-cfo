"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSidebarStore } from '@/store/sidebar-store';
import {
  Plus,
  ChevronDown,
  FileDown,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MoreVertical,
  ArrowUpRight,
  ExternalLink,
  Info,
  AlertTriangle,
  Lightbulb,
  ShoppingBag
} from 'lucide-react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts modules
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);

export default function SalesDashboardPage() {
  const { isCollapsed, setCollapsed } = useSidebarStore();
 
  useEffect(() => {
    // Auto-collapse sidebar by default on Sales Dashboard page
    setCollapsed(true);
  }, [setCollapsed]);
 
  // Chart refs
  const revenueOverTimeRef = useRef<HTMLDivElement>(null);
  const revenueBySourceRef = useRef<HTMLDivElement>(null);
  const revenueByCategoryRef = useRef<HTMLDivElement>(null);
  const grossProfitAnalysisRef = useRef<HTMLDivElement>(null);

  // Timeframe active state
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Metric Cards
  const metricCards = [
    {
      title: "Total Revenue",
      value: "₹4,25,83,450",
      change: "↑ 18.6% vs Mar 1 - Mar 31",
      changeClass: "text-[#10b981]",
      iconBg: "bg-blue-50/50 border border-blue-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#0064eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a3 3 0 0 0-3 3c0 .54.18 1.04.48 1.45A6.5 6.5 0 0 0 5 13.5a6.5 6.5 0 0 0 13 0c0-2.34-1.24-4.38-3.08-5.5.3-.4.48-.9.48-1.45a3 3 0 0 0-3-3z" />
          <path d="M8.5 8h7" />
          <path d="M12 10.5v5M10.5 13h3" />
        </svg>
      )
    },
    {
      title: "Gross Profit",
      value: "₹1,63,25,430",
      change: "↑ 16.3% vs Mar 1 - Mar 31",
      changeClass: "text-[#10b981]",
      iconBg: "bg-emerald-50/50 border border-emerald-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <circle cx="12" cy="14" r="1.5" />
        </svg>
      )
    },
    {
      title: "Orders",
      value: "8,753",
      change: "↑ 12.7% vs Mar 1 - Mar 31",
      changeClass: "text-[#10b981]",
      iconBg: "bg-purple-50/50 border border-purple-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    },
    {
      title: "Average Order Value",
      value: "₹4,862",
      change: "↓ -2.1% vs Mar 1 - Mar 31",
      changeClass: "text-[#ef4444]",
      iconBg: "bg-amber-50/50 border border-amber-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <path d="M12 9v6M10 12h4" />
        </svg>
      )
    },
    {
      title: "New Customers",
      value: "1,253",
      change: "↑ 15.8% vs Mar 1 - Mar 31",
      changeClass: "text-[#10b981]",
      iconBg: "bg-cyan-50/50 border border-cyan-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#06b6d4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      title: "Returning Customers",
      value: "3,054",
      change: "↑ 9.4% vs Mar 1 - Mar 31",
      changeClass: "text-[#10b981]",
      iconBg: "bg-pink-50/50 border border-pink-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#ec4899]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      )
    },
    {
      title: "Refunds",
      value: "₹12,48,230",
      change: "↓ -8.4% vs Mar 1 - Mar 31",
      changeClass: "text-[#ef4444]",
      iconBg: "bg-red-50/50 border border-red-100/40 rounded-xl",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#ef4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="12" cy="12" r="5" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
      )
    }
  ];

  // Initialize Row 2: Revenue Over Time Chart
  useEffect(() => {
    if (!revenueOverTimeRef.current) return;
    const chartInstance = echarts.init(revenueOverTimeRef.current);

    const option = {
      grid: {
        left: '2%',
        right: '2%',
        top: '12%',
        bottom: '5%',
        containLabel: true
      },
      tooltip: {
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
          const current = params[0];
          const previous = params[1];
          const trend = params[2];
          const currFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(current.value);
          const prevFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(previous.value);
          return `
            <div style="font-family: var(--font-sans), sans-serif; min-width: 150px;">
              <div style="color: #94a3b8; font-weight: 700; margin-bottom: 6px;">${current.axisValue} Apr 2024</div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
                <span style="display: flex; align-items: center; gap: 5px; color: #475569; font-weight: 500;">
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0064eb;"></span>
                  Revenue (Current):
                </span>
                <span style="font-weight: 700; color: #1e293b;">${currFormatted}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
                <span style="display: flex; align-items: center; gap: 5px; color: #64748b; font-weight: 500;">
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0064eb; opacity: 0.5;"></span>
                  Revenue (Previous):
                </span>
                <span style="font-weight: 700; color: #475569;">${prevFormatted}</span>
              </div>
              <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; display: flex; align-items: center; gap: 4px; color: #10b981; font-weight: 750; font-size: 10px;">
                <span>↑ 17.5%</span>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: ['Revenue (Current)', 'Revenue (Previous)', 'Trend'],
        left: '0',
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
        data: ['1 Apr', '6 Apr', '11 Apr', '16 Apr', '21 Apr', '26 Apr', '30 Apr'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-sans), sans-serif' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f8fafc', type: 'dashed' } },
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
          name: 'Revenue (Current)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: { color: '#0064eb', borderWidth: 2 },
          lineStyle: { width: 2.5 },
          data: [2200000, 3900000, 4800000, 4258450, 4900000, 3800000, 5200000]
        },
        {
          name: 'Revenue (Previous)',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, type: 'dotted', color: '#0064eb', opacity: 0.5 },
          data: [1900000, 3200000, 4100000, 3621450, 4200000, 3300000, 4600000]
        },
        {
          name: 'Trend',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, type: 'dashed', color: '#10b981' },
          data: [1600000, 2400000, 3300000, 2200000, 3700000, 2900000, 4200000]
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

  // Initialize Row 2: Revenue by Source Doughnut
  useEffect(() => {
    if (!revenueBySourceRef.current) return;
    const chartInstance = echarts.init(revenueBySourceRef.current);

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ₹{c} ({d}%)'
      },
      series: [
        {
          name: 'Revenue Source',
          type: 'pie',
          radius: ['60%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: 15621450, name: 'Xero', itemStyle: { color: '#0064eb' } },
            { value: 12234220, name: 'Shopify', itemStyle: { color: '#10b981' } },
            { value: 9524560, name: 'Amazon', itemStyle: { color: '#f59e0b' } },
            { value: 4258230, name: 'Stripe', itemStyle: { color: '#ec4899' } },
            { value: 1045990, name: 'Others', itemStyle: { color: '#94a3b8' } }
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

  // Initialize Row 3: Revenue by Product Category Doughnut
  useEffect(() => {
    if (!revenueByCategoryRef.current) return;
    const chartInstance = echarts.init(revenueByCategoryRef.current);

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ₹{c} ({d}%)'
      },
      series: [
        {
          name: 'Product Segment',
          type: 'pie',
          radius: ['60%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: 14235250, name: 'Electronics', itemStyle: { color: '#0064eb' } },
            { value: 10865430, name: 'Apparel', itemStyle: { color: '#10b981' } },
            { value: 6523110, name: 'Home & Kitchen', itemStyle: { color: '#f59e0b' } },
            { value: 4231560, name: 'Beauty & Health', itemStyle: { color: '#ec4899' } },
            { value: 6728100, name: 'Others', itemStyle: { color: '#94a3b8' } }
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

  // Initialize Row 4: Gross Profit Analysis (Multi Line)
  useEffect(() => {
    if (!grossProfitAnalysisRef.current) return;
    const chartInstance = echarts.init(grossProfitAnalysisRef.current);

    const option = {
      grid: {
        left: '2%',
        right: '2%',
        top: '12%',
        bottom: '5%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        textStyle: { color: '#334155', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10 }
      },
      legend: {
        show: false
      },
      xAxis: {
        type: 'category',
        data: ['1 Apr', '6 Apr', '11 Apr', '16 Apr', '21 Apr', '26 Apr', '30 Apr'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'var(--font-sans), sans-serif' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f8fafc', type: 'dashed' } },
        axisLabel: {
          formatter: (val: number) => `₹${val / 100000}L`,
          color: '#94a3b8',
          fontSize: 9,
          fontFamily: 'var(--font-sans), sans-serif'
        }
      },
      series: [
        {
          name: 'Revenue',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#0064eb' },
          lineStyle: { width: 2 },
          data: [3500000, 4800000, 6200000, 5200000, 6800000, 5800000, 7500000]
        },
        {
          name: 'COGS',
          type: 'line',
          smooth: true,
          symbol: 'rect',
          symbolSize: 6,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 2 },
          data: [2100000, 2800000, 3600000, 3100000, 4100000, 3500000, 4600000]
        },
        {
          name: 'Gross Profit',
          type: 'line',
          smooth: true,
          symbol: 'triangle',
          symbolSize: 6,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2 },
          data: [1400000, 2000000, 2600000, 2100000, 2700000, 2300000, 2900000]
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
      {/* Secondary Actions Row */}
      <div className="flex items-center justify-between pb-1 select-none">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Metrics Snapshot</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast.success("Widget catalog loading...")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-650 cursor-pointer outline-none transition shadow-2xs h-8.5"
          >
            <Plus className="h-3.5 w-3.5 text-slate-450" />
            Add Widget
          </button>
          
          <button 
            onClick={() => toast.success("Opening export configuration...")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0064eb] hover:bg-[#0052c2] active:bg-[#0047a8] text-[11px] font-bold text-white cursor-pointer outline-none transition shadow-2xs h-8.5"
          >
            <FileDown className="h-3.5 w-3.5 text-blue-100" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-blue-200" />
          </button>
        </div>
      </div>

      {/* Row 1: Metrics Cards */}
      <div className="select-none">
        {isCollapsed ? (
          /* All 7 cards in a single row when collapsed */
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {metricCards.map((card, idx) => {
              const parts = card.change.split(' vs ');
              const percentPart = parts[0];
              const labelPart = parts[1] ? ` vs ${parts[1]}` : '';
              return (
                <div key={idx} className="flex items-center gap-3.5 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 h-[92px]">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-3xs", card.iconBg)}>
                    {card.icon}
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[11.5px] font-medium text-slate-500 leading-none truncate">{card.title}</span>
                    <h4 className="text-[20px] font-bold text-slate-800 leading-none mt-1.5 tracking-normal truncate">{card.value}</h4>
                    <p className="text-[11px] font-medium mt-1 leading-none whitespace-nowrap">
                      <span className={card.changeClass}>{percentPart}</span>
                      <span className="text-slate-400">{labelPart}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 5 cards on top row, 2 cards on bottom row when sidebar is expanded */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {metricCards.slice(0, 5).map((card, idx) => {
                const parts = card.change.split(' vs ');
                const percentPart = parts[0];
                const labelPart = parts[1] ? ` vs ${parts[1]}` : '';
                return (
                  <div key={idx} className="flex items-center gap-3.5 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 h-[92px]">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-3xs", card.iconBg)}>
                      {card.icon}
                    </div>
                    <div className="flex flex-col min-w-0 justify-center">
                      <span className="text-[11.5px] font-medium text-slate-500 leading-none truncate">{card.title}</span>
                      <h4 className="text-[20px] font-bold text-slate-800 leading-none mt-1.5 tracking-normal truncate">{card.value}</h4>
                      <p className="text-[11px] font-medium mt-1 leading-none whitespace-nowrap">
                        <span className={card.changeClass}>{percentPart}</span>
                        <span className="text-slate-400">{labelPart}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {metricCards.slice(5).map((card, idx) => {
                const parts = card.change.split(' vs ');
                const percentPart = parts[0];
                const labelPart = parts[1] ? ` vs ${parts[1]}` : '';
                return (
                  <div key={idx} className="flex items-center gap-3.5 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 h-[92px]">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-3xs", card.iconBg)}>
                      {card.icon}
                    </div>
                    <div className="flex flex-col min-w-0 justify-center">
                      <span className="text-[11.5px] font-medium text-slate-500 leading-none truncate">{card.title}</span>
                      <h4 className="text-[20px] font-bold text-slate-800 leading-none mt-1.5 tracking-normal truncate">{card.value}</h4>
                      <p className="text-[11px] font-medium mt-1 leading-none whitespace-nowrap">
                        <span className={card.changeClass}>{percentPart}</span>
                        <span className="text-slate-400">{labelPart}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Revenue Over Time, Revenue by Source, Sales Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Revenue Over Time */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px]">
          <div className="flex items-start justify-between pb-3 mb-2 shrink-0 select-none">
            <div className="flex flex-col">
              <h3 className="text-[13.5px] font-bold text-slate-800">Revenue Over Time</h3>
              {/* Custom HTML Legends matching chart styles */}
              <div className="flex items-center gap-3.5 text-[9px] font-bold text-slate-400 mt-1 select-none">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#0064eb]" />
                  Revenue (Current)
                </span>
                <span className="flex items-center gap-1 text-[#0064eb] opacity-60">
                  ──♦── <span className="text-slate-400 font-bold ml-0.5">Revenue (Previous)</span>
                </span>
                <span className="flex items-center gap-1 text-[#10b981]">
                  ──▲── <span className="text-slate-400 font-bold ml-0.5">Trend</span>
                </span>
              </div>
            </div>
            
            {/* Daily Weekly Monthly Pills */}
            <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-lg">
              {([
                { mode: 'daily', label: 'Daily' },
                { mode: 'weekly', label: 'Weekly' },
                { mode: 'monthly', label: 'Monthly' }
              ] as const).map((item) => (
                <button
                  key={item.mode}
                  onClick={() => setTimeframe(item.mode)}
                  className={cn(
                    "px-3 py-1 rounded text-[9.5px] font-bold transition outline-none cursor-pointer",
                    timeframe === item.mode 
                      ? "bg-white text-slate-800 shadow-3xs" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
 
          <div className="flex-1 w-full relative min-h-[220px]">
            <div ref={revenueOverTimeRef} className="w-full h-full" />
          </div>
        </div>
 
        {/* 2. Revenue by Source */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Revenue by Source</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          {/* Side-by-Side Doughnut Chart & Legend Row */}
          <div className="flex items-center gap-3.5 flex-1 py-1">
            {/* Doughnut Chart on Left */}
            <div className="w-[125px] h-[125px] shrink-0 relative flex items-center justify-center">
              <div ref={revenueBySourceRef} className="w-full h-full" />
              <div className="absolute text-center mt-0.5">
                <span className="text-[11.5px] font-extrabold text-slate-800 leading-none">₹4.26 Cr</span>
                <p className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">Total Revenue</p>
              </div>
            </div>
 
            {/* Ledger List on Right */}
            <div className="flex-1 space-y-1.5 text-[9.5px] min-w-0">
              {[
                { name: 'Xero', val: '₹1.56 Cr', pct: '36.7%', dot: 'bg-[#0064eb]' },
                { name: 'Shopify', val: '₹1.22 Cr', pct: '28.7%', dot: 'bg-[#10b981]' },
                { name: 'Amazon', val: '₹95.2L', pct: '22.4%', dot: 'bg-[#f59e0b]' },
                { name: 'Stripe', val: '₹42.5L', pct: '10.0%', dot: 'bg-[#ec4899]' },
                { name: 'Others', val: '₹10.4L', pct: '2.2%', dot: 'bg-[#94a3b8]' }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500 min-w-0">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", row.dot)} />
                    <span className="truncate">{row.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-slate-800 text-[9.5px] leading-tight">{row.val}</div>
                    <div className="text-slate-450 font-bold text-[8px] leading-none mt-0.5">{row.pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          <Link href="/data-sources" className="text-[9.5px] font-bold text-[#0064eb] hover:underline mt-2 flex items-center gap-0.5 shrink-0">
            <span>View All Sources</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
 
        {/* 3. Sales Funnel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Sales Funnel</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          {/* SVG Inverted Funnel Design & Right Metrics list */}
          <div className="flex items-center gap-4 flex-1 py-1">
            {/* SVG Inverted Funnel */}
            <div className="w-[100px] h-[190px] shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 160">
                {/* Segment 1: Total Visitors (Blue) */}
                <polygon points="5,5 95,5 83,32 17,32" fill="#a0c3ff" />
                {/* Segment 2: Added to Cart (Light Blue) */}
                <polygon points="18,35 82,35 71,62 29,62" fill="#70a6ff" />
                {/* Segment 3: Checkout Initiated (Cyan) */}
                <polygon points="30,65 70,65 59,92 41,92" fill="#38bdfe" />
                {/* Segment 4: Orders Placed (Green) */}
                <polygon points="42,95 58,95 51,122 49,122" fill="#10b981" />
                {/* Segment 5: Conversion Rate (Dark Green) */}
                <polygon points="49.5,125 50.5,125 50,152" fill="#047857" />
              </svg>
            </div>
 
            {/* Funnel Text metrics list with Divider borders */}
            <div className="flex-1 space-y-1.5 text-[9.5px]">
              {[
                { label: 'Total Visitors', val: '2,45,890', pct: '↓ -3.2%', pctClass: 'text-[#ef4444]' },
                { label: 'Added to Cart', val: '54,320', pct: '22.1%', pctClass: 'text-slate-400' },
                { label: 'Checkout Initiated', val: '18,765', pct: '8.7%', pctClass: 'text-slate-400' },
                { label: 'Orders Placed', val: '8,753', pct: '3.6%', pctClass: 'text-slate-400' },
                { label: 'Conversion Rate', val: '3.6%', pct: '↑ 0.4%', pctClass: 'text-[#10b981]', valClass: 'text-[#10b981]' }
              ].map((row, idx) => (
                <div key={idx} className="pb-1 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="text-slate-400 font-bold text-[8px] uppercase tracking-wider leading-none">{row.label}</div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className={cn("font-extrabold text-slate-700 text-[10.5px]", row.valClass)}>{row.val}</span>
                    <span className={cn("font-bold text-[8.5px] shrink-0", row.pctClass)}>{row.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          <Link href="/reports" className="text-[9.5px] font-bold text-[#0064eb] hover:underline mt-2 flex items-center gap-0.5 shrink-0">
            <span>View Report</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Row 3: Revenue by Category, Top Customers, Region, Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* 1. Revenue by Category */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Revenue by Product Category</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          {/* Side-by-Side Doughnut Chart & Ledger Row */}
          <div className="flex items-center gap-3.5 flex-1 py-1">
            {/* Doughnut Chart on Left */}
            <div className="w-[120px] h-[120px] shrink-0 relative flex items-center justify-center">
              <div ref={revenueByCategoryRef} className="w-full h-full" />
              <div className="absolute text-center mt-0.5">
                <span className="text-[11px] font-extrabold text-slate-800 leading-none">₹4.26 Cr</span>
                <p className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">Total</p>
              </div>
            </div>
 
            {/* Ledger List on Right - 3-Column Grid */}
            <div className="flex-1 space-y-1 text-[9px] min-w-0">
              {[
                { name: 'Electronics', val: '₹1,42,35,250', pct: '33.4%', dot: 'bg-[#0064eb]' },
                { name: 'Apparel', val: '₹1,08,65,430', pct: '25.5%', dot: 'bg-[#10b981]' },
                { name: 'Home & Kitchen', val: '₹65,23,110', pct: '15.3%', dot: 'bg-[#f59e0b]' },
                { name: 'Beauty & Health', val: '₹42,31,560', pct: '9.9%', dot: 'bg-[#ec4899]' },
                { name: 'Others', val: '₹67,28,100', pct: '15.9%', dot: 'bg-[#94a3b8]' }
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1.2fr_1fr_0.6fr] gap-1 items-center py-1 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-1 font-bold text-slate-500 min-w-0">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", row.dot)} />
                    <span className="truncate">{row.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 text-[9.5px] text-right shrink-0">{row.val}</span>
                  <span className="text-slate-400 font-bold text-[8.5px] text-right shrink-0">{row.pct}</span>
                </div>
              ))}
            </div>
          </div>
 
          <Link href="/products" className="text-[9.5px] font-bold text-[#0064eb] hover:underline mt-2 flex items-center gap-0.5 shrink-0">
            <span>View All Products</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
 
        {/* 2. Top 10 Customers */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px]">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center select-none">
            <h3 className="text-[13.5px] font-bold text-slate-800">Top 10 Customers by Revenue</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          <div className="flex-1 overflow-y-auto no-scrollbar py-0.5">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase py-2">
                  <th className="py-2 px-1">Customer</th>
                  <th className="py-2 px-1 text-right">Revenue</th>
                  <th className="py-2 px-1 text-right">Orders</th>
                  <th className="py-2 px-1 text-right">AOV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[10.5px]">
                {[
                  { name: 'ABC Pvt Ltd', rev: '₹18,45,230', ord: 24, aov: '₹76,885' },
                  { name: 'Global Solutions', rev: '₹12,75,450', ord: 18, aov: '₹70,858' },
                  { name: 'TechSoft India', rev: '₹9,85,320', ord: 16, aov: '₹61,583' },
                  { name: 'Bright Future Pvt Ltd', rev: '₹8,25,410', ord: 14, aov: '₹58,957' },
                  { name: 'XYZ Enterprises', rev: '₹6,78,240', ord: 12, aov: '₹56,520' }
                ].map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-1 font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="text-[9.5px] text-slate-400 font-bold w-3">{idx + 1}</span>
                      <span className="truncate max-w-[85px]">{customer.name}</span>
                    </td>
                    <td className="py-2.5 px-1 text-right font-bold text-slate-800">{customer.rev}</td>
                    <td className="py-2.5 px-1 text-right font-bold text-slate-500">{customer.ord}</td>
                    <td className="py-2.5 px-1 text-right font-semibold text-slate-400">{customer.aov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
 
          <Link href="/customers" className="text-[9.5px] font-bold text-[#0064eb] hover:underline mt-2 flex items-center gap-0.5 shrink-0 select-none">
            <span>View All Customers</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
 
        {/* 3. Revenue by Region */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Revenue by Region</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          {/* Side-by-Side Map & Country Ledger List */}
          <div className="flex items-center gap-4 flex-1 py-1">
            {/* Map & Legend on Left */}
            <div className="w-[120px] flex flex-col justify-between h-[180px] shrink-0">
              {/* Map SVG */}
              <div className="h-28 w-full relative flex items-center justify-center opacity-85">
                <svg className="w-full h-full text-slate-200" viewBox="0 0 320 120" fill="currentColor">
                  <path d="M50 15h12v6H50zm100 20h20v8h-20zm50-10h15v5h-15zM20 40h15v10H20zm240 10h12v6h-12z" opacity="0.3" />
                  <polygon points="10,20 40,25 35,60 15,70 5,45" fill="#e2e8f0" />
                  <polygon points="50,15 80,10 95,35 75,55 55,40" fill="#e2e8f0" />
                  <polygon points="105,25 155,15 170,40 160,75 120,60" fill="#e2e8f0" />
                  <polygon points="210,10 260,20 280,65 240,80 205,50" fill="#e2e8f0" />
                  <polygon points="180,85 200,80 210,95 190,105" fill="#e2e8f0" />
                  <polygon points="70,75 90,70 105,95 85,115" fill="#e2e8f0" />
                  {/* India highlighted dot/shape */}
                  <circle cx="165" cy="55" r="5" fill="#0064eb" className="animate-pulse" />
                  <polygon points="160,50 170,48 172,56 166,60 160,56" fill="#0064eb" />
                  {/* USA shape */}
                  <circle cx="75" cy="35" r="3.5" fill="#3b82f6" />
                  {/* Europe/UK shape */}
                  <circle cx="138" cy="30" r="3" fill="#60a5fa" />
                  {/* Australia */}
                  <circle cx="250" cy="85" r="3.5" fill="#93c5fd" />
                </svg>
              </div>
              {/* Slider legend under map */}
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold pt-1.5 select-none">
                <span>Low</span>
                <div className="flex-1 mx-2.5 h-1 rounded bg-linear-to-r from-blue-100 to-blue-600" />
                <span>High</span>
              </div>
            </div>
 
            {/* Country Ledger List on Right */}
            <div className="flex-1 space-y-2 text-[9.5px]">
              {[
                { name: 'India', val: '₹2,15,45,230', pct: '50.6%', dot: 'bg-blue-600' },
                { name: 'United States', val: '₹85,24,560', pct: '20.0%', dot: 'bg-blue-450' },
                { name: 'United Kingdom', val: '₹42,31,550', pct: '9.9%', dot: 'bg-blue-300' },
                { name: 'UAE', val: '₹25,45,230', pct: '6.0%', dot: 'bg-blue-200' },
                { name: 'Australia', val: '₹18,24,890', pct: '4.3%', dot: 'bg-blue-100' }
              ].map((region, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", region.dot)} />
                    <span>{region.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 text-[9.5px]">{region.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
 
        {/* 4. Revenue Growth % */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Revenue Growth %</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          <div className="flex-1 py-1.5 flex flex-col justify-between">
            {/* Header info - Side-by-Side with Sparkline */}
            <div className="flex items-center justify-between pb-1 flex-1 min-h-[70px]">
              <div>
                <div className="text-[25px] font-extrabold text-[#10b981] leading-none">18.6%</div>
                <div className="text-[9px] text-slate-400 font-bold mt-1.5 leading-none">vs Mar 1 - Mar 31</div>
              </div>
 
              {/* SVG Sparkline with Node circles */}
              <div className="h-14 w-[130px] shrink-0 relative">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>
                  <path d="M 0,25 Q 25,18 40,22 T 80,8 T 100,5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 0,25 Q 25,18 40,22 T 80,8 T 100,5 L 100,30 L 0,30 Z" fill="url(#growthGrad)" />
                  <circle cx="0" cy="25" r="2" fill="#10b981" />
                  <circle cx="25" cy="19.5" r="2" fill="#10b981" />
                  <circle cx="40" cy="22" r="2" fill="#10b981" />
                  <circle cx="60" cy="15" r="2" fill="#10b981" />
                  <circle cx="80" cy="8" r="2" fill="#10b981" />
                  <circle cx="100" cy="5" r="2" fill="#10b981" />
                </svg>
              </div>
            </div>
 
            {/* Growth breakdown list */}
            <div className="space-y-2 border-t border-slate-50 pt-3.5 mt-2 shrink-0">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Growth Breakdown</div>
              {[
                { label: 'Organic Growth', pct: '12.4%', width: 'w-[75%]', color: 'bg-emerald-500' },
                { label: 'New Customers', pct: '6.2%', width: 'w-[45%]', color: 'bg-emerald-450' },
                { label: 'Price Increase', pct: '0.0%', width: 'w-[1px]', color: 'bg-slate-300' },
                { label: 'Others', pct: '-1.2%', width: 'w-[12%]', color: 'bg-red-400', isNegative: true }
              ].map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[9.5px]">
                    <span className="font-semibold text-slate-500">{item.label}</span>
                    <span className={cn("font-bold text-[10px]", item.isNegative ? "text-red-500" : "text-slate-800")}>{item.pct}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden flex">
                    <div className={cn("h-full rounded-full", item.color, item.width)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Collections Overview, Gross Profit Analysis, AI Insights, Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Collections Overview */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="pb-1 mb-1 shrink-0">
            <h3 className="text-[13.5px] font-bold text-slate-800">Collections Overview</h3>
          </div>
 
          <div className="flex-1 flex flex-col justify-between">
            {/* Cards 1x4 horizontal grid */}
            <div className="grid grid-cols-4 gap-2 text-[9.5px] leading-tight">
              <div className="border border-slate-150 bg-white p-3 rounded-lg flex flex-col justify-between h-[68px] min-w-0 shadow-3xs">
                <span className="text-slate-400 font-bold leading-tight">Total Receivables</span>
                <span className="text-[14px] font-extrabold text-slate-800 leading-none tracking-tight mt-1 truncate">₹1,32,45,230</span>
              </div>
              <div className="border border-slate-150 bg-white p-3 rounded-lg flex flex-col justify-between h-[68px] min-w-0 shadow-3xs">
                <span className="text-slate-400 font-bold leading-tight">Overdue Amount</span>
                <span className="text-[14px] font-extrabold text-[#ef4444] leading-none tracking-tight mt-1 truncate">₹28,65,430</span>
              </div>
              <div className="border border-slate-150 bg-white p-3 rounded-lg flex flex-col justify-between h-[68px] min-w-0 shadow-3xs">
                <span className="text-slate-400 font-bold leading-tight">Avg. Days Sales Outstanding</span>
                <span className="text-[14px] font-extrabold text-slate-800 leading-none tracking-tight mt-1 truncate">32 Days</span>
              </div>
              <div className="border border-slate-150 bg-white p-3 rounded-lg flex flex-col justify-between h-[68px] min-w-0 shadow-3xs">
                <span className="text-slate-400 font-bold leading-tight">Collection Rate</span>
                <span className="text-[14px] font-extrabold text-slate-800 leading-none tracking-tight mt-1 truncate">87.6%</span>
              </div>
            </div>
 
            {/* Aging summary segmented bar */}
            <div className="space-y-2 mt-4">
              <div className="text-[11px] font-bold text-slate-800">Aging Summary</div>
              
              {/* Colored multi bar */}
              <div className="h-3.5 w-full rounded-md overflow-hidden flex shadow-3xs">
                <div className="h-full bg-[#0064eb]" style={{ width: '56.9%' }} />
                <div className="h-full bg-[#10b981]" style={{ width: '21.6%' }} />
                <div className="h-full bg-[#f59e0b]" style={{ width: '11.5%' }} />
                <div className="h-full bg-[#ec4899]" style={{ width: '10%' }} />
              </div>
 
              {/* Horizontal 4-Column Stacked Legend list */}
              <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-slate-500 mt-2">
                <div className="flex flex-col">
                  <span>0-30 Days</span>
                  <span className="text-slate-400 font-medium mt-1">₹75,45,230 (56.9%)</span>
                </div>
                <div className="flex flex-col">
                  <span>31-60 Days</span>
                  <span className="text-slate-400 font-medium mt-1">₹28,65,230 (21.6%)</span>
                </div>
                <div className="flex flex-col">
                  <span>61-90 Days</span>
                  <span className="text-slate-400 font-medium mt-1">₹15,25,430 (11.5%)</span>
                </div>
                <div className="flex flex-col">
                  <span>90+ Days</span>
                  <span className="text-slate-400 font-medium mt-1">₹13,09,340 (9.8%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
 
        {/* 2. Gross Profit Analysis */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">Gross Profit Analysis</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          <div className="flex-1 flex flex-col justify-between mt-2">
            {/* Core indicators */}
            <div className="grid grid-cols-2 gap-4 text-[9.5px]">
              <div>
                <div className="text-slate-400 font-semibold truncate">Gross Profit</div>
                <div className="text-[16px] font-extrabold text-slate-800 mt-0.5">₹1,63,25,430</div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold truncate">Gross Margin</div>
                <div className="text-[16px] font-extrabold text-slate-800 mt-0.5">38.3%</div>
              </div>
            </div>
 
            {/* Custom HTML Legends under indicators */}
            <div className="flex items-center gap-3.5 text-[9px] font-bold text-slate-400 mt-2 select-none shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#0064eb]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" />
                COGS
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[#10b981] font-extrabold text-[10px] leading-none">▲</span>
                Gross Profit
              </span>
            </div>
 
            {/* Line chart container */}
            <div className="flex-1 h-36 w-full relative mt-3">
              <div ref={grossProfitAnalysisRef} className="w-full h-full" />
            </div>
          </div>
        </div>
 
        {/* 3. AI Insights */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px] select-none">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center">
            <h3 className="text-[13.5px] font-bold text-slate-800">AI Insights</h3>
            <Link href="/ai-insights" className="text-[9.5px] font-bold text-[#0064eb] hover:underline flex items-center gap-0.5">
              <span>View All Insights</span>
            </Link>
          </div>
 
          {/* Scrolling insights card list with circular icon badges */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5 py-1 mt-2">
            {[
              {
                title: 'Revenue is up 18.6% this month',
                desc: 'Strong performance across Shopify and Amazon channels contributed the most.',
                icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
                bg: 'bg-emerald-50/40 border border-emerald-100/40',
                badgeBg: 'bg-emerald-100/60'
              },
              {
                title: 'Overdue invoices increased by 22%',
                desc: '12 customers have high overdue balances. Action recommended.',
                icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-650" />,
                bg: 'bg-amber-50/40 border border-amber-100/40',
                badgeBg: 'bg-amber-100/60'
              },
              {
                title: 'Electronics category has highest growth',
                desc: 'Revenue grew by 24.5% compared to last month.',
                icon: <Info className="h-3.5 w-3.5 text-blue-600" />,
                bg: 'bg-blue-50/40 border border-blue-100/40',
                badgeBg: 'bg-blue-100/60'
              },
              {
                title: 'Consider reordering low stock items',
                desc: '15 products are low in stock and selling fast.',
                icon: <Lightbulb className="h-3.5 w-3.5 text-emerald-600" />,
                bg: 'bg-emerald-50/40 border border-emerald-100/40',
                badgeBg: 'bg-emerald-100/60'
              }
            ].map((insight, idx) => (
              <div key={idx} className={cn("p-2.5 rounded-lg flex items-center gap-2.5 border", insight.bg)}>
                {/* Circular Icon Badge */}
                <div className={cn("h-7.5 w-7.5 rounded-full flex items-center justify-center shrink-0 shadow-3xs", insight.badgeBg)}>
                  {insight.icon}
                </div>
                <div className="space-y-0.5 text-[9px] leading-tight min-w-0">
                  <div className="font-extrabold text-slate-800 truncate">{insight.title}</div>
                  <div className="text-slate-450 font-bold leading-normal truncate">{insight.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
 
        {/* 4. Top Selling Products */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[360px]">
          <div className="border-b border-slate-100 pb-2 mb-2 shrink-0 flex justify-between items-center select-none">
            <h3 className="text-[13.5px] font-bold text-slate-800">Top Selling Products</h3>
            <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
          </div>
 
          <div className="flex-1 overflow-y-auto no-scrollbar py-0.5 mt-2">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase py-2">
                  <th className="py-2 px-1">Product</th>
                  <th className="py-2 px-1 text-right">Revenue</th>
                  <th className="py-2 px-1 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[10.5px]">
                {[
                  { name: 'iPhone 15 Pro Max', rev: '₹28,45,230', qty: '232' },
                  { name: 'Samsung Galaxy S24', rev: '₹18,75,450', qty: '198' },
                  { name: 'MacBook Air M2', rev: '₹16,24,320', qty: '112' },
                  { name: 'Sony WH-1000XM5', rev: '₹12,45,230', qty: '142' },
                  { name: 'Nike Air Jordan 1', rev: '₹9,85,230', qty: '215' }
                ].map((product, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-1 font-bold text-slate-750 flex items-center gap-1.5">
                      <span className="text-[9.5px] text-slate-450 font-bold w-3">{idx + 1}</span>
                      <span className="truncate max-w-[95px]">{product.name}</span>
                    </td>
                    <td className="py-2.5 px-1 text-right font-bold text-slate-800">{product.rev}</td>
                    <td className="py-2.5 px-1 text-right font-bold text-slate-500">{product.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
 
          <Link href="/products" className="text-[9.5px] font-bold text-[#0064eb] hover:underline mt-2 flex items-center gap-0.5 shrink-0 select-none">
            <span>View All Products</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
