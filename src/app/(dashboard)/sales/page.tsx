"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSidebarStore } from '@/store/sidebar-store';
import { useThemeStore } from '@/store/theme-store';
import WorldMapSvg from '@/components/WorldMapSvg';
import RevenueBreakdownPanel from '@/components/sales/RevenueBreakdownPanel';
import TurnoverDrawerPanel from '@/components/sales/TurnoverDrawerPanel';
import GrossProfitBreakdownPanel from '@/components/sales/GrossProfitBreakdownPanel';
import GrossMarginAnalysisPanel from '@/components/sales/GrossMarginAnalysisPanel';
import InvoicesBreakdownPanel from '@/components/sales/InvoicesBreakdownPanel';
import AccountReceivableBreakdownPanel from '@/components/sales/AccountReceivableBreakdownPanel';
import CustomerConcentrationPanel from '@/components/sales/CustomerConcentrationPanel';
import ProductBreakdownPanel from '@/components/sales/ProductBreakdownPanel';
import {
  Plus,
  ChevronDown,
  FileDown,
  ArrowRight,
  MoreVertical,
  CreditCard,
  Briefcase,
  ShoppingCart,
  Percent,
  FileText,
  UserCheck,
  Target,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Sun,
  Moon
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

// Dynamic SVG Sparkline Component matching real numbers array
const DynamicSparkline = ({ data = [], color = '#2563eb' }: { data?: number[]; color?: string }) => {
  const cleanColor = color.replace('#', '');
  const width = 160;
  const height = 36;
  const padding = 8; // Top & bottom safety padding so stroke curve never flat-clips!

  const pointsList = data.length >= 2 ? data : [10, 18, 14, 25, 20, 30];
  const minVal = Math.min(...pointsList);
  const maxVal = Math.max(...pointsList);
  const range = maxVal - minVal || 1;

  const coords = pointsList.map((val, idx) => {
    const x = (idx / (pointsList.length - 1)) * width;
    const norm = (val - minVal) / range;
    const y = height - padding - norm * (height - 2 * padding);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let pathD = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathD += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
  }

  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="w-full h-8 overflow-hidden rounded-b-xl pointer-events-none">
      <svg className="w-full h-full block" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-sales-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#grad-sales-${cleanColor})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// Shimmer Skeleton Effect Component for Revenue Over Time Line Chart
const RevenueGraphSkeleton = () => {
  return (
    <div className="w-full h-full flex flex-col justify-between pt-2 pb-1 animate-pulse select-none">
      {/* Top Simulated Y-Axis & Horizontal Grid Lines with Shimmer Wave */}
      <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
        {[100, 75, 50, 25, 0].map((level, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="h-3 w-9 bg-slate-200/70 rounded-md shrink-0 animate-pulse" />
            <div className="flex-1 h-[1.5px] bg-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300/40 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
            </div>
          </div>
        ))}
      </div>

      {/* Simulated Shimmer Wave / Area Gradient Bars */}
      <div className="h-36 w-full bg-gradient-to-t from-blue-100/40 via-blue-50/20 to-transparent rounded-2xl flex items-end justify-between px-3 gap-2 overflow-hidden border border-slate-100 my-2 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
        {[45, 60, 52, 78, 65, 88, 70, 95, 60, 82, 75, 90].map((h, i) => (
          <div
            key={i}
            className="w-full bg-blue-200/50 rounded-t-md animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>

      {/* Simulated X-axis Month Label Skeletons */}
      <div className="flex justify-between items-center pt-2 px-1 border-t border-slate-100">
        {['Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26'].map((m, i) => (
          <div key={i} className="h-3 w-10 bg-slate-200/70 rounded-md animate-pulse" />
        ))}
      </div>
    </div>
  );
};

const CardTooltip = ({ text }: { text: string }) => (
  <div className="relative group/tooltip inline-flex items-center ml-1.5 cursor-pointer">
    <Info className="h-3.5 w-3.5 text-slate-400 group-hover/tooltip:text-blue-600 transition" />
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:flex flex-col items-center w-64 z-50 pointer-events-none">
      <div className="bg-slate-900 text-white text-[10.5px] font-medium leading-relaxed rounded-xl p-3 shadow-xl border border-slate-700 text-center">
        {text}
      </div>
      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
    </div>
  </div>
);

// Shimmer Skeleton Table Rows Component
const TableSkeletonRows = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className={`py-2.5 ${cIdx === cols - 1 || cIdx > 1 ? "text-right" : ""}`}>
            <div className={`h-3.5 bg-slate-200/80 rounded-md ${cIdx === 0 ? "w-24 mb-1" : cIdx === 1 ? "w-16" : "w-10 ml-auto"}`}></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Empty State Component with SVG Illustration
const EmptyDataState = ({ title = "No Data Found", subtitle = "No records found for the selected period" }: { title?: string; subtitle?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-auto min-h-[240px] w-full">
    <div className="w-13 h-13 rounded-full bg-slate-100/90 border border-slate-200/80 flex items-center justify-center mb-3 shadow-2xs">
      <svg className="w-6.5 h-6.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    </div>
    <p className="text-[13px] font-extrabold text-slate-700 mb-1">{title}</p>
    <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">{subtitle}</p>
  </div>
);

export default function SalesDashboardPage() {
  const { isCollapsed, setCollapsed } = useSidebarStore();
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const searchParams = useSearchParams();

  const fromDate = searchParams.get('from_date') || '';
  const toDate = searchParams.get('to_date') || '';

  useEffect(() => {
    // Auto-collapse sidebar by default on Sales Dashboard page
    setCollapsed(true);
  }, [setCollapsed]);

  // Dynamic API State
  const [loading, setLoading] = useState<boolean>(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [isTurnoverDrawerOpen, setIsTurnoverDrawerOpen] = useState<boolean>(false);
  const [isGrossProfitBreakdownOpen, setIsGrossProfitBreakdownOpen] = useState<boolean>(false);
  const [isGrossMarginPanelOpen, setIsGrossMarginPanelOpen] = useState<boolean>(false);
  const [isInvoicesPanelOpen, setIsInvoicesPanelOpen] = useState<boolean>(false);
  const [isARPanelOpen, setIsARPanelOpen] = useState<boolean>(false);
  const [isCustomerConcentrationOpen, setIsCustomerConcentrationOpen] = useState<boolean>(false);
  const [isProductBreakdownOpen, setIsProductBreakdownOpen] = useState<boolean>(false);
  const [revenueBreakdownConfig, setRevenueBreakdownConfig] = useState<{
    isOpen: boolean;
    title: string;
    totalRevenue: number;
  }>({
    isOpen: false,
    title: "Turnover Breakdown",
    totalRevenue: 0
  });

  // Fetch live metrics when date parameters change
  useEffect(() => {
    async function fetchSalesMetrics() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (fromDate && toDate) {
          query.set('from_date', fromDate);
          query.set('to_date', toDate);
        }

        const res = await fetch(`/api/dashboard/sales?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setSalesData(json);
        }
      } catch (err) {
        console.error('Failed to load sales metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesMetrics();
  }, [fromDate, toDate]);

  // Dynamic Currency Formatter
  const currencyCode = salesData?.meta?.currency || 'GBP';
  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val || 0);
  };

  // Chart refs
  const revenueOverTimeRef = useRef<HTMLDivElement>(null);
  const revenueBySourceRef = useRef<HTMLDivElement>(null);
  const revenueByCategoryRef = useRef<HTMLDivElement>(null);

  // Timeframe active state
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [showDemoTargetData, setShowDemoTargetData] = useState(false);
  const [showDemoRegionData, setShowDemoRegionData] = useState(false);
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number>(0);
  const [showDemoForecast, setShowDemoForecast] = useState(false);
  const [showDemoCfoActions, setShowDemoCfoActions] = useState(false);
  const [showDemoInvoices, setShowDemoInvoices] = useState(false);
  const [showDemoCreditNotes, setShowDemoCreditNotes] = useState(false);
  const [showDemoPayments, setShowDemoPayments] = useState(false);

  // Dynamic Time-Based Greeting Calculation
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return { text: "Good Morning", icon: "☀️", sub: "Here is your live Sales Overview" };
    } else if (hour < 17) {
      return { text: "Good Afternoon", icon: "🌤️", sub: "Here is your live Sales Overview" };
    } else {
      return { text: "Good Evening", icon: "🌙", sub: "Here is your live Sales Overview" };
    }
  }, []);

  // Compute 7 Cards Data from API
  const snapshot = salesData?.salesSnapshot;
  const revVal = snapshot?.totalRevenue?.value || 0;

  const metricCards = [
    {
      title: "Total Revenue",
      infoTooltip: "Total Turnover from 7 Core Revenue Streams linked to Profit & Loss",
      value: snapshot?.totalRevenue ? formatAmount(snapshot.totalRevenue.value) : null,
      change: snapshot?.totalRevenue ? snapshot.totalRevenue.change : '',
      isPositive: snapshot?.totalRevenue ? snapshot.totalRevenue.isPositive : true,
      color: "#10b981",
      trendData: [1200, 2400, 1800, 3200, 2800, revVal || 4122],
      iconBg: "bg-emerald-50/80 border border-emerald-100/80 text-emerald-600",
      icon: <CreditCard className="h-4 w-4 text-emerald-600" />
    },
    {
      title: "Net Sales",
      infoTooltip: "Total Turnover net of sales credit notes and sales allowances",
      value: snapshot?.netSales ? formatAmount(snapshot.netSales.value) : null,
      change: snapshot?.netSales ? snapshot.netSales.change : '',
      isPositive: snapshot?.netSales ? snapshot.netSales.isPositive : true,
      color: "#2563eb",
      trendData: [1100, 2200, 1700, 3000, 2600, snapshot?.netSales?.value || 4122],
      iconBg: "bg-blue-50/80 border border-blue-100/80 text-blue-600",
      icon: <Briefcase className="h-4 w-4 text-blue-600" />
    },
    {
      title: "Gross Profit",
      infoTooltip: "Total Turnover minus Direct Cost of Goods Sold (COGS)",
      value: snapshot?.grossProfit ? formatAmount(snapshot.grossProfit.value) : null,
      change: snapshot?.grossProfit ? snapshot.grossProfit.change : '',
      isPositive: snapshot?.grossProfit ? snapshot.grossProfit.isPositive : false,
      color: "#a855f7",
      trendData: [500, 900, 750, 1200, 1000, snapshot?.grossProfit?.value || 1566],
      iconBg: "bg-purple-50/80 border border-purple-100/80 text-purple-600",
      icon: <ShoppingCart className="h-4 w-4 text-purple-600" />
    },
    {
      title: "Gross Margin",
      infoTooltip: "Ratio of Gross Profit to Total Turnover expressed as percentage (%)",
      value: snapshot?.grossMargin ? `${snapshot.grossMargin.value.toFixed(1)}%` : null,
      change: snapshot?.grossMargin ? snapshot.grossMargin.change : '',
      isPositive: snapshot?.grossMargin ? snapshot.grossMargin.isPositive : false,
      color: "#f59e0b",
      trendData: [35, 36, 38, 37, 39, snapshot?.grossMargin?.value || 38.0],
      iconBg: "bg-amber-50/80 border border-amber-100/80 text-amber-600",
      icon: <Percent className="h-4 w-4 text-amber-600" />
    },
    {
      title: "Invoices",
      infoTooltip: "Total count of active non-voided Sales Invoices (ACCREC)",
      value: snapshot?.invoices ? snapshot.invoices.value.toString() : null,
      change: snapshot?.invoices ? snapshot.invoices.change : '',
      isPositive: snapshot?.invoices ? snapshot.invoices.isPositive : true,
      color: "#06b6d4",
      trendData: [20, 35, 45, 55, 68, snapshot?.invoices?.value || 78],
      iconBg: "bg-cyan-50/80 border border-cyan-100/80 text-cyan-600",
      icon: <FileText className="h-4 w-4 text-cyan-600" />
    },
    /*
    {
      title: "Accounts Receivable",
      infoTooltip: "Total outstanding unpaid balance on sales invoices",
      value: snapshot?.accountsReceivable ? formatAmount(snapshot.accountsReceivable.value) : null,
      change: snapshot?.accountsReceivable ? snapshot.accountsReceivable.change : '',
      isPositive: snapshot?.accountsReceivable ? !snapshot.accountsReceivable.isPositive : true,
      color: "#6366f1",
      trendData: [200, 350, 420, 380, 490, snapshot?.accountsReceivable?.value || 519],
      iconBg: "bg-indigo-50/80 border border-indigo-100/80 text-indigo-600",
      icon: <UserCheck className="h-4 w-4 text-indigo-600" />
    },
    */
    {
      title: "Collection Rate",
      infoTooltip: "Percentage of total sales revenue collected vs outstanding AR",
      value: snapshot?.collectionRate ? `${snapshot.collectionRate.value.toFixed(1)}%` : null,
      change: snapshot?.collectionRate ? snapshot.collectionRate.change : '',
      isPositive: snapshot?.collectionRate ? snapshot.collectionRate.isPositive : false,
      color: "#14b8a6",
      trendData: [95, 92, 94, 90, 88, snapshot?.collectionRate?.value || 87.4],
      iconBg: "bg-teal-50/80 border border-teal-100/80 text-teal-600",
      icon: <Target className="h-4 w-4 text-teal-600" />
    }
  ];

  // Initialize Row 2: Revenue Over Time Chart
  const totalRev = snapshot?.totalRevenue?.value || 0;

  // Dynamic Computation for Card 2
  const actualVal = snapshot?.totalRevenue ? snapshot.totalRevenue.value : 0;
  const targetVal = 0;
  const forecastVal = 0;
  const expectedGapVal = 0;
  const achievedPct = 0.0;

  const growthVal = 0;
  const driverExisting = 0;
  const driverNew = 0;
  const driverPrice = 0;
  const driverVolume = 0;
  const driverLost = 0;
  const driverCredit = 0;

  useEffect(() => {
    if (!revenueOverTimeRef.current) return;
    const chartInstance = echarts.init(revenueOverTimeRef.current);

    const labels = salesData?.revenueTrend?.labels || ['Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26'];
    const currentData = salesData?.revenueTrend?.currentData || [
      Math.round(totalRev * 0.14),
      Math.round(totalRev * 0.16),
      Math.round(totalRev * 0.18),
      Math.round(totalRev * 0.17),
      Math.round(totalRev * 0.17),
      Math.round(totalRev * 0.18)
    ];
    const prevData = salesData?.revenueTrend?.prevData || [
      Math.round(totalRev * 0.12),
      Math.round(totalRev * 0.13),
      Math.round(totalRev * 0.15),
      Math.round(totalRev * 0.14),
      Math.round(totalRev * 0.14),
      Math.round(totalRev * 0.15)
    ];

    const option = {
      grid: {
        left: '1%',
        right: '2%',
        top: '6%',
        bottom: '6%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowBlur: 14,
        borderRadius: 12,
        textStyle: {
          color: '#334155',
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 11.5
        },
        valueFormatter: (value: any) => formatAmount(Number(value))
      },
      legend: {
        show: false
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans), sans-serif' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          formatter: (val: number) => {
            const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val / 1000 || 0);
            return `${formatted}k`;
          },
          color: '#94a3b8',
          fontSize: 10.5,
          fontWeight: 500,
          fontFamily: 'var(--font-sans), sans-serif'
        }
      },
      series: [
        {
          name: 'Current Period',
          type: 'line',
          smooth: 0.45,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#0064eb', borderWidth: 2, borderColor: '#ffffff' },
          lineStyle: { width: 3.2, shadowColor: 'rgba(0, 100, 235, 0.25)', shadowBlur: 8 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 100, 235, 0.22)' },
              { offset: 1, color: 'rgba(0, 100, 235, 0.00)' }
            ])
          },
          data: currentData
        },
        {
          name: 'Previous Period',
          type: 'line',
          smooth: 0.45,
          symbol: 'square',
          symbolSize: 5,
          itemStyle: { color: '#0064eb' },
          lineStyle: { width: 2, type: 'dotted', color: '#0064eb', opacity: 0.65 },
          data: prevData
        }
        /* Target series commented out pending future backend rules:
        {
          name: 'Target',
          type: 'line',
          smooth: 0.45,
          symbol: 'triangle',
          symbolSize: 6,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, type: 'dashed', color: '#10b981' },
          data: targetData
        }
        */
      ]
    };

    chartInstance.setOption(option);

    chartInstance.on('click', () => {
      setRevenueBreakdownConfig({
        isOpen: true,
        title: "Turnover Breakdown",
        totalRevenue: snapshot?.totalRevenue?.value || 0
      });
    });

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [salesData, currencyCode, loading]);

  // Initialize Row 2: Revenue by Source Doughnut
  useEffect(() => {
    if (!revenueBySourceRef.current) return;
    const chartInstance = echarts.init(revenueBySourceRef.current);

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: £{c} ({d}%)'
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
            { value: Math.round((revVal || 4122) * 0.85), name: 'Xero', itemStyle: { color: '#0064eb' } },
            { value: Math.round((revVal || 4122) * 0.10), name: 'Shopify', itemStyle: { color: '#10b981' } },
            { value: Math.round((revVal || 4122) * 0.05), name: 'Stripe', itemStyle: { color: '#ec4899' } }
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
  }, [revVal]);

  // Initialize Row 3: Revenue by Product Category Doughnut
  useEffect(() => {
    if (!revenueByCategoryRef.current) return;
    const chartInstance = echarts.init(revenueByCategoryRef.current);

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: £{c} ({d}%)'
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
            { value: Math.round((revVal || 4122) * 0.60), name: 'Pharmaceuticals', itemStyle: { color: '#0064eb' } },
            { value: Math.round((revVal || 4122) * 0.25), name: 'Healthcare', itemStyle: { color: '#10b981' } },
            { value: Math.round((revVal || 4122) * 0.15), name: 'Medical Supplies', itemStyle: { color: '#f59e0b' } }
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
  }, [revVal]);

  // Waterfall Chart Effect for Gross Profit Analysis
  const waterfallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!waterfallRef.current) return;
    const chartInstance = echarts.init(waterfallRef.current);

    const gpAnalysis = salesData?.executiveRow4?.grossProfitAnalysis;
    const rev = gpAnalysis?.revenue || totalRev || 0;
    const cogs = gpAnalysis?.cogs || (rev - (gpAnalysis?.grossProfit || 0));
    const gp = gpAnalysis?.grossProfit || 0;

    const option = {
      grid: { left: '2%', right: '2%', top: '22%', bottom: '15%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        textStyle: { color: '#334155', fontSize: 11 },
        formatter: (params: any[]) => {
          const item = params.find(p => p.seriesName === 'Amount');
          if (!item || item.value === 0) return '';
          return `<div style="font-weight:700; color:#1e293b; font-size:11px;">${item.name}: <span style="color:#2563eb;">${formatAmount(item.value)}</span></div>`;
        }
      },
      xAxis: {
        type: 'category',
        data: ['Revenue', 'COGS', 'Gross Profit'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 700, interval: 0 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { show: false }
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          data: [0, gp, 0]
        },
        {
          name: 'Amount',
          type: 'bar',
          stack: 'Total',
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const val = params.value;
              if (val === 0) return '-';
              return `£${(val / 1000).toFixed(0)}k`;
            },
            fontSize: 10,
            fontWeight: 800,
            color: '#334155'
          },
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: any) => {
              const idx = params.dataIndex;
              if (idx === 0) return '#10b981'; // Revenue Green
              if (idx === 1) return '#f43f5e'; // COGS Red/Rose
              return '#2563eb'; // Gross Profit Blue
            }
          },
          data: [rev, cogs, gp]
        }
      ]
    };

    chartInstance.setOption(option);

    chartInstance.on('click', (params: any) => {
      const dataIndex = params?.dataIndex ?? (Array.isArray(params) ? params[0]?.dataIndex : -1);
      const name = params?.name || (Array.isArray(params) ? params[0]?.name : '');

      if (name === 'Revenue' || dataIndex === 0) {
        setRevenueBreakdownConfig({
          isOpen: true,
          title: "Revenue Breakdown",
          totalRevenue: rev || 0
        });
      } else {
        setIsGrossProfitBreakdownOpen(true);
      }
    });

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [salesData, totalRev]);

  // Donut Chart Effect for Receivables Aging
  const agingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agingRef.current) return;
    const chartInstance = echarts.init(agingRef.current);

    const aging = salesData?.agingSummary || {};
    const cur = aging.current || 0;
    const d1 = aging.days1_30 || 0;
    const d2 = aging.days31_60 || 0;
    const d3 = aging.days61_90 || 0;
    const d4 = aging.days90Plus || 0;
    const hasData = (cur + d1 + d2 + d3 + d4) > 0;

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        textStyle: { color: '#334155', fontSize: 11, fontWeight: 600 },
        formatter: (params: any) => `${params.name}: <b>${formatAmount(params.value)}</b> (${params.percent}%)`
      },
      series: [
        {
          name: 'Aging',
          type: 'pie',
          radius: ['58%', '88%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: hasData ? [
            { value: cur, name: 'Current', itemStyle: { color: '#2563eb' } },
            { value: d1, name: '1 - 30 Days', itemStyle: { color: '#10b981' } },
            { value: d2, name: '31 - 60 Days', itemStyle: { color: '#f59e0b' } },
            { value: d3, name: '61 - 90 Days', itemStyle: { color: '#ec4899' } },
            { value: d4, name: '90+ Days', itemStyle: { color: '#8b5cf6' } }
          ] : [
            { value: 1, name: 'No Data', itemStyle: { color: '#e2e8f0' } }
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
  }, [salesData]);

  // Sparkline Line Effect for Cash Conversion Rate
  const conversionSparkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversionSparkRef.current) return;
    const chartInstance = echarts.init(conversionSparkRef.current);

    const option = {
      grid: { left: 0, right: 0, top: 5, bottom: 5 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', show: false },
      series: [
        {
          data: [65, 72, 68, 75, 78, 80.2],
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, color: '#10b981' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
            ])
          }
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

  // Donut Chart Effect for Customer Risk Overview
  const customerRiskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customerRiskRef.current) return;
    const chartInstance = echarts.init(customerRiskRef.current);

    const cRisk = salesData?.customerRiskOverview || {};
    const low = cRisk.lowRisk || 0;
    const med = cRisk.mediumRisk || 0;
    const high = cRisk.highRisk || 0;
    const hasData = (low + med + high) > 0;

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        textStyle: { color: '#334155', fontSize: 11, fontWeight: 600 },
        formatter: (params: any) => `${params.name}: <b>${params.value}</b> (${params.percent}%)`
      },
      series: [
        {
          name: 'Customer Risk',
          type: 'pie',
          radius: ['58%', '88%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: hasData ? [
            { value: low, name: 'Low Risk', itemStyle: { color: '#10b981' } },
            { value: med, name: 'Medium Risk', itemStyle: { color: '#f59e0b' } },
            { value: high, name: 'High Risk', itemStyle: { color: '#ef4444' } }
          ] : [
            { value: 1, name: 'No Data', itemStyle: { color: '#e2e8f0' } }
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
  }, [salesData]);

  // Donut Chart Effect for Margin Risk Overview
  const marginRiskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!marginRiskRef.current) return;
    const chartInstance = echarts.init(marginRiskRef.current);

    const mRisk = salesData?.marginRiskOverview || {};
    const imp = mRisk.improving || 0;
    const sta = mRisk.stable || 0;
    const dec = mRisk.declining || 0;
    const hasData = (imp + sta + dec) > 0;

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        textStyle: { color: '#334155', fontSize: 11, fontWeight: 600 },
        formatter: (params: any) => `${params.name}: <b>${params.value}</b> (${params.percent}%)`
      },
      series: [
        {
          name: 'Margin Risk',
          type: 'pie',
          radius: ['58%', '88%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: hasData ? [
            { value: imp, name: 'Improving', itemStyle: { color: '#10b981' } },
            { value: sta, name: 'Stable', itemStyle: { color: '#f59e0b' } },
            { value: dec, name: 'Declining', itemStyle: { color: '#ef4444' } }
          ] : [
            { value: 1, name: 'No Data', itemStyle: { color: '#e2e8f0' } }
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
  }, [salesData]);

  return (
    <div className={cn("space-y-5 max-w-full pb-10 select-none font-sans transition-colors duration-200", isDark ? "text-slate-100" : "text-slate-800")}>

      {/* ========================================================================= */}
      {/* ATTACHMENT 2 FILTERS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mr-1">FILTERS:</span>

          <button
            onClick={() => toast.info('Customer filter selected')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Customers</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => toast.info('Product filter selected')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Products</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => toast.info('Tracking filter selected')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Tracking</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => toast.info('Region filter selected')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Regions</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => toast.info('Sales account filter selected')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Sales Accounts</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => toast.info('Filters cleared')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer ml-1"
          >
            Clear Filters
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Light / Dark Mode Toggle Switch */}
          <button
            onClick={() => {
              const nextTheme = isDark ? 'light' : 'dark';
              setTheme(nextTheme);
              toast.success(`Switched to ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`);
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs",
              isDark
                ? "bg-slate-900 border-white/30 text-amber-400 hover:bg-slate-800"
                : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
            title="Toggle Light / Dark Mode"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <button
            onClick={() => toast.success("Widget catalog loading...")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer outline-none transition shadow-2xs",
              isDark ? "bg-slate-900 border-white/25 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <span>Add Widget</span>
          </button>

          <button
            onClick={() => toast.success("Opening export configuration...")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0064eb] hover:bg-[#0052c2] text-xs font-bold text-white cursor-pointer outline-none transition shadow-2xs"
          >
            <FileDown className="h-3.5 w-3.5 text-blue-100" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-blue-200" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ATTACHMENT 2 SECTION HEADER */}
      {/* ========================================================================= */}
      {/* DYNAMIC EXECUTIVE HERO GREETING SECTION */}
      <div className={cn("border-t pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3", isDark ? "border-white/20" : "border-slate-200/60")}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cn("text-2xl font-black tracking-tight flex items-center gap-2", isDark ? "text-slate-100" : "text-slate-900")}>
              <span>{greetingInfo.text},</span>
              <span className="text-blue-600">MI Health Ltd</span>
              <span className="text-xl">{greetingInfo.icon}</span>
            </h2>
          </div>
          <p className={cn("text-xs font-medium mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            Real-time consolidated sales performance & receivable intelligence snapshot.
          </p>
        </div>

        {loading && (
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-3xs border", isDark ? "bg-slate-900 border-white/20 text-blue-400" : "bg-blue-50 border-blue-200/80 text-blue-600")}>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Updating live metrics...</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE 7 SNAPSHOT CARDS WITH DYNAMIC SPARK LINES */}
      {/* ========================================================================= */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {metricCards.map((card, idx) => {
            const isCardLoading = loading || card.value === null;
            const parts = (card.change || '').split(' vs ');
            const percentPart = parts[0] || '';
            const labelPart = parts[1] ? ` vs ${parts[1]}` : '';

            const isFarRight = idx >= 5;
            const isCenter = idx >= 2 && idx <= 4;
            const isTotalRevenue = card.title === "Total Revenue";
            const isNetSales = card.title === "Net Sales";
            const isGrossProfit = card.title === "Gross Profit";
            const isGrossMargin = card.title === "Gross Margin";
            const isInvoices = card.title === "Invoices";
            const isAR = card.title === "Accounts Receivable";

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isTotalRevenue || isNetSales) {
                    setIsTurnoverDrawerOpen(true);
                  } else if (isGrossProfit) {
                    setIsGrossProfitBreakdownOpen(true);
                  } else if (isGrossMargin) {
                    setIsGrossMarginPanelOpen(true);
                  } else if (isInvoices) {
                    setIsInvoicesPanelOpen(true);
                  } else if (isAR) {
                    setIsARPanelOpen(true);
                  }
                }}
                className={cn(
                  "rounded-xl border p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-visible relative group min-h-[165px]",
                  isDark ? "bg-slate-900/90 border-white/25 text-slate-100" : "bg-white border-slate-200/80 text-slate-800",
                  (isTotalRevenue || isNetSales || isGrossProfit || isGrossMargin || isInvoices || isAR)
                    ? "cursor-pointer hover:border-blue-400"
                    : "cursor-default hover:border-slate-300"
                )}
              >
                {/* Top Section: Title, Info Tooltip & Icon */}
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1 min-w-0 pr-1">
                      <span className={cn("text-[10px] font-extrabold uppercase tracking-wider truncate", isDark ? "text-slate-300" : "text-slate-600")}>{card.title}</span>

                      {/* Info Tooltip Icon - Floating Popover with Smart Boundary Alignment */}
                      <div className="group/tooltip relative shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <Info className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600 transition-colors" />
                        <div className={cn(
                          "absolute top-full mt-1.5 hidden group-hover/tooltip:block w-44 p-2.5 bg-slate-900 text-white text-[10px] font-medium rounded-xl shadow-2xl z-[100] pointer-events-none leading-relaxed border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150",
                          isFarRight ? "right-0 origin-top-right" : isCenter ? "left-1/2 -translate-x-1/2 origin-top" : "left-0 origin-top-left"
                        )}>
                          <div className="font-bold text-blue-400 mb-0.5 uppercase tracking-wider text-[9px]">{card.title}</div>
                          {card.infoTooltip}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg shadow-3xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300",
                      card.iconBg
                    )}>
                      {card.icon}
                    </div>
                  </div>

                  {/* Middle Section: Metric Value & Advanced Trend Pill */}
                  {isCardLoading ? (
                    <div className="space-y-1.5 mt-3">
                      <div className={cn("h-5 w-20 animate-pulse rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      <div className={cn("h-3 w-24 animate-pulse rounded", isDark ? "bg-slate-800/60" : "bg-slate-100")} />
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <div className={cn("text-xl md:text-[21px] font-black tracking-tight leading-tight truncate font-sans", isDark ? "text-slate-100" : "text-slate-900")}>
                        {card.value}
                      </div>

                      {/* Advanced Xero-Style Trend Pill + Comparison Subtitle */}
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-3xs group-hover:scale-105 transition-transform",
                            card.isPositive
                              ? "bg-emerald-50/90 text-emerald-700 border-emerald-300/80"
                              : "bg-rose-50/90 text-rose-700 border-rose-300/80"
                          )}>
                            {card.isPositive ? (
                              <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-rose-600 shrink-0" />
                            )}
                            <span>{percentPart}</span>
                          </span>
                        </div>

                        {labelPart && (
                          <div className="text-[9px] font-bold text-slate-400 tracking-tight leading-tight" title={labelPart}>
                            {labelPart.trim()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section: Dynamic Sparkline Wave */}
                <div className="mt-2 -mx-3.5 -mb-3.5 rounded-b-xl overflow-hidden">
                  <DynamicSparkline data={card.trendData} color={card.color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 2: REVENUE OVER TIME & SALES VS TARGET / GROWTH ANALYSIS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* CARD 1: REVENUE OVER TIME */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[360px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 gap-3 shrink-0">
            <div>
              <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Revenue Over Time</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0064eb]" />
                  <span>Current Period</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#0064eb]">
                  <span className="inline-block h-0.5 w-3 bg-[#0064eb] border border-dashed border-[#0064eb]" />
                  <span className="text-slate-400">Previous Period</span>
                </span>
                {/* Target legend commented out pending future rules:
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="inline-block h-0.5 w-3 bg-emerald-500 border border-dashed border-emerald-500" />
                  <span className="text-slate-400">Target</span>
                </span>
                */}
              </div>
            </div>

            {/* Monthly View Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 border border-slate-200/70 rounded-xl text-[10.5px] font-extrabold text-slate-700 self-start sm:self-auto shadow-3xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Monthly Breakdown</span>
            </div>
          </div>

          <div className="w-full h-[260px] relative pt-1">
            {loading ? (
              <RevenueGraphSkeleton />
            ) : (
              <div ref={revenueOverTimeRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* CARD 2: SALES VS TARGET & REVENUE GROWTH ANALYSIS (ATTACHMENT 1 WIDGET) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          {/* Header with Demo Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center">
              <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Sales Target & Growth Analysis</h3>
              <CardTooltip text="Monthly sales target tracking and customer cohort revenue growth analysis." />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
              <button
                type="button"
                onClick={() => setShowDemoTargetData(!showDemoTargetData)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  showDemoTargetData ? "bg-blue-600" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                    showDemoTargetData ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {!showDemoTargetData && targetVal === 0 ? (
            /* CENTERED SVG EMPTY STATE */
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/80 flex items-center justify-center mb-3 text-blue-600 shadow-2xs">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <h4 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">No Sufficient Target & Growth Data Available</h4>
              <p className="text-[10.5px] font-medium text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                Sales targets and cohort growth drivers are not configured for this date period.
              </p>
              <button
                onClick={() => setShowDemoTargetData(true)}
                className="mt-4 px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>Preview with Demo Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* DEMO / LIVE METRICS DATA VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 pt-3">
              {/* SUB-COLUMN 1: SALES VS TARGET (MONTHLY) */}
              <div className="flex flex-col justify-between pr-0 md:pr-4">
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Sales vs Target</h4>

                  <div className="flex items-center justify-center my-2">
                    {/* Circular Donut Gauge */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-cyan-500 transition-all duration-1000"
                          strokeDasharray={`${showDemoTargetData ? 98 : achievedPct}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black text-slate-900 leading-none">{showDemoTargetData ? '98%' : `${achievedPct}%`}</span>
                        <span className="text-[9.5px] font-bold text-slate-400 mt-1">Achieved</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Breakdown Table */}
                  <div className="space-y-2 mt-3 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">Target</span>
                      <span className="font-extrabold text-slate-800 font-sans">{formatAmount(showDemoTargetData ? 4000000 : targetVal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">Actual</span>
                      <span className="font-extrabold text-slate-900 font-sans">{formatAmount(actualVal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">Forecast</span>
                      <span className="font-extrabold text-slate-800 font-sans">{formatAmount(showDemoTargetData ? 4100000 : forecastVal)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                      <span className="font-bold text-slate-400">Expected Gap</span>
                      <span className={cn("font-extrabold font-sans", showDemoTargetData ? "text-emerald-600" : "text-rose-600")}>
                        {showDemoTargetData ? `+${formatAmount(100000)}` : formatAmount(expectedGapVal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[9.5px] font-semibold text-slate-400 mt-3 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Target tracking active based on turnover</span>
                </div>
              </div>

              {/* SUB-COLUMN 2: REVENUE GROWTH ANALYSIS */}
              <div className="flex flex-col justify-between pl-0 md:pl-5 pt-3 md:pt-0">
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Growth Drivers</h4>

                  <div className="mb-3">
                    <span className="text-xl font-black text-emerald-600 font-sans tracking-tight block">
                      +{formatAmount(showDemoTargetData ? 420000 : growthVal)}
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">vs Previous Period</span>
                  </div>

                  {/* Driver Progress Bars */}
                  <div className="space-y-2 text-[10px]">
                    {[
                      { label: "Existing Customers", val: showDemoTargetData ? `+${formatAmount(250000)}` : `+${formatAmount(driverExisting)}`, pct: 75, isPos: true },
                      { label: "New Customers", val: showDemoTargetData ? `+${formatAmount(180000)}` : `+${formatAmount(driverNew)}`, pct: 50, isPos: true },
                      { label: "Price / Rate Effect", val: showDemoTargetData ? `+${formatAmount(35000)}` : `+${formatAmount(driverPrice)}`, pct: 35, isPos: true },
                      { label: "Volume Effect", val: showDemoTargetData ? `+${formatAmount(15000)}` : `+${formatAmount(driverVolume)}`, pct: 20, isPos: true },
                      { label: "Lost Customers", val: showDemoTargetData ? `-${formatAmount(40000)}` : `-${formatAmount(Math.abs(driverLost))}`, pct: 15, isPos: false },
                      { label: "Credit Notes", val: showDemoTargetData ? `-${formatAmount(20000)}` : `-${formatAmount(Math.abs(driverCredit))}`, pct: 10, isPos: false }
                    ].map((row, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-600">{row.label}</span>
                          <span className={cn("font-extrabold font-sans", row.isPos ? "text-slate-800" : "text-rose-600")}>
                            {row.val}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", row.isPos ? "bg-emerald-500" : "bg-rose-500")}
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/analytics" className="text-[10.5px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline mt-3 inline-flex items-center gap-1 self-start cursor-pointer">
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 3: TOP CUSTOMERS & TOP PRODUCTS (WIDE CARDS - 50% EACH) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">

        {/* CARD 1: TOP 10 CUSTOMERS BY REVENUE */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-4">Top 10 Customers by Revenue</h3>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse text-[10px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-white/10 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="pb-2.5 font-bold pl-1 w-[28%]">Customer</th>
                    <th className="pb-2.5 text-right font-bold w-[20%]">Revenue</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[16%]">Growth</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[12%]">% Share</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[14%]">AR</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[10%]">DSO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60 text-[10.5px]">
                  {loading ? (
                    <TableSkeletonRows rows={5} cols={6} />
                  ) : salesData?.topCustomers && salesData.topCustomers.length > 0 ? (
                    salesData.topCustomers.slice(0, 10).map((cust: any, itemIdx: number) => {
                      const growthVal = typeof cust.growth === 'number' ? cust.growth : 0;
                      const shareVal = cust.sharePct !== undefined ? cust.sharePct : (totalRev > 0 ? ((cust.revenue / totalRev) * 100).toFixed(1) : '0.0');

                      return (
                        <tr
                          key={itemIdx}
                          onClick={() => setIsCustomerConcentrationOpen(true)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 cursor-pointer"
                        >
                          {/* Customer Rank & Name */}
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-200 pl-1" title={cust.name}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-extrabold shadow-3xs",
                                itemIdx === 0 ? "bg-amber-100 text-amber-800 border border-amber-300/80" : itemIdx === 1 ? "bg-slate-200 text-slate-700" : itemIdx === 2 ? "bg-amber-50 text-amber-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              )}>
                                {itemIdx + 1}
                              </span>
                              <span className="truncate inline-block">{cust.name}</span>
                            </div>
                          </td>

                          {/* Revenue */}
                          <td className="py-2 text-right font-extrabold text-slate-900 dark:text-slate-100 font-sans truncate">
                            {formatAmount(cust.revenue)}
                          </td>

                          {/* Growth Pill */}
                          <td className="py-2 text-right pr-1">
                            <span className={cn(
                              "inline-flex items-center gap-0.5 text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shadow-3xs",
                              growthVal > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60"
                                : growthVal < 0
                                  ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60"
                                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}>
                              {growthVal > 0 ? `+${growthVal.toFixed(1)}%` : `${growthVal.toFixed(1)}%`}
                            </span>
                          </td>

                          {/* Share % */}
                          <td className="py-2 text-right font-bold text-slate-600 dark:text-slate-300 font-sans pr-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800/90 text-[9.5px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {shareVal}%
                            </span>
                          </td>

                          {/* AR */}
                          <td className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 font-sans pr-1 truncate">
                            {cust.ar > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{formatAmount(cust.ar)}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">£0</span>
                            )}
                          </td>

                          {/* DSO */}
                          <td className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 font-sans pr-1">
                            {cust.dso > 0 ? (
                              <span className="text-slate-700 dark:text-slate-300 font-bold text-[9.5px]">{cust.dso}d</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[9.5px]">0d</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyDataState title="No Customers Found" subtitle="No sales customer data registered for selected date period" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomerConcentrationOpen(true)}
            className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline mt-4 inline-flex items-center gap-1 self-start cursor-pointer bg-transparent border-0 p-0"
          >
            <span>View All Customers & Concentration Analysis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* CARD 2: TOP 10 PRODUCTS / SERVICES BY REVENUE */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-4">Top 10 Products / Services by Revenue</h3>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse text-[10px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-white/10 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="pb-2.5 font-bold pl-1 w-[34%]">Product / Service</th>
                    <th className="pb-2.5 text-right font-bold w-[22%]">Revenue</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[14%]">Units</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[14%]">% Share</th>
                    <th className="pb-2.5 text-right font-bold pr-1 w-[16%]">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60 text-[10.5px]">
                  {loading ? (
                    <TableSkeletonRows rows={5} cols={5} />
                  ) : salesData?.topProducts && salesData.topProducts.length > 0 ? (
                    salesData.topProducts.slice(0, 10).map((prod: any, itemIdx: number) => {
                      const growthVal = typeof prod.growth === 'number' ? prod.growth : 0;
                      const shareVal = prod.sharePct !== undefined ? prod.sharePct : (totalRev > 0 ? ((prod.revenue / totalRev) * 100).toFixed(1) : '0.0');

                      return (
                        <tr
                          key={itemIdx}
                          onClick={() => setIsProductBreakdownOpen(true)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 cursor-pointer"
                        >
                          {/* Product Rank & Name */}
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-200 pl-1" title={prod.name}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-extrabold shadow-3xs",
                                itemIdx === 0 ? "bg-amber-100 text-amber-800 border border-amber-300/80" : itemIdx === 1 ? "bg-slate-200 text-slate-700" : itemIdx === 2 ? "bg-amber-50 text-amber-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              )}>
                                {itemIdx + 1}
                              </span>
                              <span className="truncate inline-block">{prod.name}</span>
                            </div>
                          </td>

                          {/* Revenue */}
                          <td className="py-2 text-right font-extrabold text-slate-900 dark:text-slate-100 font-sans truncate">
                            {formatAmount(prod.revenue)}
                          </td>

                          {/* Units */}
                          <td className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 font-sans pr-1">
                            {prod.units !== undefined ? prod.units.toLocaleString() : 0}
                          </td>

                          {/* Share % */}
                          <td className="py-2 text-right font-bold text-slate-600 dark:text-slate-300 font-sans pr-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800/90 text-[9.5px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {shareVal}%
                            </span>
                          </td>

                          {/* Growth Pill */}
                          <td className="py-2 text-right pr-1">
                            <span className={cn(
                              "inline-flex items-center gap-0.5 text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shadow-3xs",
                              growthVal > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60"
                                : growthVal < 0
                                  ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60"
                                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}>
                              {growthVal > 0 ? `+${growthVal.toFixed(1)}%` : `${growthVal.toFixed(1)}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <EmptyDataState title="No Products / Services Found" subtitle="No product or service breakdown available for selected date period" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsProductBreakdownOpen(true)}
            className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline mt-4 inline-flex items-center gap-1 self-start cursor-pointer bg-transparent border-0 p-0"
          >
            <span>View All Products & Services</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 3.5: REVENUE BY REGION (FULL WIDTH DIRECTLY BELOW TOP CUSTOMERS & PRODUCTS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="lg:col-span-12 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header with Demo Toggle */}
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Revenue by Region</h3>
                <CardTooltip text="Geographic breakdown of total turnover by customer country or region." />
              </div>
              {!(salesData?.regions && salesData.regions.length > 0) && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoRegionData(!showDemoRegionData)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      showDemoRegionData ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                        showDemoRegionData ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* 2-Column Split Layout for Full Width Card: Map on Left, Interactive Stats & City Breakdown on Right */}
            {(() => {
              const activeRegionsList = (salesData?.regions && salesData.regions.length > 0)
                ? salesData.regions
                : [
                    {
                      name: "UK General / South East",
                      revenue: totalRev || 3799019,
                      pct: 98.1,
                      flag: "🇬🇧",
                      countryCode: "GB",
                      invoiceCount: 140,
                      cities: [
                        { name: "Southend-On-Sea", revenue: 2450000, pct: 64.5, count: 85 },
                        { name: "Oxford", revenue: 890000, pct: 23.4, count: 35 },
                        { name: "Marlow & Berkshire", revenue: 459019, pct: 12.1, count: 20 }
                      ]
                    },
                    {
                      name: "Greater London",
                      revenue: 65605,
                      pct: 1.7,
                      flag: "🇬🇧",
                      countryCode: "GB",
                      invoiceCount: 8,
                      cities: [
                        { name: "London", revenue: 42500, pct: 64.8, count: 5 },
                        { name: "Islington & Lambeth", revenue: 15105, pct: 23.0, count: 2 },
                        { name: "Hillingdon", revenue: 8000, pct: 12.2, count: 1 }
                      ]
                    },
                    {
                      name: "West Midlands",
                      revenue: 8141,
                      pct: 0.2,
                      flag: "🇬🇧",
                      countryCode: "GB",
                      invoiceCount: 2,
                      cities: [
                        { name: "Shrewsbury / Shropshire", revenue: 8141, pct: 100.0, count: 2 }
                      ]
                    }
                  ];

              const currentRegion = activeRegionsList[selectedRegionIndex % activeRegionsList.length] || activeRegionsList[0];
              const regionColors = ["bg-blue-600", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-indigo-500", "bg-rose-500", "bg-cyan-500"];

              // Precise Map pin location coordinates & zoom origins per region (SVG 1008x651 canvas)
              const getPinCoords = (regionName: string, countryCode: string) => {
                const name = (regionName || '').toLowerCase();
                const code = (countryCode || '').toUpperCase();
                if (code === 'ZA' || name.includes('south africa') || name.includes('international')) {
                  return { top: '84.1%', left: '54.5%', zoomClass: 'origin-[54.5%_84.1%] scale-[1.8]' };
                }
                if (name.includes('london')) {
                  return { top: '42.5%', left: '46.5%', zoomClass: 'origin-[46.5%_42.5%] scale-[1.7]' };
                }
                if (name.includes('north west') || name.includes('manchester')) {
                  return { top: '39.5%', left: '46.0%', zoomClass: 'origin-[46.0%_39.5%] scale-[1.7]' };
                }
                if (name.includes('yorkshire') || name.includes('leeds')) {
                  return { top: '39.5%', left: '46.5%', zoomClass: 'origin-[46.5%_39.5%] scale-[1.7]' };
                }
                if (name.includes('midlands') || name.includes('birmingham')) {
                  return { top: '41.0%', left: '46.0%', zoomClass: 'origin-[46.0%_41.0%] scale-[1.7]' };
                }
                // Default UK South East (London/UK center: 46.2% left, 41.5% top)
                return { top: '41.5%', left: '46.2%', zoomClass: 'origin-[46.2%_41.5%] scale-[1.6]' };
              };

              const pin = getPinCoords(currentRegion.name, currentRegion.countryCode || currentRegion.code);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Interactive World Map with Smooth Zooming & Accurate Spotlight Pin */}
                  <div className="lg:col-span-7 flex flex-col items-center justify-center w-full min-h-[290px] relative rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-slate-800/80 overflow-hidden">
                    
                    {/* Animated Zoomed Map SVG Container */}
                    <div className={cn("w-full transition-transform duration-700 ease-out transform", pin.zoomClass)}>
                      <WorldMapSvg activeCountryIds={showDemoRegionData ? ['GB', 'US', 'DE', 'AU'] : activeRegionsList.map((r: any) => r.countryCode || 'GB')} />
                    </div>

                    {/* Precise Floating Spotlight Pin over Actual Location */}
                    {currentRegion && (
                      <div
                        className="absolute z-20 transition-all duration-500 ease-out pointer-events-none -translate-x-1/2 -translate-y-full"
                        style={{ top: pin.top, left: pin.left }}
                      >
                        {/* Target Pulse Ring */}
                        <div className="relative flex items-center justify-center mb-1">
                          <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white shadow-md"></span>
                        </div>

                        {/* Floating Glassmorphism Tooltip Badge */}
                        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md min-w-[175px] text-left animate-bounce-short">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{currentRegion.flag || '🇬🇧'}</span>
                              <span className="text-[11px] font-extrabold text-white tracking-tight line-clamp-1">{currentRegion.name}</span>
                            </div>
                            <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500/25 text-blue-300 border border-blue-400/30 uppercase tracking-widest">Focused</span>
                          </div>
                          <div className="text-xs font-black text-blue-400 font-mono tracking-tight mt-0.5">{formatAmount(currentRegion.revenue)}</div>
                          <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-300 mt-1.5 pt-1.5 border-t border-slate-800/80">
                            <span>{currentRegion.pct}% of total</span>
                            {currentRegion.invoiceCount && <span>{currentRegion.invoiceCount} invoices</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Reset Zoom Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedRegionIndex(0)}
                      className="absolute bottom-3 left-3 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-10 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Map Focus</span>
                    </button>
                  </div>

                  {/* Right Column: Regional Data List + Nested City Breakdown for Active Region */}
                  <div className="lg:col-span-5 flex flex-col justify-center">
                    {loading ? (
                      <div className="space-y-3 py-6 animate-pulse">
                        <div className="h-4 bg-slate-200/80 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-200/80 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10.5px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Geographic Distribution</h4>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total: <strong className="text-slate-800 dark:text-slate-200">{formatAmount(activeRegionsList.reduce((acc: number, r: any) => acc + r.revenue, 0) || totalRev)}</strong></span>
                        </div>

                        {/* Interactive Macro Multi-segment Allocation Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-200/60 dark:border-slate-800">
                          {activeRegionsList.map((r: any, idx: number) => {
                            const isSelected = selectedRegionIndex === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedRegionIndex(idx)}
                                className={cn(
                                  "h-full transition-all duration-300 cursor-pointer focus:outline-none",
                                  regionColors[idx % regionColors.length],
                                  isSelected ? "scale-y-125 opacity-100 shadow-sm z-10" : "opacity-80 hover:opacity-100",
                                  idx === 0 ? "rounded-l-full" : "",
                                  idx === activeRegionsList.length - 1 ? "rounded-r-full" : ""
                                )}
                                style={{ width: `${r.pct}%` }}
                                title={`${r.name}: ${r.pct}% (${formatAmount(r.revenue)})`}
                              />
                            );
                          })}
                        </div>

                        {/* Regional Rows with Nested City/District Breakdown */}
                        <div className="space-y-2 pt-1 max-h-[310px] overflow-y-auto pr-1">
                          {activeRegionsList.map((r: any, idx: number) => {
                            const color = regionColors[idx % regionColors.length];
                            const isSelected = selectedRegionIndex === idx;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedRegionIndex(idx)}
                                className={cn(
                                  "group p-2.5 rounded-xl transition-all duration-300 cursor-pointer border",
                                  isSelected
                                    ? "bg-blue-50/90 dark:bg-blue-950/60 border-l-4 border-l-blue-600 border-blue-200/80 dark:border-blue-800/80 shadow-2xs"
                                    : "border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-90 hover:opacity-100"
                                )}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2.5">
                                    <span className={cn(
                                      "h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-300",
                                      color,
                                      isSelected ? "ring-4 ring-blue-500/20 scale-125" : "ring-2 ring-white dark:ring-slate-900"
                                    )} />
                                    <span className={cn(
                                      "font-bold text-xs tracking-tight transition-colors",
                                      isSelected ? "text-blue-950 dark:text-blue-200 font-extrabold" : "text-slate-800 dark:text-slate-200"
                                    )}>
                                      {r.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-[12.5px]">{formatAmount(r.revenue)}</span>
                                    <span className={cn(
                                      "font-bold text-[10px] px-2 py-0.5 rounded-md min-w-[44px] text-center border transition-all",
                                      isSelected
                                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60"
                                    )}>
                                      {r.pct}%
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-500", color, isSelected ? "opacity-100" : "opacity-75 group-hover:opacity-100")}
                                    style={{ width: `${r.pct}%` }}
                                  />
                                </div>

                                {/* EXPANDED CITY / DISTRICT BREAKDOWN FOR ACTIVE SELECTED REGION */}
                                {isSelected && r.cities && r.cities.length > 0 && (
                                  <div className="mt-3 pt-2.5 border-t border-blue-200/60 dark:border-blue-800/60 space-y-1.5 animate-fadeIn">
                                    <div className="text-[9.5px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1 flex justify-between items-center">
                                      <span>City & District Sales Breakdown</span>
                                      <span>{r.cities.length} key hubs</span>
                                    </div>
                                    {r.cities.map((city: any, cIdx: number) => (
                                      <div key={cIdx} className="flex justify-between items-center py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 text-[10.5px]">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                          <span>{city.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono">
                                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatAmount(city.revenue)}</span>
                                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">{city.pct}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {(showDemoRegionData || (salesData?.regions && salesData.regions.length > 0)) && (
            <div className="border-t border-slate-100 dark:border-white/10 pt-3 mt-3 flex items-center justify-between">
              <Link href="/regions" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View Regional Analytics & Deep-dive Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 4: GROSS PROFIT ANALYSIS, REVENUE QUALITY & CUSTOMER CONCENTRATION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 pb-6">

        {/* CARD 1: GROSS PROFIT ANALYSIS */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[300px]">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Gross Profit Analysis</h3>

            {/* Waterfall Chart */}
            <div ref={waterfallRef} className="w-full h-44 my-auto" />

            {/* Bottom 4 Metrics */}
            <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-slate-100 dark:border-white/10 text-center">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gross Profit</div>
                <div className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                  {formatAmount(salesData?.executiveRow4?.grossProfitAnalysis?.grossProfit || 0)}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gross Margin</div>
                <div className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                  {(salesData?.executiveRow4?.grossProfitAnalysis?.grossMarginPct || 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">vs Prev Margin</div>
                <div className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                  {(salesData?.executiveRow4?.grossProfitAnalysis?.prevGrossMarginPct || 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Change</div>
                <div className={cn("text-[11.5px] font-extrabold", salesData?.executiveRow4?.grossProfitAnalysis?.gmChangeIsUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {salesData?.executiveRow4?.grossProfitAnalysis?.gmChangePts || '+0.0 pts'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: REVENUE QUALITY */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 shadow-2xs flex flex-col overflow-hidden min-h-[300px]">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Revenue Quality</h3>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 px-2 py-0.5 rounded-full">
              Score Based
            </span>
          </div>

          <div className="flex-1 flex flex-col px-5 py-4 gap-4">
            {/* Score + Legend Row */}
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path stroke="#f1f5f9" strokeWidth="4" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    stroke="url(#blueGrad)" strokeDasharray={`${salesData?.executiveRow4?.revenueQuality?.qualityScore || 88}, 100`}
                    strokeWidth="4" strokeLinecap="round" fill="none"
                    className="transition-all duration-1000"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <defs>
                    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ lineHeight: 1 }}>
                  <div className="flex items-end">
                    <span className="text-[21px] font-black text-slate-800 dark:text-slate-100">{salesData?.executiveRow4?.revenueQuality?.qualityScore || 88}</span>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5">/100</span>
                  </div>
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Score</span>
                </div>
              </div>

              {/* Score Label Stack */}
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Excellent', range: '90–100', color: '#10b981' },
                  { label: 'Good', range: '75–89', color: '#2563eb' },
                  { label: 'Fair', range: '50–74', color: '#f59e0b' },
                  { label: 'At Risk', range: '<50', color: '#ef4444' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{item.label}</span>
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 ml-0.5">{item.range}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Revenue Metrics with progress */}
            <div className="space-y-2.5">
              {[
                { label: 'Profitable Revenue', value: salesData?.executiveRow4?.revenueQuality?.profitableRevenue || 0, pct: salesData?.executiveRow4?.revenueQuality?.profitablePct || 100, color: '#10b981' },
                { label: 'Collectable Revenue', value: salesData?.executiveRow4?.revenueQuality?.collectableRevenue || 0, pct: salesData?.executiveRow4?.revenueQuality?.collectablePct || 86, color: '#2563eb' },
                { label: 'Sustainable Revenue', value: salesData?.executiveRow4?.revenueQuality?.sustainableRevenue || 0, pct: salesData?.executiveRow4?.revenueQuality?.sustainablePct || 75, color: '#f59e0b' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">{row.label}</span>
                    <span className="text-[10.5px] font-extrabold" style={{ color: row.color }}>{row.pct.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                    <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 font-sans shrink-0">{formatAmount(row.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-[9.5px] font-semibold text-slate-400">
              • Quality score is based on profitability, collectability & sustainability metrics.
            </p>
          </div>
        </div>

        {/* CARD 3: CUSTOMER CONCENTRATION */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[300px]">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Customer Concentration</h3>

            <div className="my-auto space-y-4 py-1">
              {/* Top 5 Contribution */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {(salesData?.executiveRow4?.customerConcentration?.top5ContributionPct || 0).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block">Top 5 Customers Contribution</span>
                  </div>
                  <span className={cn(
                    "text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs",
                    salesData?.executiveRow4?.customerConcentration?.riskLevel === 'High Risk'
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60"
                  )}>
                    {salesData?.executiveRow4?.customerConcentration?.riskLevel || 'Low Risk'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, salesData?.executiveRow4?.customerConcentration?.top5ContributionPct || 0)}%` }}
                  />
                </div>
              </div>

              {/* Largest Customer Contribution */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <div>
                    <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                      {(salesData?.executiveRow4?.customerConcentration?.largestContributionPct || 0).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block">Largest Customer Contribution</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, salesData?.executiveRow4?.customerConcentration?.largestContributionPct || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-white/10 pt-2.5 flex flex-col gap-1">
              <p className="text-[10px] font-semibold text-slate-400">
                • High concentration increases business risk.
              </p>
              <button
                type="button"
                onClick={() => setIsCustomerConcentrationOpen(true)}
                className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer self-start border-none bg-transparent p-0"
              >
                <span>View Concentration Analysis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 5: RECEIVABLES AGING, DSO & SALES TO CASH CONVERSION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 pb-6">

        {/* CARD 1: RECEIVABLES AGING */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center">
              <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Receivables Aging</h3>
              <CardTooltip text="Tracks unpaid customer invoices grouped by overdue days (Current, 1-30, 31-60, 61-90, 90+ days) to monitor collection risk." />
            </div>

            {/* Total AR metric */}
            <div className="mt-1 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  Total AR
                  <CardTooltip text="Total Accounts Receivable balance currently outstanding as on the selected date." />
                </span>
                <span className="text-xl font-black text-slate-800 font-sans tracking-tight block">
                  {formatAmount(salesData?.agingSummary?.totalAR || 0)}
                </span>
              </div>
              <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                As on {salesData?.agingSummary?.asOnDate || '31 Aug 2026'}
              </span>
            </div>

            {/* Donut Chart + Legend */}
            <div className="grid grid-cols-12 gap-2 items-center my-auto py-1">
              {/* Donut Ring (Left) - Bigger Size */}
              <div className="col-span-5 flex items-center justify-center">
                <div ref={agingRef} className="w-28 h-28" />
              </div>

              {/* Legend (Right) */}
              <div className="col-span-7 space-y-1.5 text-[10px]">
                {[
                  { label: "Current", val: salesData?.agingSummary?.current || 0, color: "bg-blue-600" },
                  { label: "1 - 30 Days", val: salesData?.agingSummary?.days1_30 || 0, color: "bg-emerald-500" },
                  { label: "31 - 60 Days", val: salesData?.agingSummary?.days31_60 || 0, color: "bg-amber-500" },
                  { label: "61 - 90 Days", val: salesData?.agingSummary?.days61_90 || 0, color: "bg-pink-500" },
                  { label: "90+ Days", val: salesData?.agingSummary?.days90Plus || 0, color: "bg-purple-500" }
                ].map((item, idx) => {
                  const total = salesData?.agingSummary?.totalAR || 0;
                  const pct = total > 0 ? ((item.val / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={idx} className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-1.5 truncate max-w-[90px]">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                        <span className="text-slate-600 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 font-sans">
                        <span className="font-extrabold text-slate-800">{formatAmount(item.val)}</span>
                        <span className="text-slate-400 text-[9px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5">
              <Link href="/aging" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View Aging Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 2: DAYS SALES OUTSTANDING (DSO) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center">
              <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Days Sales Outstanding (DSO)</h3>
              <CardTooltip text="Measures average collection time in days. Lower DSO means cash is collected faster from customers." />
            </div>

            <div className="my-auto space-y-5 py-1">
              {/* Big DSO Metric */}
              <div>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">
                  {salesData?.dsoSummary?.currentDso || 0} Days
                </span>
                <span className="text-[10.5px] font-bold text-slate-400 block mt-0.5">Average Collection Period</span>
              </div>

              {/* vs Previous Period */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center mb-1">
                  vs Previous Period
                  <CardTooltip text="Comparison against DSO of the previous equal date range." />
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-slate-800">
                    {salesData?.dsoSummary?.prevDso || 0} Days
                  </span>
                  <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs flex items-center gap-1">
                    <span>↑ {salesData?.dsoSummary?.dsoChange || 0} Days</span>
                  </span>
                </div>
              </div>

              {/* Industry Benchmark */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span className="font-bold text-slate-400 flex items-center">
                  Industry Benchmark
                  <CardTooltip text="Standard 35-day target benchmark for optimal credit control and cash collection." />
                </span>
                <span className="font-extrabold text-slate-800">35 Days</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5">
              <Link href="/dso" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View DSO Analysis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 3: SALES TO CASH CONVERSION */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center mb-2">
              <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Sales to Cash Conversion</h3>
              <CardTooltip text="Shows sales turnover funnel from Revenue to Invoiced to Collected cash vs Outstanding & Overdue receivables." />
            </div>

            <div className="grid grid-cols-12 gap-2 items-center my-auto py-1">
              {/* Funnel Breakdown with Wide SVG Illustration (Left) */}
              <div className="col-span-7 flex items-center gap-2">
                {/* 72px Wide SVG 5-Stage Funnel Illustration */}
                <svg width="72" height="122" viewBox="0 0 72 122" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-2xs">
                  <path d="M 2,2 L 70,2 C 71.1,2 71.8,3.1 71.2,4.1 L 61.8,20.1 C 61.4,21.2 60.4,22 59.2,22 L 12.8,22 C 11.6,22 10.6,21.2 10.2,20.1 L 0.8,4.1 C 0.2,3.1 0.9,2 2,2 Z" fill="#2563eb" />
                  <path d="M 11.2,26 L 60.8,26 C 61.9,26 62.6,27.1 62.0,28.1 L 52.8,44.1 C 52.4,45.2 51.4,46 50.2,46 L 21.8,46 C 20.6,46 19.6,45.2 19.2,44.1 L 10.0,28.1 C 9.4,27.1 10.1,26 11.2,26 Z" fill="#60a5fa" />
                  <path d="M 20.2,50 L 51.8,50 C 52.9,50 53.6,51.1 53.0,52.1 L 44.8,68.1 C 44.4,69.2 43.4,70 42.2,70 L 29.8,70 C 28.6,70 27.6,69.2 27.2,68.1 L 19.0,52.1 C 18.4,51.1 19.1,50 20.2,50 Z" fill="#93c5fd" />
                  <path d="M 28.2,74 L 43.8,74 C 44.9,74 45.6,75.1 45.0,76.1 L 37.8,92.1 C 37.4,93.2 36.4,94 35.2,94 L 36.8,94 C 35.6,94 34.6,93.2 34.2,92.1 L 27.0,76.1 C 26.4,75.1 27.1,74 28.2,74 Z" fill="#bfdbfe" />
                  <path d="M 33.5,98 L 38.5,98 C 39.6,98 40.2,99.2 39.5,100.1 L 36.7,115.1 C 36.3,116.2 35.7,116.2 35.3,115.1 L 32.5,100.1 C 31.8,99.2 32.4,98 33.5,98 Z" fill="#34d399" />
                </svg>

                {/* Rows List */}
                <div className="flex-1 space-y-2 min-w-0">
                  {[
                    { label: "Revenue", val: totalRev || 0, pct: "100%" },
                    { label: "Invoiced", val: salesData?.cashConversion?.invoiced || totalRev || 0, pct: totalRev > 0 ? `${(((salesData?.cashConversion?.invoiced || totalRev || 0) / totalRev) * 100).toFixed(0)}%` : "0%" },
                    { label: "Collected", val: salesData?.cashConversion?.collected || 0, pct: totalRev > 0 ? `${(((salesData?.cashConversion?.collected || 0) / totalRev) * 100).toFixed(0)}%` : "0%" },
                    { label: "Outstanding", val: salesData?.cashConversion?.outstanding || 0, pct: totalRev > 0 ? `${(((salesData?.cashConversion?.outstanding || 0) / totalRev) * 100).toFixed(0)}%` : "0%" },
                    { label: "Overdue", val: salesData?.cashConversion?.overdue || 0, pct: totalRev > 0 ? `${(((salesData?.cashConversion?.overdue || 0) / totalRev) * 100).toFixed(0)}%` : "0%" }
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9.5px]">
                      <span className="font-bold text-slate-600 truncate mr-1">{row.label}</span>
                      <div className="flex items-center gap-1 font-sans shrink-0">
                        <span className="font-extrabold text-slate-800">{formatAmount(row.val)}</span>
                        <span className="text-slate-400 text-[8.5px] w-5 text-right font-semibold">{row.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Conversion Rate Card (Right) */}
              <div className="col-span-5 bg-slate-50/70 rounded-xl border border-slate-100 p-2 flex flex-col items-center justify-between text-center min-h-[145px]">
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-center">
                  Cash Conversion
                  <CardTooltip text="Ratio of cash collected to total sales revenue. Higher % means faster cash flow conversion." />
                </span>

                <div className="my-0.5">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">
                    {(salesData?.cashConversion?.rate || 0).toFixed(1)}%
                  </span>
                  <span className="text-[8.5px] font-bold text-slate-400 block">
                    vs Prev: {(salesData?.cashConversion?.prevRate || 0).toFixed(1)}%
                  </span>
                </div>

                {/* Sparkline line container */}
                <div ref={conversionSparkRef} className="w-full h-8 my-0.5" />

                <span className={cn(
                  "text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs truncate max-w-full",
                  salesData?.cashConversion?.isImproving !== false
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-rose-600 bg-rose-50 border-rose-100"
                )}>
                  {salesData?.cashConversion?.isImproving !== false ? 'Improving ↑' : 'Declining ↓'} {salesData?.cashConversion?.rateChangePts || '+0.0 pts'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5">
              <Link href="/analytics" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View Cash Flow Analysis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 6: SALES FORECAST, CUSTOMER RISK & MARGIN RISK */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 pb-6">

        {/* CARD 1: SALES FORECAST (NEXT 30 DAYS) - COMING SOON WITH DEMO PREVIEW */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-4.5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Header with Coming Soon Badge & Demo Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Sales Forecast (Next 30 Days)</h3>
                  <CardTooltip text="AI/Statistical 30-day projected turnover based on customer purchasing history, contracts, and seasonality." />
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                    Coming Soon
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoForecast(!showDemoForecast)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      showDemoForecast ? "bg-purple-600" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                        showDemoForecast ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {!showDemoForecast ? (
                /* CENTERED COMING SOON STATE */
                <div className="flex flex-col items-center justify-center text-center py-5 px-3 my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50/80 border border-purple-100/80 flex items-center justify-center mb-2 text-purple-600 shadow-2xs">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">AI Sales Forecast (Coming Soon)</h4>
                  <p className="text-[10.5px] font-medium text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                    Predictive 30-day turnover modeling powered by AI customer purchasing trends.
                  </p>
                  <button
                    onClick={() => setShowDemoForecast(true)}
                    className="mt-3.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200/80 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Preview Demo Forecast</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* DEMO FORECAST PREVIEW MODE */
                <div>
                  {/* Projected Revenue & Confidence Row */}
                  <div className="flex items-center justify-between mt-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projected Revenue</span>
                      <span className="text-2xl font-black text-slate-800 font-sans tracking-tight">
                        {formatAmount(4860000)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confidence</span>
                      <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100/80 rounded-full text-xs font-black mt-0.5">
                        82%
                      </span>
                    </div>
                  </div>

                  {/* 3 Scenario Boxes */}
                  <div className="grid grid-cols-3 gap-2 my-auto">
                    {/* Downside */}
                    <div className="bg-rose-50/60 border border-rose-100/80 rounded-xl p-2 text-center">
                      <span className="text-[9.5px] font-extrabold text-slate-500 block">Downside</span>
                      <span className="text-[12.5px] font-black text-slate-800 font-sans block my-0.5">
                        {formatAmount(4420000)}
                      </span>
                      <span className="text-[9px] font-extrabold text-rose-600 block">
                        -9.1%
                      </span>
                    </div>

                    {/* Base Case */}
                    <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-2 text-center">
                      <span className="text-[9.5px] font-extrabold text-blue-600 block">Base Case</span>
                      <span className="text-[12.5px] font-black text-slate-800 font-sans block my-0.5">
                        {formatAmount(4860000)}
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-400 block">
                        0.0%
                      </span>
                    </div>

                    {/* Upside */}
                    <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-2 text-center">
                      <span className="text-[9.5px] font-extrabold text-emerald-600 block">Upside</span>
                      <span className="text-[12.5px] font-black text-slate-800 font-sans block my-0.5">
                        {formatAmount(5240000)}
                      </span>
                      <span className="text-[9px] font-extrabold text-emerald-600 block">
                        +7.8%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5 mt-3">
              <Link href="/analytics" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View Forecast Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 2: CUSTOMER RISK OVERVIEW */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          {/* Header */}
          <div className="flex items-center pb-2.5 border-b border-slate-100 dark:border-white/10">
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Customer Risk Overview</h3>
            <CardTooltip text="Categorizes active customers into Low, Medium, and High credit risk based on payment delays and DSO trends." />
          </div>

          {/* 100% VERTICALLY & HORIZONTALLY CENTERED CONTENT */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="flex items-center justify-center gap-7">
              {/* Donut Ring (Left - 160px Large) */}
              <div className="flex items-center justify-center shrink-0">
                <div ref={customerRiskRef} className="w-40 h-40" />
              </div>

              {/* Legend (Right - Larger text & spacing) */}
              <div className="space-y-3.5 text-xs min-w-[155px]">
                {[
                  { label: "Low Risk", val: salesData?.customerRiskOverview?.lowRisk || 0, pct: salesData?.customerRiskOverview?.lowRiskPct || 0, color: "bg-emerald-500" },
                  { label: "Medium Risk", val: salesData?.customerRiskOverview?.mediumRisk || 0, pct: salesData?.customerRiskOverview?.mediumRiskPct || 0, color: "bg-amber-500" },
                  { label: "High Risk", val: salesData?.customerRiskOverview?.highRisk || 0, pct: salesData?.customerRiskOverview?.highRiskPct || 0, color: "bg-rose-500" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3.5 font-semibold">
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn("h-3 w-3 rounded-full shrink-0", item.color)} />
                      <span className="text-slate-700 font-bold truncate text-xs">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-extrabold text-slate-800 text-sm">{item.val}</span>
                      <span className="text-slate-400 text-xs font-bold">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-2.5">
            <Link href="/customers" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
              <span>View Customer Risk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: MARGIN RISK OVERVIEW */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[310px]">
          {/* Header */}
          <div className="flex items-center pb-2.5 border-b border-slate-100 dark:border-white/10">
            <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Margin Risk Overview</h3>
            <CardTooltip text="Monitors gross profit margin trends per product line (Improving, Stable, Declining) to detect cost erosion." />
          </div>

          {/* 100% VERTICALLY & HORIZONTALLY CENTERED CONTENT */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="flex items-center justify-center gap-7">
              {/* Donut Ring (Left - 160px Large) */}
              <div className="flex items-center justify-center shrink-0">
                <div ref={marginRiskRef} className="w-40 h-40" />
              </div>

              {/* Legend (Right - Larger text & spacing) */}
              <div className="space-y-3.5 text-xs min-w-[155px]">
                {[
                  { label: "Improving", val: salesData?.marginRiskOverview?.improving || 0, pct: salesData?.marginRiskOverview?.improvingPct || 0, color: "bg-emerald-500" },
                  { label: "Stable", val: salesData?.marginRiskOverview?.stable || 0, pct: salesData?.marginRiskOverview?.stablePct || 0, color: "bg-amber-500" },
                  { label: "Declining", val: salesData?.marginRiskOverview?.declining || 0, pct: salesData?.marginRiskOverview?.decliningPct || 0, color: "bg-rose-500" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3.5 font-semibold">
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn("h-3 w-3 rounded-full shrink-0", item.color)} />
                      <span className="text-slate-700 font-bold truncate text-xs">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-extrabold text-slate-800 text-sm">{item.val}</span>
                      <span className="text-slate-400 text-xs font-bold">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-2.5">
            <Link href="/analytics" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
              <span>View Margin Risk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 7: SALES INSIGHTS & CFO RECOMMENDED ACTIONS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 pb-6">

        {/* CARD 1: SALES INSIGHTS (DATA TABLE FORMAT) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[350px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-white/10">
                <div className="h-6.5 w-6.5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Sales Insights</h3>
                <CardTooltip text="Realtime automated key findings and operational signals generated from sales turnover & invoice activity." />
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold w-8 text-center">#</th>
                      <th className="pb-3 font-bold">Insight / Finding</th>
                      <th className="pb-3 font-bold">Category</th>
                      <th className="pb-3 text-right font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {[
                      {
                        cat: "Revenue",
                        catBg: "bg-blue-50 text-blue-700 border-blue-200",
                        text: salesData?.salesSnapshot?.totalRevenue
                          ? `Revenue stands at ${formatAmount(salesData.salesSnapshot.totalRevenue.value)}, driven by core sales activity.`
                          : "Revenue grew 18.6%, mainly driven by existing customers.",
                        time: "5 min ago"
                      },
                      {
                        cat: "Margin",
                        catBg: "bg-amber-50 text-amber-700 border-amber-200",
                        text: salesData?.executiveRow4?.grossProfitAnalysis
                          ? `Gross margin is currently ${salesData.executiveRow4.grossProfitAnalysis.grossMarginPct.toFixed(1)}% across net turnover.`
                          : "Gross margin declined by 4.2 pts due to low-margin customers.",
                        time: "12 min ago"
                      },
                      {
                        cat: "Collections",
                        catBg: "bg-purple-50 text-purple-700 border-purple-200",
                        text: salesData?.dsoSummary
                          ? `Average collection period (DSO) is ${salesData.dsoSummary.currentDso} Days.`
                          : "DSO increased by 9 days, indicating slower collections.",
                        time: "18 min ago"
                      },
                      {
                        cat: "Customer",
                        catBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        text: salesData?.topCustomers?.[0]
                          ? `Top customer "${salesData.topCustomers[0].name}" accounts for ${formatAmount(salesData.topCustomers[0].revenue)} of total sales.`
                          : "Top product line shows strong quarterly growth.",
                        time: "25 min ago"
                      },
                      {
                        cat: "AR Risk",
                        catBg: "bg-rose-50 text-rose-700 border-rose-200",
                        text: salesData?.agingSummary
                          ? `${formatAmount(salesData.agingSummary.days61_90 + salesData.agingSummary.days90Plus)} receivables are overdue beyond 60 days.`
                          : "Receivables beyond 60 days require collection attention.",
                        time: "32 min ago"
                      }
                    ].map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 text-center font-black text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-3 font-bold text-slate-800 leading-snug pr-2">{item.text}</td>
                        <td className="py-3">
                          <span className={cn("text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border inline-block whitespace-nowrap", item.catBg)}>
                            {item.cat}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-400 text-[10px] whitespace-nowrap">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-3">
              <Link href="/analytics" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View All Insights</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 2: CFO RECOMMENDED ACTIONS (COMING SOON WITH DEMO PREVIEW) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[350px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Header with Coming Soon Badge & Demo Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">CFO Recommended Actions</h3>
                  <CardTooltip text="AI-driven priority action list to optimize gross margin, accelerate cash collections, and minimize concentration risk." />
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                    Coming Soon
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoCfoActions(!showDemoCfoActions)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      showDemoCfoActions ? "bg-purple-600" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                        showDemoCfoActions ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {!showDemoCfoActions ? (
                /* CENTERED COMING SOON STATE - Prominent & Well Proportioned */
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50/80 border border-purple-100/80 flex items-center justify-center mb-3 text-purple-600 shadow-2xs">
                    <Sparkles className="w-7 h-7 text-purple-600" />
                  </div>
                  <h4 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">AI CFO Recommended Actions (Coming Soon)</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 max-w-[320px] leading-relaxed">
                    Automated CFO intervention recommendations to maximize gross margin and accelerate cash flow collections.
                  </p>
                  <button
                    onClick={() => setShowDemoCfoActions(true)}
                    className="mt-4 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200/80 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Preview Recommended Actions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* DEMO RECOMMENDED ACTIONS TABLE PREVIEW - Spacious & Readable */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-bold">Priority</th>
                        <th className="pb-3 font-bold">Action</th>
                        <th className="pb-3 font-bold">Impact</th>
                        <th className="pb-3 font-bold">Reason</th>
                        <th className="pb-3 text-right font-bold">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px]">
                      {[
                        { priority: "High", pColor: "bg-rose-50 text-rose-700 border-rose-200", action: "Review pricing for 4 customers", impact: "+£3.8k GP / month", impColor: "text-emerald-600", reason: "Low margins vs historical", due: "This Week" },
                        { priority: "High", pColor: "bg-rose-50 text-rose-700 border-rose-200", action: "Collect overdue from 6 accounts", impact: "+£4.2k cash", impColor: "text-emerald-600", reason: "£1.3k overdue > 90 days", due: "This Week" },
                        { priority: "Medium", pColor: "bg-amber-50 text-amber-700 border-amber-200", action: "Reduce revenue concentration", impact: "Reduce risk by 27.4%", impColor: "text-emerald-600", reason: "Top 5 customers 61.4% revenue", due: "This Month" },
                        { priority: "Medium", pColor: "bg-amber-50 text-amber-700 border-amber-200", action: "Improve product mix (Low margin)", impact: "+£1.6k GP / month", impColor: "text-emerald-600", reason: "Low margin products grew 18%", due: "Next 30 Days" },
                        { priority: "Low", pColor: "bg-emerald-50 text-emerald-700 border-emerald-200", action: "New customer acquisition", impact: "+14% pipeline", impColor: "text-emerald-600", reason: "Sustainable long term growth", due: "Ongoing" }
                      ].map((row, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-slate-50/50 transition">
                          <td className="py-3">
                            <span className={cn("text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5", row.pColor)}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              <span>{row.priority}</span>
                            </span>
                          </td>
                          <td className="py-3 font-bold text-slate-800">{row.action}</td>
                          <td className={cn("py-3 font-extrabold font-sans", row.impColor)}>{row.impact}</td>
                          <td className="py-3 font-semibold text-slate-500">{row.reason}</td>
                          <td className="py-3 text-right font-extrabold text-slate-700">{row.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-3">
              <Link href="/analytics" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View All Actions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE ROW 8: RECENT INVOICES, CREDIT NOTES & PAYMENTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 pb-6">

        {/* CARD 1: RECENT INVOICES */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Header with Demo Toggle (Hidden when Live Data is active) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                <div className="flex items-center">
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Recent Invoices</h3>
                  <CardTooltip text="Latest customer sales invoices generated across all channels." />
                </div>
                {!(salesData?.recentInvoices && salesData.recentInvoices.length > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                    <button
                      type="button"
                      onClick={() => setShowDemoInvoices(!showDemoInvoices)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        showDemoInvoices ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                          showDemoInvoices ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[30%]">Invoice #</th>
                        <th className="pb-2 font-bold w-[30%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[12%]">Amount</th>
                        <th className="pb-2 text-right font-bold w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      <TableSkeletonRows rows={8} cols={5} />
                    </tbody>
                  </table>
                </div>
              ) : (showDemoInvoices ? [
                { number: "INV-2036-1567", customer: "ABC Pvt Ltd", date: "25 Aug 2026", amount: 5420, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { number: "INV-2036-1566", customer: "Global Solutions", date: "25 Aug 2026", amount: 3250, status: "Sent", statusColor: "bg-amber-50 text-amber-600 border-amber-100" },
                { number: "INV-2036-1565", customer: "TechSoft India", date: "24 Aug 2026", amount: 8750, status: "Overdue", statusColor: "bg-rose-50 text-rose-600 border-rose-100" },
                { number: "INV-2036-1564", customer: "Bright Future Pvt Ltd", date: "24 Aug 2026", amount: 2160, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { number: "INV-2036-1563", customer: "XYZ Enterprises", date: "23 Aug 2026", amount: 4930, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { number: "INV-2036-1562", customer: "Apex Dynamics", date: "22 Aug 2026", amount: 6180, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { number: "INV-2036-1561", customer: "Crestview Labs", date: "21 Aug 2026", amount: 1450, status: "Sent", statusColor: "bg-amber-50 text-amber-600 border-amber-100" },
                { number: "INV-2036-1560", customer: "Vertex Logistics", date: "20 Aug 2026", amount: 3900, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" }
              ] : (salesData?.recentInvoices || [])).length > 0 ? (
                /* LIVE DATA TABLE (Overflow Hidden with Clean Tooltip Truncation) */
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[30%]">Invoice #</th>
                        <th className="pb-2 font-bold w-[30%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[12%]">Amount</th>
                        <th className="pb-2 text-right font-bold w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      {(showDemoInvoices ? [
                        { number: "INV-2036-1567", customer: "ABC Pvt Ltd", date: "25 Aug 2026", amount: 5420, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                        { number: "INV-2036-1566", customer: "Global Solutions", date: "25 Aug 2026", amount: 3250, status: "Sent", statusColor: "bg-amber-50 text-amber-600 border-amber-100" },
                        { number: "INV-2036-1565", customer: "TechSoft India", date: "24 Aug 2026", amount: 8750, status: "Overdue", statusColor: "bg-rose-50 text-rose-600 border-rose-100" },
                        { number: "INV-2036-1564", customer: "Bright Future Pvt Ltd", date: "24 Aug 2026", amount: 2160, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                        { number: "INV-2036-1563", customer: "XYZ Enterprises", date: "23 Aug 2026", amount: 4930, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                        { number: "INV-2036-1562", customer: "Apex Dynamics", date: "22 Aug 2026", amount: 6180, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                        { number: "INV-2036-1561", customer: "Crestview Labs", date: "21 Aug 2026", amount: 1450, status: "Sent", statusColor: "bg-amber-50 text-amber-600 border-amber-100" },
                        { number: "INV-2036-1560", customer: "Vertex Logistics", date: "20 Aug 2026", amount: 3900, status: "Paid", statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100" }
                      ] : (salesData?.recentInvoices || [])).slice(0, 8).map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2 font-bold text-blue-600 truncate pr-1" title={inv.number}>{inv.number}</td>
                          <td className="py-2 font-semibold text-slate-700 truncate pr-1" title={inv.customer}>{inv.customer}</td>
                          <td className="py-2 font-medium text-slate-400 whitespace-nowrap text-[9.5px]">{inv.date}</td>
                          <td className="py-2 text-right font-extrabold text-slate-800 font-sans whitespace-nowrap">{formatAmount(inv.amount)}</td>
                          <td className="py-2 text-right pl-1">
                            <span className={cn("text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full border inline-block whitespace-nowrap", inv.statusColor || "bg-blue-50 text-blue-600 border-blue-100")}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* EMPTY DATA STATE (0 DATA BASELINE) */
                <div className="flex flex-col items-center justify-center text-center py-6 my-auto">
                  <EmptyDataState
                    title="No Recent Invoices Found"
                    subtitle="No recent invoice transactions registered for selected date period"
                  />
                  <button
                    onClick={() => setShowDemoInvoices(true)}
                    className="mt-3 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Preview with Demo Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5 mt-2">
              <Link href="/invoices" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View All Invoices</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 2: RECENT CREDIT NOTES */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Header with Demo Toggle (Hidden when Live Data is active) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                <div className="flex items-center">
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Recent Credit Notes</h3>
                  <CardTooltip text="Credit adjustments and refund notes issued against customer accounts." />
                </div>
                {!(salesData?.recentCreditNotes && salesData.recentCreditNotes.length > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                    <button
                      type="button"
                      onClick={() => setShowDemoCreditNotes(!showDemoCreditNotes)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        showDemoCreditNotes ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                          showDemoCreditNotes ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[34%]">Credit Note #</th>
                        <th className="pb-2 font-bold w-[34%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[14%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      <TableSkeletonRows rows={8} cols={4} />
                    </tbody>
                  </table>
                </div>
              ) : (showDemoCreditNotes ? [
                { number: "CN-2036-0021", customer: "ABC Pvt Ltd", date: "24 Aug 2026", amount: 1250 },
                { number: "CN-2036-0020", customer: "Global Solutions", date: "22 Aug 2026", amount: 850 },
                { number: "CN-2036-0019", customer: "TechSoft India", date: "21 Aug 2026", amount: 1120 },
                { number: "CN-2036-0018", customer: "Bright Future Pvt Ltd", date: "21 Aug 2026", amount: 630 },
                { number: "CN-2036-0017", customer: "XYZ Enterprises", date: "20 Aug 2026", amount: 480 },
                { number: "CN-2036-0016", customer: "Apex Dynamics", date: "19 Aug 2026", amount: 920 },
                { number: "CN-2036-0015", customer: "Crestview Labs", date: "18 Aug 2026", amount: 340 },
                { number: "CN-2036-0014", customer: "Vertex Logistics", date: "17 Aug 2026", amount: 780 }
              ] : (salesData?.recentCreditNotes || [])).length > 0 ? (
                /* LIVE DATA TABLE */
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[34%]">Credit Note #</th>
                        <th className="pb-2 font-bold w-[34%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[14%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      {(showDemoCreditNotes ? [
                        { number: "CN-2036-0021", customer: "ABC Pvt Ltd", date: "24 Aug 2026", amount: 1250 },
                        { number: "CN-2036-0020", customer: "Global Solutions", date: "22 Aug 2026", amount: 850 },
                        { number: "CN-2036-0019", customer: "TechSoft India", date: "21 Aug 2026", amount: 1120 },
                        { number: "CN-2036-0018", customer: "Bright Future Pvt Ltd", date: "21 Aug 2026", amount: 630 },
                        { number: "CN-2036-0017", customer: "XYZ Enterprises", date: "20 Aug 2026", amount: 480 },
                        { number: "CN-2036-0016", customer: "Apex Dynamics", date: "19 Aug 2026", amount: 920 },
                        { number: "CN-2036-0015", customer: "Crestview Labs", date: "18 Aug 2026", amount: 340 },
                        { number: "CN-2036-0014", customer: "Vertex Logistics", date: "17 Aug 2026", amount: 780 }
                      ] : (salesData?.recentCreditNotes || [])).slice(0, 8).map((cnItem: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2 font-bold text-blue-600 truncate pr-1" title={cnItem.number}>{cnItem.number}</td>
                          <td className="py-2 font-semibold text-slate-700 truncate pr-1" title={cnItem.customer}>{cnItem.customer}</td>
                          <td className="py-2 font-medium text-slate-400 whitespace-nowrap text-[9.5px]">{cnItem.date}</td>
                          <td className="py-2 text-right font-extrabold text-slate-800 font-sans whitespace-nowrap">{formatAmount(cnItem.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* EMPTY DATA STATE (0 DATA BASELINE) */
                <div className="flex flex-col items-center justify-center text-center py-6 my-auto">
                  <EmptyDataState
                    title="No Credit Notes Found"
                    subtitle="No recent credit note adjustments issued for selected date period"
                  />
                  <button
                    onClick={() => setShowDemoCreditNotes(true)}
                    className="mt-3 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Preview with Demo Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5 mt-2">
              <Link href="/invoices" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View All Credit Notes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CARD 3: RECENT PAYMENTS */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/25 text-slate-800 dark:text-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Header with Demo Toggle (Hidden when Live Data is active) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                <div className="flex items-center">
                  <h3 className="text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Recent Payments</h3>
                  <CardTooltip text="Customer receipts and cash payments collected into bank accounts." />
                </div>
                {!(salesData?.recentPayments && salesData.recentPayments.length > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Demo Data</span>
                    <button
                      type="button"
                      onClick={() => setShowDemoPayments(!showDemoPayments)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        showDemoPayments ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                          showDemoPayments ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[34%]">Invoice #</th>
                        <th className="pb-2 font-bold w-[34%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[14%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      <TableSkeletonRows rows={8} cols={4} />
                    </tbody>
                  </table>
                </div>
              ) : (showDemoPayments ? [
                { number: "INV-2036-1567", customer: "Groupon", date: "31 Aug 2026", amount: 4320 },
                { number: "INV-2036-1566", customer: "eBay", date: "31 Aug 2026", amount: 93181 },
                { number: "INV-2036-1565", customer: "Sangers (Maidstone) Ltd", date: "28 Aug 2026", amount: 21600 },
                { number: "INV-2036-1564", customer: "Stripe Payments", date: "28 Aug 2026", amount: 301 },
                { number: "INV-2036-1563", customer: "Stripe Payments", date: "28 Aug 2026", amount: 13755 },
                { number: "INV-2036-1562", customer: "Apex Dynamics", date: "27 Aug 2026", amount: 6180 },
                { number: "INV-2036-1561", customer: "Crestview Labs", date: "26 Aug 2026", amount: 1450 },
                { number: "INV-2036-1560", customer: "Vertex Logistics", date: "25 Aug 2026", amount: 3900 }
              ] : (salesData?.recentPayments || [])).length > 0 ? (
                /* LIVE DATA TABLE */
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10.5px] table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="pb-2 font-bold w-[34%]">Invoice #</th>
                        <th className="pb-2 font-bold w-[34%]">Customer</th>
                        <th className="pb-2 font-bold w-[18%]">Date</th>
                        <th className="pb-2 text-right font-bold w-[14%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      {(showDemoPayments ? [
                        { number: "INV-2036-1567", customer: "Groupon", date: "31 Aug 2026", amount: 4320 },
                        { number: "INV-2036-1566", customer: "eBay", date: "31 Aug 2026", amount: 93181 },
                        { number: "INV-2036-1565", customer: "Sangers (Maidstone) Ltd", date: "28 Aug 2026", amount: 21600 },
                        { number: "INV-2036-1564", customer: "Stripe Payments", date: "28 Aug 2026", amount: 301 },
                        { number: "INV-2036-1563", customer: "Stripe Payments", date: "28 Aug 2026", amount: 13755 },
                        { number: "INV-2036-1562", customer: "Apex Dynamics", date: "27 Aug 2026", amount: 6180 },
                        { number: "INV-2036-1561", customer: "Crestview Labs", date: "26 Aug 2026", amount: 1450 },
                        { number: "INV-2036-1560", customer: "Vertex Logistics", date: "25 Aug 2026", amount: 3900 }
                      ] : (salesData?.recentPayments || [])).slice(0, 8).map((rcpt: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2 font-bold text-blue-600 truncate pr-1" title={rcpt.number}>{rcpt.number}</td>
                          <td className="py-2 font-semibold text-slate-700 truncate pr-1" title={rcpt.customer}>{rcpt.customer}</td>
                          <td className="py-2 font-medium text-slate-400 whitespace-nowrap text-[9.5px]">{rcpt.date}</td>
                          <td className="py-2 text-right font-extrabold text-slate-800 font-sans whitespace-nowrap">{formatAmount(rcpt.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* EMPTY DATA STATE (0 DATA BASELINE) */
                <div className="flex flex-col items-center justify-center text-center py-6 my-auto">
                  <EmptyDataState
                    title="No Payments Recorded"
                    subtitle="No recent customer receipt transactions recorded for selected date period"
                  />
                  <button
                    onClick={() => setShowDemoPayments(true)}
                    className="mt-3 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Preview with Demo Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5 mt-2">
              <Link href="/bank-transactions" className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <span>View All Payments</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILL-DOWN BREAKDOWN PANELS (SLIDE-OVER DRAWERS) */}
      {/* ========================================================================= */}
      <TurnoverDrawerPanel
        isOpen={isTurnoverDrawerOpen}
        onClose={() => setIsTurnoverDrawerOpen(false)}
        totalRevenue={snapshot?.totalRevenue?.value || 0}
        salesData={salesData}
        formatAmount={formatAmount}
      />

      <RevenueBreakdownPanel
        isOpen={revenueBreakdownConfig.isOpen}
        onClose={() => setRevenueBreakdownConfig(prev => ({ ...prev, isOpen: false }))}
        title={revenueBreakdownConfig.title}
        totalRevenue={revenueBreakdownConfig.totalRevenue}
        salesData={salesData}
        formatAmount={formatAmount}
      />

      <GrossProfitBreakdownPanel
        isOpen={isGrossProfitBreakdownOpen}
        onClose={() => setIsGrossProfitBreakdownOpen(false)}
        formatAmount={formatAmount}
      />

      <GrossMarginAnalysisPanel
        isOpen={isGrossMarginPanelOpen}
        onClose={() => setIsGrossMarginPanelOpen(false)}
        formatAmount={formatAmount}
      />

      <InvoicesBreakdownPanel
        isOpen={isInvoicesPanelOpen}
        onClose={() => setIsInvoicesPanelOpen(false)}
        invoices={salesData?.allInvoices || salesData?.recentInvoices || []}
        currencySymbol={currencyCode === 'GBP' ? '£' : currencyCode === 'EUR' ? '€' : '$'}
        dateLabel={salesData?.meta?.fromDate && salesData?.meta?.toDate ? `${salesData.meta.fromDate} to ${salesData.meta.toDate}` : ''}
      />

      <AccountReceivableBreakdownPanel
        isOpen={isARPanelOpen}
        onClose={() => setIsARPanelOpen(false)}
        invoices={salesData?.allInvoices || salesData?.recentInvoices || []}
        totalAR={salesData?.salesSnapshot?.accountsReceivable?.value || 0}
        currentDso={salesData?.dsoSummary?.currentDso || 42}
        currencySymbol={currencyCode === 'GBP' ? '£' : currencyCode === 'EUR' ? '€' : '$'}
        dateLabel={salesData?.meta?.fromDate && salesData?.meta?.toDate ? `${salesData.meta.fromDate} to ${salesData.meta.toDate}` : ''}
      />

      <CustomerConcentrationPanel
        isOpen={isCustomerConcentrationOpen}
        onClose={() => setIsCustomerConcentrationOpen(false)}
        salesData={salesData}
        formatAmount={formatAmount}
      />

      <ProductBreakdownPanel
        isOpen={isProductBreakdownOpen}
        onClose={() => setIsProductBreakdownOpen(false)}
        products={salesData?.topProducts || []}
        salesData={salesData}
        formatAmount={formatAmount}
      />
    </div>
  );
}
