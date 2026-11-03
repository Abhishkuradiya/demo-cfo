'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  Layers,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BriefcaseBusiness,
  FileSpreadsheet,
  Sparkles,
  ChevronRight,
  Percent,
  Coins,
  Activity,
  Send,
  Star,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BreakevenAnalysis } from '@/components/dashboard/BreakevenAnalysis';

export default function ProfitabilityAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('ttm');
  const [waterfallUnit, setWaterfallUnit] = useState<'amount' | 'pct'>('amount');
  const [trendTimeframe, setTrendTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>(
    'monthly',
  );
  const [cfoQuestion, setCfoQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [copilotChatId, setCopilotChatId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const [periodInfo, setPeriodInfo] = useState<any>(null);
  const [data, setData] = useState<any>({});
  const [comparisonData, setComparisonData] = useState<any>(null);

  const waterfallChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  const fetchProfitabilityData = useCallback(async (periodCode: string) => {
    setIsLoading(true);
    setComparisonData(null);
    try {
      const res = await fetch(`/api/dashboard/cfo-intelligence?period=${periodCode}`);
      if (res.ok) {
        const result = await res.json();
        if (result.profitability?.available && result.connected) {
          setData({
            ...result.profitability,
            currency: result.currency || null,
          });
          setComparisonData(result.profitability.priorPeriod || null);
        } else {
          setData({ available: false, unavailableReason: result.profitability?.unavailableReason });
          setComparisonData(null);
          if (result.profitability?.unavailableReason)
            toast.info(result.profitability.unavailableReason);
        }
        if (result.periodInfo) {
          setPeriodInfo(result.periodInfo);
        }
      } else {
        const result = await res.json().catch(() => ({}));
        setData({
          available: false,
          unavailableReason: result.error || 'Xero profitability data is unavailable.',
        });
        toast.error(result.error || 'Xero profitability data is unavailable.');
      }
    } catch (err) {
      console.error('Failed to load profitability data:', err);
      setData({
        available: false,
        unavailableReason: 'Profitability data could not be loaded from the Xero report cache.',
      });
        setComparisonData(null);
      toast.error('Profitability data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchProfitabilityData('ttm'), 0);
    return () => window.clearTimeout(timer);
  }, [fetchProfitabilityData]);

  // 1. ECharts Waterfall Chart
  useEffect(() => {
    if (
      !waterfallChartRef.current ||
      !data?.revenue ||
      data.cogs == null ||
      data.grossProfit == null ||
      data.operatingProfit == null ||
      data.profitBeforeTax == null ||
      data.netProfit == null ||
      data.operatingExpenses == null
    )
      return;
    const chart = echarts.init(waterfallChartRef.current);

    const isPct = waterfallUnit === 'pct';
    const rev = isPct ? 100 : data.revenue;
    const cogs = isPct ? (data.cogs / data.revenue) * 100 : data.cogs;
    const gp = isPct ? data.grossMarginPct : data.grossProfit;
    const opex = isPct ? (data.operatingExpenses / data.revenue) * 100 : data.operatingExpenses;
    const opProfit = isPct ? (data.operatingProfit / data.revenue) * 100 : data.operatingProfit;
    const otherItems = data.profitBeforeTax - data.operatingProfit;
    const taxMovement = data.netProfit - data.profitBeforeTax;
    const pbt = isPct ? (data.profitBeforeTax / data.revenue) * 100 : data.profitBeforeTax;
    const np = isPct ? data.netMarginPct : data.netProfit;

    const sym = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : '£';
    const fmtVal = (val: number) => {
      if (isPct) return `${val.toFixed(1)}%`;
      return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const option = {
      textStyle: { fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif' },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '8%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const tar = params[1] || params[0];
          return `${tar.name}: <strong>${fmtVal(tar.value)}</strong>`;
        },
      },
      xAxis: {
        type: 'category',
        data: [
          'Net Revenue',
          'Cost of\nSales',
          'Gross Profit',
          'Operating\nExpenses',
          'Operating\nProfit',
          'Other Income /\nExpenses',
          'Profit Before\nTax',
          'Tax Expense',
          'Net Profit',
        ],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 10, fontWeight: 600 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (val: number) => fmtVal(val),
        },
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          data: [0, rev - cogs, 0, gp - opex, 0, opProfit, 0, pbt, 0],
        },
        {
          name: 'Amount',
          type: 'bar',
          stack: 'Total',
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => fmtVal(p.value),
            color: '#1e293b',
            fontSize: 10,
            fontWeight: 'bold',
          },
          data: [
            { value: rev, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
            { value: -cogs, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
            { value: gp, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
            { value: -opex, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
            { value: opProfit, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
            {
              value: isPct ? (otherItems / data.revenue) * 100 : otherItems,
              itemStyle: {
                color: otherItems >= 0 ? '#10b981' : '#f43f5e',
                borderRadius: [4, 4, 0, 0],
              },
            },
            { value: pbt, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
            {
              value: isPct ? (taxMovement / data.revenue) * 100 : taxMovement,
              itemStyle: {
                color: taxMovement <= 0 ? '#f43f5e' : '#10b981',
                borderRadius: [4, 4, 0, 0],
              },
            },
            { value: np, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
          ],
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, waterfallUnit]);

  // 2. ECharts Profitability Trend Combo Chart
  useEffect(() => {
    if (!trendChartRef.current || !data) return;

    let chart = echarts.getInstanceByDom(trendChartRef.current);
    if (chart) {
      chart.dispose();
    }
    chart = echarts.init(trendChartRef.current);

    const sourceTrend = Array.isArray(data.monthlyTrend) ? data.monthlyTrend : [];
    let trendData = sourceTrend;
    if (trendTimeframe !== 'monthly') {
      const groupSize = trendTimeframe === 'quarterly' ? 3 : 12;
      const groups = new Map<number, any[]>();
      for (const item of sourceTrend) {
        const group = Math.floor(item.monthIdx / groupSize);
        groups.set(group, [...(groups.get(group) || []), item]);
      }
      trendData = [...groups.entries()]
        .filter(([, items]) => items.length === groupSize)
        .map(([group, items]) => {
          const revenue = items.reduce((sum, item) => sum + item.revenue, 0);
          const grossProfit = items.reduce((sum, item) => sum + item.grossProfit, 0);
          return {
            month:
              trendTimeframe === 'quarterly' ? `Q${group + 1}` : String(new Date().getFullYear()),
            revenue,
            grossProfit,
            operatingProfit: items.every((item) => item.operatingProfit != null)
              ? items.reduce((sum, item) => sum + item.operatingProfit, 0)
              : null,
            ebitda: null,
            netProfit: items.every((item) => item.netProfit != null)
              ? items.reduce((sum, item) => sum + item.netProfit, 0)
              : null,
            grossMarginPct: revenue === 0 ? null : (grossProfit / revenue) * 100,
            operatingMarginPct:
              revenue === 0 || items.some((item) => item.operatingProfit == null)
                ? null
                : (items.reduce((sum, item) => sum + item.operatingProfit, 0) / revenue) * 100,
            netMarginPct:
              revenue === 0 || items.some((item) => item.netProfit == null)
                ? null
                : (items.reduce((sum, item) => sum + item.netProfit, 0) / revenue) * 100,
          };
        });
    }

    const months = trendData.map((d: any) => d.month);
    const revs = trendData.map((d: any) => d.revenue);
    const gps = trendData.map((d: any) => d.grossProfit);
    const ops = trendData.map((d: any) => d.operatingProfit ?? null);
    const ebitdas = trendData.map((d: any) => d.ebitda ?? null);
    const nps = trendData.map((d: any) => d.netProfit);
    const margins = trendData.map((d: any) => d.grossMarginPct ?? null);
    const operatingMargins = trendData.map((d: any) => d.operatingMarginPct ?? null);
    const netMargins = trendData.map((d: any) => d.netMarginPct ?? null);

    const sym = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : '£';

    const fmtAxisLabel = (val: number) => {
      if (Math.abs(val) >= 1000000) return `${sym}${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `${sym}${Math.round(val / 1000)}k`;
      return `${sym}${Math.round(val)}`;
    };

    const option = {
      textStyle: { fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif' },
      grid: { left: '3%', right: '5%', top: '15%', bottom: '8%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#ffffff', fontSize: 11 },
        formatter: (params: any[]) => {
          let str = `<div style="font-weight:bold;margin-bottom:4px;">${params[0]?.name || ''}</div>`;
          params.forEach((p: any) => {
            const valStr =
              p.value == null
                ? 'Not Available'
                : p.seriesName.includes('%')
                  ? `${Number(p.value).toFixed(2)}%`
                  : `${sym}${Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            str += `<div style="display:flex;align-items:center;justify-between;gap:12px;font-size:11px;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px;"></span>${p.seriesName}:</span>
              <strong style="color:#fff">${valStr}</strong>
            </div>`;
          });
          return str;
        },
      },
      legend: {
        data: [
          'Revenue',
          'Gross Profit',
          'Operating Profit',
          'EBITDA',
          'Net Profit',
          'Gross Margin %',
          'Operating Margin %',
          'Net Margin %',
        ],
        right: '2%',
        top: '0%',
        textStyle: { color: '#475569', fontSize: 10, fontWeight: 600 },
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: `Amount (${sym})`,
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (val: number) => fmtAxisLabel(val),
          },
        },
        {
          type: 'value',
          name: 'Margin %',
          splitLine: { show: false },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        },
      ],
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: revs,
          itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Gross Profit',
          type: 'bar',
          data: gps,
          itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Operating Profit',
          type: 'bar',
          data: ops,
          itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'EBITDA',
          type: 'bar',
          data: ebitdas,
          itemStyle: { color: '#8b5cf6', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Net Profit',
          type: 'bar',
          data: nps,
          itemStyle: { color: '#6366f1', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Gross Margin %',
          type: 'line',
          yAxisIndex: 1,
          data: margins,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#0d9488' },
          lineStyle: { width: 2.5, color: '#0d9488' },
        },
        {
          name: 'Operating Margin %',
          type: 'line',
          yAxisIndex: 1,
          data: operatingMargins,
          connectNulls: false,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2, color: '#f59e0b' },
        },
        {
          name: 'Net Margin %',
          type: 'line',
          yAxisIndex: 1,
          data: netMargins,
          connectNulls: false,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: '#ec4899' },
          lineStyle: { width: 2, color: '#ec4899' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, trendTimeframe]);

  const fmt = (val: number | null | undefined) => {
    if (val == null || !Number.isFinite(Number(val))) return 'Not Available';
    if (!data?.currency)
      return Number(val).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: data.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  const comparisonLabel = data?.comparisonLabel || (
    selectedPeriod === 'this_month'
      ? 'vs last month'
      : selectedPeriod === 'quarter'
        ? 'vs last quarter'
        : selectedPeriod === 'ytd'
          ? 'vs prior year to date'
          : 'vs previous 12 months'
  );

  const renderPeriodChange = (metric: string, inverse = false, percentagePoints = false) => {
    if (isLoading) {
      return <p className="mt-1 text-[10px] text-slate-400">Loading comparison…</p>;
    }
    const current = data[metric];
    const previous = comparisonData?.[metric];
    if (current == null || previous == null) {
      return <p className="mt-1 text-[10px] font-normal text-slate-400">Comparison unavailable</p>;
    }
    const currentNum = Number(current);
    const previousNum = Number(previous);
    if (!Number.isFinite(currentNum) || !Number.isFinite(previousNum)) {
      return <p className="mt-1 text-[10px] font-normal text-slate-400">Comparison unavailable</p>;
    }

    if (percentagePoints) {
      // Margin-based KPI calculations: Current Margin (%) - Previous Margin (%)
      const diffPp = currentNum - previousNum;
      if (Math.abs(diffPp) < 0.05) {
        return (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <span>0.0pp</span>
            <span className="font-normal text-slate-400">{comparisonLabel}</span>
          </p>
        );
      }
      const favorable = inverse ? diffPp < 0 : diffPp > 0;
      const Icon = diffPp > 0 ? ArrowUpRight : ArrowDownRight;
      const amount = `${Math.abs(diffPp).toFixed(1)}pp`;
      return (
        <p className={cn('mt-1 flex items-center gap-1 text-[10px] font-medium leading-none', favorable ? 'text-emerald-600' : 'text-rose-600')}>
          <Icon className="h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden="true" />
          <span>{amount}</span>
          <span className="font-normal text-slate-400">{comparisonLabel}</span>
        </p>
      );
    }

    // Amount-based KPI calculations: ((Current - Previous) / ABS(Previous)) * 100
    if (previousNum === 0) {
      return <p className="mt-1 text-[10px] font-normal text-slate-400">Comparison unavailable</p>;
    }

    const difference = currentNum - previousNum;
    if (Math.abs(difference) < 0.005) {
      return (
        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <span>0.0%</span>
          <span className="font-normal text-slate-400">{comparisonLabel}</span>
        </p>
      );
    }

    const pctChange = (difference / Math.abs(previousNum)) * 100;
    const favorable = inverse ? difference < 0 : difference > 0;
    const Icon = difference > 0 ? ArrowUpRight : ArrowDownRight;
    const amount = `${Math.abs(pctChange).toFixed(1)}%`;
    return (
      <p className={cn('mt-1 flex items-center gap-1 text-[10px] font-medium leading-none', favorable ? 'text-emerald-600' : 'text-rose-600')}>
        <Icon className="h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden="true" />
        <span>{amount}</span>
        <span className="font-normal text-slate-400">{comparisonLabel}</span>
      </p>
    );
  };

  const kpiCards = [
    { title: 'Net Revenue', metric: 'revenue', icon: Coins, iconClass: 'bg-emerald-100 text-emerald-700' },
    { title: 'Cost of Sales', metric: 'cogs', icon: FileText, iconClass: 'bg-rose-100 text-rose-700', inverse: true },
    { title: 'Gross Profit', metric: 'grossProfit', icon: TrendingUp, iconClass: 'bg-blue-100 text-blue-700' },
    { title: 'Operating Expenses', metric: 'operatingExpenses', icon: BriefcaseBusiness, iconClass: 'bg-amber-100 text-amber-700', inverse: true },
    { title: 'Gross Margin', metric: 'grossMarginPct', icon: Percent, iconClass: 'bg-purple-100 text-purple-700', percentage: true, percentagePoints: true },
    { title: 'Operating Margin', metric: 'operatingMarginPct', icon: TrendingUp, iconClass: 'bg-teal-100 text-teal-700', percentage: true, percentagePoints: true },
    { title: 'EBITDA', metric: 'ebitda', icon: Layers, iconClass: 'bg-indigo-100 text-indigo-700' },
    { title: 'EBITDA Margin', metric: 'ebitdaMarginPct', icon: Percent, iconClass: 'bg-violet-100 text-violet-700', percentage: true, percentagePoints: true },
    { title: 'Operating Profit', metric: 'operatingProfit', icon: Sliders, iconClass: 'bg-orange-100 text-orange-700' },
    { title: 'Profit Before Tax', metric: 'profitBeforeTax', icon: DollarSign, iconClass: 'bg-sky-100 text-sky-700' },
    { title: 'Net Profit', metric: 'netProfit', icon: Activity, iconClass: 'bg-green-100 text-green-700' },
    { title: 'Net Margin', metric: 'netMarginPct', icon: Percent, iconClass: 'bg-pink-100 text-pink-700', percentage: true, percentagePoints: true },
  ];

  const exportReport = async (format: 'xlsx' | 'pdf') => {
    if (!data.available) {
      toast.error('Load verified Xero profitability data before exporting.');
      return;
    }
    setExporting(format);
    try {
      const rows: Array<[string, string | number | null]> = [
        ['Organisation currency', data.currency || 'Not Available'],
        ['Reporting period', periodInfo?.label || selectedPeriod],
        ['Last data source', periodInfo?.dataSource || 'Xero PostgreSQL report cache'],
        ['Net Revenue', data.revenue],
        ['Cost of Sales', data.cogs],
        ['Gross Profit', data.grossProfit],
        ['Gross Margin (%)', data.grossMarginPct],
        ['Operating Expenses', data.operatingExpenses],
        ['Operating Profit', data.operatingProfit],
        ['EBITDA', data.ebitda],
        ['Profit Before Tax', data.profitBeforeTax],
        ['Net Profit', data.netProfit],
        ['Net Margin (%)', data.netMarginPct],
      ];
      if (format === 'xlsx') {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Profitability');
        sheet.addRows([['Metric', 'Actual'], ...rows]);
        sheet.getColumn(1).width = 28;
        sheet.getColumn(2).width = 32;
        const expenses = workbook.addWorksheet('Expense Accounts');
        expenses.addRows([
          ['Xero account', 'Account type', 'Actual'],
          ...(data.expenseAnalysis || []).map((row: any) => [
            row.account,
            row.accountType,
            row.actual,
          ]),
        ]);
        const customerActivity = workbook.addWorksheet('Customer Invoices');
        customerActivity.addRows([
          ['Customer', 'Invoice activity', 'Direct costs', 'Profitability status'],
          ...(data.customerProfitability || []).map((row: any) => [
            row.customer,
            row.revenue,
            null,
            'Not Available: attributable direct costs missing',
          ]),
        ]);
        const productRevenue = workbook.addWorksheet('Product Revenue');
        productRevenue.addRows([
          ['Product or service', 'Invoice line revenue', 'Gross profit', 'Margin'],
          ...(data.productProfitability || []).map((row: any) => [
            row.product,
            row.revenue,
            row.grossProfit,
            row.margin,
          ]),
        ]);
        const trackingRevenue = workbook.addWorksheet('Tracking Revenue');
        trackingRevenue.addRows([
          ['Tracking option', 'Invoice line revenue', 'Gross profit', 'Margin'],
          ...(data.departmentProfitability || []).map((row: any) => [
            row.department,
            row.revenue,
            row.grossProfit,
            row.margin,
          ]),
        ]);
        const trend = workbook.addWorksheet('Monthly Trend');
        trend.addRows([
          [
            'Period',
            'Revenue',
            'Gross profit',
            'Operating profit',
            'EBITDA',
            'Net profit',
            'Gross margin %',
            'Operating margin %',
            'Net margin %',
          ],
          ...(data.monthlyTrend || []).map((row: any) => [
            row.month,
            row.revenue,
            row.grossProfit,
            row.operatingProfit,
            row.ebitda,
            row.netProfit,
            row.grossMarginPct,
            row.operatingMarginPct,
            row.netMarginPct,
          ]),
        ]);
        const budget = workbook.addWorksheet('Budget vs Actual');
        budget.addRows([
          ['Category', 'Type', 'Budget', 'Actual'],
          ...(data.budgetVsActual || []).map((row: any) => [
            row.category,
            row.type,
            row.budget,
            row.actual,
          ]),
        ]);
        const output = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(
          new Blob([output], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `profitability-${selectedPeriod}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        pdf.setFontSize(16);
        pdf.text('Profitability Analysis', 14, 18);
        pdf.setFontSize(10);
        pdf.text(`Period: ${periodInfo?.label || selectedPeriod}`, 14, 27);
        pdf.text(`Source: ${periodInfo?.dataSource || 'Xero PostgreSQL report cache'}`, 14, 33);
        const exportLines = [
          ...rows
            .slice(3)
            .map(
              ([label, value]) => `${label}: ${value == null ? 'Not Available' : String(value)}`,
            ),
          'Expense Accounts',
          ...(data.expenseAnalysis || []).map(
            (row: any) => `${row.account} (${row.accountType}): ${fmt(row.actual)}`,
          ),
          'Customer Invoice Activity',
          ...(data.customerProfitability || []).map(
            (row: any) =>
              `${row.customer}: ${fmt(row.revenue)}; direct costs and margins Not Available`,
          ),
          'Product Revenue',
          ...(data.productProfitability || []).map(
            (row: any) =>
              `${row.product}: ${fmt(row.revenue)}; attributable cost and margin Not Available`,
          ),
          'Budget vs Actual',
          ...(data.budgetVsActual || []).map(
            (row: any) => `${row.category}: budget ${fmt(row.budget)}, actual ${fmt(row.actual)}`,
          ),
        ];
        let y = 44;
        for (const line of exportLines) {
          if (y > 280) {
            pdf.addPage();
            y = 18;
          }
          pdf.text(line, 14, y, { maxWidth: 180 });
          y += 7;
        }
        pdf.save(`profitability-${selectedPeriod}.pdf`);
      }
      toast.success(`${format.toUpperCase()} profitability report downloaded.`);
    } catch (error) {
      console.error('Profitability export failed:', error);
      toast.error(`Unable to export the ${format.toUpperCase()} report.`);
    } finally {
      setExporting(null);
    }
  };

  const handleAskCfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfoQuestion.trim()) return;
    if (!data.available) {
      toast.error(data.unavailableReason || 'Connect Xero and load verified financial data first.');
      return;
    }
    const q = cfoQuestion.trim();
    setCfoQuestion('');
    toast.loading('Analyzing profitability ledger data...', { id: 'ai-cfo' });
    void (async () => {
      try {
        const response = await fetch('/api/cfo/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${q}\nUse the selected profitability period ${periodInfo?.label ?? selectedPeriod}.`,
            chatId: copilotChatId,
          }),
        });
        if (!response.ok || !response.body) throw new Error('CFO AI is unavailable right now.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            const line = event.split('\n').find((part) => part.startsWith('data: '));
            if (!line) continue;
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'token') answer += payload.content || '';
            if (payload.type === 'done') setCopilotChatId(payload.chatId || null);
            if (payload.type === 'error')
              throw new Error(payload.error || 'CFO AI could not answer this question.');
          }
        }
        if (!answer.trim()) throw new Error('CFO AI returned no answer.');
        setAiAnswers((prev) => [answer, ...prev]);
        toast.success('CFO AI Analysis Generated!', { id: 'ai-cfo' });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'CFO AI could not answer this question.',
          { id: 'ai-cfo' },
        );
      }
    })();
  };

  return (
    <div className="w-full space-y-4 p-0 font-sans">
      {/* 1. Header Banner with SVG Background matching reference image */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
        {/* Official SVG Background Image */}
        <div
          className="absolute inset-0 bg-no-repeat bg-right bg-cover pointer-events-none opacity-95"
          style={{ backgroundImage: "url('/profitability-analysis-banner-bg.svg')" }}
        />

        <div className="space-y-1.5 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>CFO Intelligence</span>
            <span>&gt;</span>
            <span className="text-[#00b7e2]">Profitability Analysis</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#00b7e2]/15 border border-[#00b7e2]/30 flex items-center justify-center text-[#00b7e2]">
              <PieChart className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Profitability Analysis
            </h1>
          </div>

          <p className="text-xs lg:text-sm text-slate-500 leading-relaxed font-medium">
            Understand where your business makes — and loses — money. Analyze revenue, costs,
            margins and profitability across customers, products, and departments.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <label htmlFor="profitability-period" className="text-xs font-semibold text-slate-600">
            Period
          </label>
          <select
            id="profitability-period"
            value={selectedPeriod}
            onChange={(event) => {
              const period = event.target.value;
              setSelectedPeriod(period);
              setData({});
              void fetchProfitabilityData(period);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="ttm">Trailing 12 months</option>
            <option value="ytd">Year to date</option>
            <option value="quarter">This quarter</option>
            <option value="this_month">This month</option>
          </select>
          <button
            type="button"
            onClick={() => void exportReport('xlsx')}
            disabled={!data.available || exporting !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
          </button>
          <button
            type="button"
            onClick={() => void exportReport('pdf')}
            disabled={!data.available || exporting !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5 text-rose-700" />
            {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
        </div>

        {/* CFO AI Insights Card matching reference image */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-cyan-50/90 p-4 rounded-2xl border border-indigo-100 shadow-2xs relative z-10 max-w-md shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700">
            <Sparkles className="h-4 w-4 text-purple-600 fill-purple-600" />
            <span>CFO AI Insights</span>
          </div>
          <p className="text-xs text-slate-700 font-medium leading-normal">
            {data.available ? (
              <>
                Gross margin is{' '}
                <strong className="text-slate-900 font-semibold">
                  {data.grossMarginPct == null
                    ? 'Not Available'
                    : `${data.grossMarginPct.toFixed(2)}%`}
                </strong>{' '}
                for this period, with revenue of{' '}
                <strong className="text-slate-900 font-semibold">{fmt(data.revenue)}</strong> and net
                profit of{' '}
                <strong className="text-slate-900 font-semibold">{fmt(data.netProfit)}</strong>.
              </>
            ) : (
              data.unavailableReason || 'Connect Xero to view profitability analysis.'
            )}
          </p>
          {periodInfo?.label && (
            <p className="text-[10px] text-slate-500">
              {periodInfo.label} · {periodInfo.dataSource}
            </p>
          )}
          <div className="pt-1 flex justify-end">
            <button
              onClick={() => setCfoQuestion('Summarize profitability for the selected period.')}
              className="px-3 py-1.5 text-xs font-semibold bg-[#0070f3] hover:bg-[#0060d0] text-white rounded-xl shadow-xs transition flex items-center gap-1"
            >
              <span>View AI Analysis</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards styled to match Budget & Variance. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const value = data[card.metric];
          return (
            <article key={card.metric} className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-medium text-slate-600">{card.title}</p>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', card.iconClass)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {isLoading ? '...' : value == null ? 'Not Available' : card.percentage ? `${Number(value).toFixed(2)}%` : fmt(value)}
              </p>
              {renderPeriodChange(card.metric, card.inverse, card.percentagePoints)}
            </article>
          );
        })}
      </div>
      {/* 3. Middle Row: Charts (Waterfall & Trend) matching reference image */}
      <div className="flex w-full flex-col gap-6">
        {/* Waterfall Chart Card */}
        <section
          aria-labelledby="profitability-waterfall-title"
          className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  id="profitability-waterfall-title"
                  className="text-xs font-semibold text-slate-900"
                >
                  Profitability Waterfall
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  From revenue to net profit - live Xero ledger calculation
                </p>
              </div>
              {/* Amount / % Selector Pills */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
                <button
                  onClick={() => setWaterfallUnit('amount')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer',
                    waterfallUnit === 'amount'
                      ? 'bg-[#0070f3] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Amount
                </button>
                <button
                  onClick={() => setWaterfallUnit('pct')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer',
                    waterfallUnit === 'pct'
                      ? 'bg-[#0070f3] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  % of Revenue
                </button>
              </div>
            </div>

            <div ref={waterfallChartRef} className="h-80 w-full" />
            {!isLoading &&
              (!data.available || data.operatingProfit == null || data.profitBeforeTax == null) && (
                <p className="text-xs text-slate-500">
                  Not Available — verified Xero values required for each waterfall stage.
                </p>
              )}
          </div>
        </section>

        {/* Profitability Trend Combo Chart */}
        <section
          aria-labelledby="profitability-trend-title"
          className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3
                  id="profitability-trend-title"
                  className="text-xs font-semibold text-slate-900"
                >
                  Profitability Trend
                </h3>
                <span title="Trailing monthly financial trend">
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </span>
              </div>
              {/* Monthly / Quarterly / Yearly Selector */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
                {(['monthly', 'quarterly', 'yearly'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTrendTimeframe(tf)}
                    className={cn(
                      'px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer',
                      trendTimeframe === tf
                        ? 'bg-[#0070f3] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div ref={trendChartRef} className="h-80 w-full" />
            {!isLoading && (!data.monthlyTrend || data.monthlyTrend.length === 0) && (
              <p className="text-xs text-slate-500">
                Not Available — no complete historical Xero periods were found.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* 4. Breakeven Analysis */}
      <BreakevenAnalysis data={data} fmt={fmt} />

      <section className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Expense &amp; Cost Analysis</h3>
            <p className="text-xs text-slate-500">
              Actual Xero Profit and Loss accounts, classified by the organisation chart of
              accounts.
            </p>
          </div>
          <span className="text-xs text-slate-500">{periodInfo?.label || 'Selected period'}</span>
        </div>
        {data.expenseAnalysis?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Xero account</th>
                  <th className="pb-2">Account type</th>
                  <th className="pb-2 text-right">Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {data.expenseAnalysis.slice(0, 10).map((row: any) => (
                  <tr key={row.account}>
                    <td className="py-2.5 font-semibold text-slate-900">{row.account}</td>
                    <td className="py-2.5 text-slate-600">
                      {row.accountType === 'DIRECTCOSTS' ? 'Cost of Sales' : 'Operating Expense'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.actual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Not Available — no expense account rows with matching Xero account classifications were
            found for this period.
          </p>
        )}
      </section>

      <section className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-semibold text-slate-900">Budget vs Actual</h3>
          <p className="text-xs text-slate-500">
            Uses the existing VirtualCFO budget plan and Xero actuals for this period.
          </p>
        </div>
        {data.budgetVsActual?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Account / category</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Budget</th>
                  <th className="pb-2 text-right">Actual</th>
                  <th className="pb-2 text-right">Variance</th>
                  <th className="pb-2 text-right">Variance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {data.budgetVsActual.map((row: any) => {
                  const variance = Number(row.actual) - Number(row.budget);
                  const favourable = row.type === 'expense' ? variance <= 0 : variance >= 0;
                  return (
                    <tr key={row.category}>
                      <td className="py-2.5 font-semibold text-slate-900">{row.category}</td>
                      <td className="py-2.5 text-slate-600">{row.type}</td>
                      <td className="py-2.5 text-right">{fmt(row.budget)}</td>
                      <td className="py-2.5 text-right">{fmt(row.actual)}</td>
                      <td
                        className={cn(
                          'py-2.5 text-right font-semibold',
                          favourable ? 'text-emerald-700' : 'text-rose-700',
                        )}
                      >
                        {fmt(variance)}
                      </td>
                      <td className="py-2.5 text-right">
                        {Number(row.budget) === 0
                          ? 'Not Available'
                          : `${((variance / Number(row.budget)) * 100).toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Not Available — no non-zero saved budget values exist for this reporting period.
          </p>
        )}
      </section>

      {/* Lower analysis cards share one two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 1: Revenue by Customer */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold text-slate-900">Revenue by Customer</h3>
            <button
              onClick={() => toast.info('Customer report view')}
              className="text-xs font-semibold text-[#0070f3] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Invoice Activity</th>
                  <th className="pb-2 text-right">Direct Costs</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.customerProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{row.customer}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.revenue)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      Not Available
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-500">
                      Not Available
                    </td>
                  </tr>
                ))}
                {(!data.customerProfitability || data.customerProfitability.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      No invoice activity for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Product / Service Profitability */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Product / Service Profitability
            </h3>
            <button
              onClick={() => toast.info('Product report view')}
              className="text-xs font-semibold text-[#0070f3] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Product / Service</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Gross Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.productProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{row.product}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.revenue)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.grossProfit)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 text-right font-semibold',
                        row.margin == null
                          ? 'text-slate-500'
                          : row.margin >= 50
                            ? 'text-emerald-600'
                            : row.margin >= 30
                              ? 'text-amber-600'
                              : 'text-rose-600',
                      )}
                    >
                      {row.margin == null ? 'Not Available' : `${row.margin}%`}
                    </td>
                  </tr>
                ))}
                {(!data.productProfitability || data.productProfitability.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      Product level profitability is unavailable because attributable invoice line
                      costs are not in the stored data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Department / Tracking Profitability */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Department / Tracking Profitability
            </h3>
            <button
              onClick={() => toast.info('Department report view')}
              className="text-xs font-semibold text-[#0070f3] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Gross Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {(data.departmentProfitability || []).slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{row.department}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.revenue)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">
                      {fmt(row.grossProfit)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 text-right font-semibold',
                        row.margin == null
                          ? 'text-slate-500'
                          : row.margin >= 50
                            ? 'text-emerald-600'
                            : row.margin >= 30
                              ? 'text-amber-600'
                              : 'text-rose-600',
                      )}
                    >
                      {row.margin == null ? 'Not Available' : `${row.margin}%`}
                    </td>
                  </tr>
                ))}
                {(!data.departmentProfitability || data.departmentProfitability.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      No department profitability is available because tracking category allocations
                      are not available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      {/* Margin, opportunity, and CFO AI cards continue in the same two-column grid. */}
        {/* Widget 1: Margin Distribution Progress Bars */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-semibold text-slate-900">Margin Distribution</h3>
          {data.marginDistribution?.eligibleCount === 0 && (
            <p className="text-xs text-slate-500">
              No eligible records: customer-specific direct costs are not available from the stored
              Xero data.
            </p>
          )}

          <div className="space-y-3.5 text-xs">
            {/* High Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">High Margin (&gt;50%)</span>
                <span className="text-slate-900 font-semibold">
                  {data.marginDistribution?.highMargin?.count ?? 'Not Available'} (
                  {data.marginDistribution?.highMargin?.pct == null
                    ? 'Not Available'
                    : `${data.marginDistribution.highMargin.pct.toFixed(1)}%`}
                  )
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.marginDistribution?.highMargin?.pct ?? 0}%` }}
                />
              </div>
            </div>

            {/* Medium Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">Medium Margin (20-50%)</span>
                <span className="text-slate-900 font-semibold">
                  {data.marginDistribution?.mediumMargin?.count ?? 'Not Available'} (
                  {data.marginDistribution?.mediumMargin?.pct == null
                    ? 'Not Available'
                    : `${data.marginDistribution.mediumMargin.pct.toFixed(1)}%`}
                  )
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${data.marginDistribution?.mediumMargin?.pct ?? 0}%` }}
                />
              </div>
            </div>

            {/* Low Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">Low Margin (&lt;20%)</span>
                <span className="text-slate-900 font-semibold">
                  {data.marginDistribution?.lowMargin?.count ?? 'Not Available'} (
                  {data.marginDistribution?.lowMargin?.pct == null
                    ? 'Not Available'
                    : `${data.marginDistribution.lowMargin.pct.toFixed(1)}%`}
                  )
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.marginDistribution?.lowMargin?.pct ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Top Profitability Opportunities (AI Generated) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-semibold text-slate-900">
                Top Profitability Opportunities
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-semibold rounded-md bg-purple-100 text-purple-800">
              AI Generated
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {(data.aiOpportunities || []).map((op: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition"
              >
                <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-slate-700 font-medium leading-tight">{op}</span>
              </div>
            ))}
            {(!data.aiOpportunities || data.aiOpportunities.length === 0) && (
              <p className="text-xs text-slate-500">
                Not Available — no verified profitability insight is available for this period.
              </p>
            )}
          </div>
        </div>

        {/* Widget 3: Ask CFO AI Prompt Interface */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#0070f3]" />
              <h3 className="text-xs font-semibold text-slate-900">Ask CFO AI</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Start a conversation with your financial data
            </p>

            {/* Quick prompt pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setCfoQuestion('Why did gross margin decline last month?')}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Why did gross margin decline?
              </button>
              <button
                onClick={() => setCfoQuestion('Which customers are least profitable?')}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Which customers are least profitable?
              </button>
            </div>

            {/* Answer Display */}
            {aiAnswers.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-slate-800 space-y-1 font-medium max-h-24 overflow-y-auto">
                {aiAnswers.map((ans, aIdx) => (
                  <p key={aIdx} className="leading-snug">
                    {ans}
                  </p>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAskCfo} className="relative mt-2">
            <input
              type="text"
              placeholder="Ask anything about your profitability..."
              value={cfoQuestion}
              onChange={(e) => setCfoQuestion(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0070f3] text-slate-900 shadow-2xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 p-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060d0] text-white transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
