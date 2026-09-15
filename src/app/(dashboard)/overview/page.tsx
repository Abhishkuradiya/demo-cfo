"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import * as echarts from 'echarts';
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
  MoreVertical,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  OrganizationDetailsCard,
  ConnectedBankAccountsCard,
  InvoiceStatusSummaryCard,
  BillStatusSummaryCard
} from '@/components/dashboard/OverviewCards';
import { KpisRow, Tooltip } from '@/components/dashboard/KpisWidget';
import { OverviewMoreCardsRow } from '@/components/dashboard/OverviewMoreCards';
import { OverviewBottomCardsRow } from '@/components/dashboard/OverviewBottomCards';
import { CashFlowOverview } from '@/components/dashboard/CashFlowOverview';
import { AiInsightsWidget } from '@/components/dashboard/AiInsightsWidget';
import { FinancialAccountingOverview } from '@/components/dashboard/FinancialAccountingOverview';

function Sparkline({ dataPoints, color = "#0064eb" }: { dataPoints: number[], color?: string }) {
  if (!dataPoints || dataPoints.length < 2) {
    // Return a default beautiful gentle wave if data is not available
    return (
      <svg className="w-full h-8 opacity-45" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d="M0,22 C25,5 50,25 75,8 C90,2 95,15 100,6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;

  // Normalize points to fit SVG box 100x30 with padding
  const points = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * 100;
    const y = 24 - ((val - min) / range) * 18; // 6px padding from top/bottom
    return { x, y };
  });

  // Build cubic bezier curve string
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 3;
    const cpY1 = curr.y;
    const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
    const cpY2 = next.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  return (
    <svg className="w-full h-8 opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FormattedAmount({
  amount,
  currencyCode,
  compact = false,
  className = "text-[20px] font-extrabold text-slate-800 leading-tight tracking-tight truncate select-all"
}: {
  amount: number,
  currencyCode: string,
  compact?: boolean,
  className?: string
}) {
  const getSymbol = (code: string) => {
    if (code === 'INR') return '₹';
    if (code === 'USD') return '$';
    if (code === 'GBP') return '£';
    if (code === 'EUR') return '€';
    return code ? code + ' ' : '';
  };

  const symbol = getSymbol(currencyCode);
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let mainPart = "";
  let decimalPart = "";

  if (compact && absAmount >= 1000) {
    if (absAmount >= 1000000) {
      const val = absAmount / 1000000;
      const valStr = val.toFixed(2);
      const parts = valStr.split('.');
      mainPart = (isNegative ? '-' : '') + symbol + parts[0];
      decimalPart = '.' + parts[1] + 'M';
    } else {
      const val = absAmount / 1000;
      const valStr = val.toFixed(1);
      const parts = valStr.split('.');
      mainPart = (isNegative ? '-' : '') + symbol + parts[0];
      decimalPart = '.' + parts[1] + 'K';
    }
  } else {
    let formattedNum = "";
    if (currencyCode === 'INR') {
      formattedNum = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absAmount);
    } else if (currencyCode === 'EUR') {
      formattedNum = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absAmount);
    } else {
      formattedNum = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absAmount);
    }
    const dotIndex = formattedNum.lastIndexOf('.');
    if (dotIndex === -1) {
      mainPart = (isNegative ? '-' : '') + symbol + formattedNum;
      decimalPart = "";
    } else {
      mainPart = (isNegative ? '-' : '') + symbol + formattedNum.substring(0, dotIndex);
      decimalPart = formattedNum.substring(dotIndex);
    }
  }

  if (compact) {
    return (
      <span className={className}>
        {mainPart + decimalPart}
      </span>
    );
  }

  return (
    <span className={className}>
      <span>{mainPart}</span>
      {decimalPart && (
        <span className="text-[0.75em] font-bold text-slate-400/70 tracking-normal">{decimalPart}</span>
      )}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs h-[148px] relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between w-full shrink-0">
        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center -mt-1">
        <div className="h-7 w-28 bg-slate-200/60 rounded animate-pulse" />
        <div className="h-3.5 w-36 bg-slate-100 rounded animate-pulse mt-2" />
      </div>

      {/* Bottom Sparkline Loader */}
      <div className="absolute bottom-0 left-0 right-0 px-1 pointer-events-none opacity-20">
        <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
          <path
            d="M0,22 C25,5 50,25 75,8 C90,2 95,15 100,6"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [revenueTimeframe, setRevenueTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRevenueFlipped, setIsRevenueFlipped] = useState(false);

  // State for live Xero data calculations
  const [data, setData] = useState({
    connected: false,
    organisation: null as any,
    lastSync: null as string | null,
    invoiceStatusSummary: null as any,
    billStatusSummary: null as any,
    revenueMTD: 0,
    revenueToday: 0,
    revenueYesterday: 0,
    growthPercent: 0,
    currency: "",
    netProfit: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0,
    plRevenue: 0,
    invoiceRevenueMTD: 0,
    invoiceGrowthPercent: 0,
    netProfitGrowthPercent: 0,
    totalCash: 0,
    currentAssets: 0,
    bankAccounts: [] as any[],
    accountsReceivable: 0,
    accountsPayable: 0,
    cashGrowthPercent: 0,
    arGrowthPercent: 0,
    apGrowthPercent: 0,
    chartCash: [] as number[],
    chartAR: [] as number[],
    chartAP: [] as number[],
    overdueInvoices: [] as any[],
    chartLabels: [] as string[],
    chartRevenue: [] as number[],
    startDate: "",
    endDate: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  // Dynamic Health Score & Alerts state
  const [healthScore, setHealthScore] = useState<{
    overallScore: number;
    label: string;
    description: string;
    metrics: { name: string; score: number; color: string }[];
  } | null>(null);
  const [alertsData, setAlertsData] = useState<{
    alerts: { id: string; title: string; sub: string; time: string; color: string; icon: string }[];
    totalCount: number;
  } | null>(null);
  const [reconciliation, setReconciliation] = useState<{
    reconciliationPercentage: number;
    unreconciledTransactions: number;
    pendingTransactions: number;
    lastReconciliation: string;
  } | null>(null);

  // Computed bank overview metrics from loaded dashboard bankAccounts
  const bankOverviewData = useMemo(() => {
    const list = data.bankAccounts || [];
    const totalBalance = list.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);

    const accounts = list.map((acc: any, index: number) => {
      // First account is healthy (0 pending), second is attention (5 pending), etc.
      const pendingReconciliation = index === 0 ? 0 : (index === 1 ? 5 : (index % 2 === 0 ? 0 : 3));

      let status: 'healthy' | 'attention' | 'disconnected' = 'healthy';
      if (acc.status === 'DELETED' || acc.status === 'ARCHIVED') {
        status = 'disconnected';
      } else if (pendingReconciliation > 0) {
        status = 'attention';
      }

      return {
        id: acc.accountId || String(index),
        name: acc.accountName || acc.name,
        bank_name: acc.accountCode || 'BANK',
        balance: acc.balance || 0,
        currency: acc.currency || 'USD',
        status,
        pending_reconciliation: pendingReconciliation
      };
    });

    const healthyCount = accounts.filter(a => a.status === 'healthy').length;
    const attentionCount = accounts.filter(a => a.status === 'attention').length;
    const disconnectedCount = accounts.filter(a => a.status === 'disconnected').length;

    return {
      total_accounts: accounts.length,
      healthy_accounts: healthyCount,
      attention_accounts: attentionCount,
      disconnected_accounts: disconnectedCount,
      total_balance: totalBalance,
      last_sync: data.lastSync || '',
      accounts
    };
  }, [data.bankAccounts, data.lastSync]);

  const formatCurrency = (amount: number, currencyCode: string) => {
    if (!currencyCode) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
    }

    if (currencyCode === 'INR') {
      return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
    }
    if (currencyCode === 'USD') {
      return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
    }
    if (currencyCode === 'GBP') {
      return '£' + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(amount);
    }
    if (currencyCode === 'EUR') {
      return '€' + new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(amount);
    }
    return `${currencyCode} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getGrowthDetails = (pct: any) => {
    const val = (pct === null || pct === undefined || isNaN(pct) || typeof pct !== 'number') ? 0 : pct;
    if (val > 0) {
      return {
        text: `↑ ${val}%`,
        className: "text-[#10b981]"
      };
    }
    if (val < 0) {
      return {
        text: `↓ ${Math.abs(val)}%`,
        className: "text-[#ef4445]"
      };
    }
    return {
      text: `0%`,
      className: "text-slate-400 font-semibold"
    };
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const fromDate = searchParams.get('from_date');
      const toDate = searchParams.get('to_date');
      let url = `/api/xero/dashboard?view=${revenueTimeframe.toLowerCase()}`;
      if (fromDate && toDate) {
        url += `&from_date=${fromDate}&to_date=${toDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch dynamic health score and alerts data
  const fetchHealthAndAlerts = async () => {
    try {
      const [hsRes, alRes, recRes] = await Promise.all([
        fetch('/api/dashboard/health-score'),
        fetch('/api/dashboard/alerts'),
        fetch('/api/dashboard/reconciliation')
      ]);
      if (hsRes.ok) {
        const hsData = await hsRes.json();
        setHealthScore(hsData);
      }
      if (alRes.ok) {
        const alData = await alRes.json();
        setAlertsData(alData);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        setReconciliation(recData);
      }
    } catch (err) {
      console.error('Failed to fetch health/alerts:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchHealthAndAlerts();

    // Listen for custom sync events from Header
    const handleSyncComplete = () => {
      fetchDashboardData();
      fetchHealthAndAlerts();
    };

    window.addEventListener('xero-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('xero-sync-complete', handleSyncComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs for ECharts initialization
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const healthGaugeRef = useRef<HTMLDivElement>(null);
  const dataQualityRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const fetchChartData = async () => {
    try {
      setChartLoading(true);
      const fromDate = searchParams.get('from_date');
      const toDate = searchParams.get('to_date');
      let url = `/api/xero/dashboard?view=${revenueTimeframe.toLowerCase()}`;
      if (fromDate && toDate) {
        url += `&from_date=${fromDate}&to_date=${toDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(prev => ({
          ...prev,
          chartLabels: result.chartLabels || [],
          chartRevenue: result.chartRevenue || []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchChartData();
  }, [revenueTimeframe]);

  const getPeriodLabel = (baseTitle: string, startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return `${baseTitle} (MTD)`;
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      if (monthsDiff === 1) {
        return `${baseTitle} (MTD)`;
      }
      return `${baseTitle} (${monthsDiff} Months)`;
    } catch {
      return `${baseTitle} (Period)`;
    }
  };

  // 1. Metric Cards data
  const metricCards = useMemo(() => [
    {
      title: getPeriodLabel("Revenue", data?.startDate, data?.endDate),
      value: isLoading ? "..." : formatCurrency(data.revenueMTD, data.currency),
      amount: data.revenueMTD || 0,
      currency: data.currency,
      change: isLoading ? "..." : `${getGrowthDetails(data.growthPercent).text} vs Last Month`,
      changeClass: getGrowthDetails(data.growthPercent).className,
      tooltipText: "Accounting Revenue from Xero Profit & Loss Report (VAT Excluded, Credit Notes Excluded).",
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
      title: getPeriodLabel("Net Profit", data?.startDate, data?.endDate),
      value: isLoading ? "..." : formatCurrency(data.netProfit || 0, data.currency),
      amount: data.netProfit || 0,
      currency: data.currency,
      change: isLoading ? "..." : `${getGrowthDetails(data.netProfitGrowthPercent).text} vs Last Month`,
      changeClass: getGrowthDetails(data.netProfitGrowthPercent).className,
      tooltipText: "Net Profit from Xero Profit & Loss Report (VAT Excluded, Credit Notes Excluded).",
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
      value: isLoading ? "..." : formatCurrency(data.totalCash || 0, data.currency),
      amount: data.totalCash || 0,
      currency: data.currency,
      change: isLoading ? "..." : `${getGrowthDetails(data.cashGrowthPercent).text} vs Last Month`,
      changeClass: getGrowthDetails(data.cashGrowthPercent).className,
      tooltipText: "Total liquid cash across all connected bank accounts.",
      iconBg: "bg-[#e6fcf5] rounded-xl border border-emerald-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      onClick: () => {
        const fromDate = searchParams.get('from_date');
        const toDate = searchParams.get('to_date');
        let url = '/overview/cash-debug';
        if (fromDate && toDate) {
          url += `?from_date=${fromDate}&to_date=${toDate}`;
        }
        window.open(url, '_blank');
      }
    },
    {
      title: "Accounts Receivable (Paid)",
      value: isLoading ? "..." : formatCurrency(data.accountsReceivable || 0, data.currency),
      amount: data.accountsReceivable || 0,
      currency: data.currency,
      change: isLoading ? "..." : `${getGrowthDetails(data.arGrowthPercent).text} vs Last Month`,
      changeClass: getGrowthDetails(data.arGrowthPercent).className,
      tooltipText: "Total money collected from paid sales invoices in this period (VAT Included, Credit Notes Excluded).",
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
      title: "Accounts Payable (Paid)",
      value: isLoading ? "..." : formatCurrency(data.accountsPayable || 0, data.currency),
      amount: data.accountsPayable || 0,
      currency: data.currency,
      change: isLoading ? "..." : `${getGrowthDetails(data.apGrowthPercent).text} vs Last Month`,
      changeClass: getGrowthDetails(data.apGrowthPercent).className,
      tooltipText: "Total money paid to suppliers for bills in this period (VAT Included, Credit Notes Excluded).",
      iconBg: "bg-[#f3e8ff] rounded-xl border border-purple-100/50",
      icon: (
        <svg className="h-5.5 w-5.5 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />
          <path d="M12 7V3" />
          <circle cx="12" cy="14" r="3" />
        </svg>
      )
    }
  ], [data, isLoading, searchParams]);

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
          const displayCurrency = data.currency || "";

          let valFormatted = "";
          if (!displayCurrency) {
            valFormatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(curr.value);
          } else if (displayCurrency === 'INR') {
            valFormatted = '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(curr.value);
          } else {
            valFormatted = displayCurrency + ' ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(curr.value);
          }

          const prevVal = prev ? prev.value : 0;
          const pct = prevVal > 0 ? (((curr.value - prevVal) / prevVal) * 100).toFixed(1) : "0";
          const currentYear = data.startDate ? new Date(data.startDate).getFullYear() : 2026;
          const prevYear = currentYear - 1;
          return `
            <div style="font-family: var(--font-sans), sans-serif; min-width: 130px;">
              <div style="color: #94a3b8; font-weight: 600; margin-bottom: 4px;">${curr.axisValue} ${currentYear}</div>
              <div style="display: flex; items-center: center; gap: 6px; font-weight: bold; color: #334155;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0064eb;"></span>
                <span>Revenue</span>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px;">${valFormatted}</div>
              <div style="color: #10b981; font-weight: 600; margin-top: 2px;">${parseFloat(pct) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(pct))}% vs ${prevYear}</div>
            </div>
          `;
        }
      },
      legend: {
        data: [`Current Year (${data.startDate ? new Date(data.startDate).getFullYear() : 2026})`, `Previous Year (${data.startDate ? new Date(data.startDate).getFullYear() - 1 : 2025})`],
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
        data: data.chartLabels && data.chartLabels.length > 0
          ? data.chartLabels
          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 505, fontFamily: 'var(--font-sans), sans-serif' }
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
          formatter: (val: number) => {
            const displayCurrency = data.currency || "";
            if (!displayCurrency) return `${val}`;
            if (displayCurrency === 'INR') return `₹${val / 100000}L`;
            return `${displayCurrency} ${val}`;
          },
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 505,
          fontFamily: 'var(--font-sans), sans-serif'
        }
      },
      series: [
        {
          name: `Current Year (${data.startDate ? new Date(data.startDate).getFullYear() : 2026})`,
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
          data: data.chartRevenue && data.chartRevenue.length > 0
            ? data.chartRevenue
            : Array(12).fill(0)
        },
        {
          name: `Previous Year (${data.startDate ? new Date(data.startDate).getFullYear() - 1 : 2025})`,
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#10b981', borderWidth: 2 },
          lineStyle: { width: 2, type: 'dashed' },
          data: Array(12).fill(0)
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
  }, [revenueTimeframe, data]);

  // 3. Initialize Business Health Score Gauge (dynamic)
  useEffect(() => {
    if (!healthGaugeRef.current) return;

    // Delay init until DOM layout is fully stable (prevents 0-width canvas)
    let disposed = false;
    const timer = setTimeout(() => {
      if (disposed || !healthGaugeRef.current) return;

      const chartInstance = echarts.init(healthGaugeRef.current);

      const scoreValue = healthScore?.overallScore ?? 0;
      const gaugeColor = scoreValue >= 85 ? '#22c55e' : scoreValue >= 70 ? '#f59e0b' : scoreValue >= 55 ? '#f97316' : '#ef4444';

      const option = {
        series: [
          {
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 100,
            radius: '85%',
            center: ['50%', '85%'],
            progress: {
              show: true,
              width: 9,
              itemStyle: {
                color: gaugeColor
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
            data: [{ value: scoreValue }]
          }
        ]
      };

      chartInstance.setOption(option);

      const handleResize = () => chartInstance.resize();
      window.addEventListener('resize', handleResize);

      // ResizeObserver ensures chart resizes when container dimensions change
      const ro = new ResizeObserver(() => chartInstance.resize());
      ro.observe(healthGaugeRef.current!);

      // Store cleanup in outer scope
      cleanupFn = () => {
        window.removeEventListener('resize', handleResize);
        ro.disconnect();
        chartInstance.dispose();
      };
    }, 150);

    let cleanupFn: (() => void) | null = null;

    return () => {
      disposed = true;
      clearTimeout(timer);
      cleanupFn?.();
    };
  }, [healthScore]);

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
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))
        ) : (
          <>
            {metricCards.map((card, idx) => {
              const parts = card.change.split(' vs ');
              const percentPart = parts[0];
              const labelPart = parts[1] ? ` vs ${parts[1]}` : '';

              if (idx === 0) {
                // Flipped card for Revenue card
                return (
                  <div
                    key={idx}
                    className="select-none h-[148px] w-full transition-all duration-350 ease-out hover:translate-y-2 relative z-10 hover:z-20 cursor-pointer"
                    style={{ perspective: '1000px' }}
                    onClick={() => setIsRevenueFlipped(!isRevenueFlipped)}
                  >
                    <div
                      className="relative w-full h-full duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isRevenueFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {/* Front Side: P&L Accounting Revenue */}
                      <div
                        className="absolute inset-0 h-full w-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col"
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                      >
                        <div className="flex items-center justify-between w-full shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500 leading-none truncate flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="truncate">{card.title}</span>
                            <Tooltip text={card.tooltipText} position="top" />
                          </span>
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-3xs shrink-0", card.iconBg)}>
                            {card.icon}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center z-10 -mt-1">
                          <FormattedAmount amount={data.revenueMTD || 0} currencyCode={data.currency} compact={true} />
                          <p className="text-[11px] font-semibold mt-1 leading-none whitespace-nowrap">
                            <span className={card.changeClass}>{percentPart}</span>
                            <span className="text-slate-400">{labelPart}</span>
                          </p>
                        </div>

                        {/* Bottom Sparkline */}
                        <div className="absolute bottom-0 left-0 right-0 px-1 pointer-events-none">
                          <Sparkline dataPoints={data.chartRevenue} color="#0064eb" />
                        </div>
                      </div>

                      {/* Back Side: Invoices Operational Sales */}
                      <div
                        className="absolute inset-0 h-full w-full rounded-xl border border-slate-200/80 bg-slate-50 p-4 shadow-2xs flex flex-col"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <div className="flex items-center justify-between w-full shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500 leading-none flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="truncate">Invoice Sales (MTD)</span>
                            <Tooltip text="Operational sales revenue calculated from sent customer invoices (VAT Included)." position="top" />
                          </span>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-3xs bg-emerald-50 border border-emerald-100/50 shrink-0">
                            <svg className="h-4.5 w-4.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2-2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center z-10 -mt-1">
                          <FormattedAmount amount={data.invoiceRevenueMTD || 0} currencyCode={data.currency} compact={true} />
                          <p className="text-[11px] font-semibold mt-1 leading-none whitespace-nowrap">
                            <span className={getGrowthDetails(data.invoiceGrowthPercent).className}>
                              {getGrowthDetails(data.invoiceGrowthPercent).text}
                            </span>
                            <span className="text-slate-400"> vs Last Month</span>
                          </p>
                        </div>

                        {/* Bottom Sparkline */}
                        <div className="absolute bottom-0 left-0 right-0 px-1 pointer-events-none">
                          <Sparkline dataPoints={data.chartRevenue} color="#10b981" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs transition-all duration-350 ease-out select-none h-[148px] relative hover:translate-y-2 hover:shadow-xs z-10 hover:z-20",
                    card.onClick ? "cursor-pointer" : ""
                  )}
                  onClick={card.onClick}
                >
                  <div className="flex items-center justify-between w-full shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 leading-none flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="truncate">{card.title}</span>
                      {card.tooltipText && <Tooltip text={card.tooltipText} position="top" />}
                    </span>
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-3xs shrink-0", card.iconBg)}>
                      {card.icon}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center z-10 -mt-1">
                    <FormattedAmount amount={card.amount} currencyCode={card.currency} compact={true} />
                    <p className="text-[11px] font-semibold mt-1 leading-none whitespace-nowrap">
                      <span className={card.changeClass}>{percentPart}</span>
                      <span className="text-slate-400">{labelPart}</span>
                    </p>
                  </div>

                  {/* Bottom Sparkline */}
                  <div className="absolute bottom-0 left-0 right-0 px-1 pointer-events-none">
                    <Sparkline
                      dataPoints={
                        idx === 1 ? [] :
                          idx === 2 ? data.chartCash :
                            idx === 3 ? data.chartAR :
                              idx === 4 ? data.chartAP : []
                      }
                      color={
                        idx === 1 ? "#10b981" :
                          idx === 2 ? "#10b981" :
                            idx === 3 ? "#0064eb" :
                              idx === 4 ? "#a855f7" : "#0064eb"
                      }
                    />
                  </div>
                </div>
              );
            })}

            {/* Bank Reconciliation Card */}
            <div className="flex flex-col bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 select-none h-[148px] relative overflow-hidden">
              <div className="flex items-center justify-between w-full shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 leading-none flex items-center gap-1.5 min-w-0 pr-2">
                  <span className="truncate">Bank Reconciliation</span>
                  <span title="Reconciled bank account items comparison status.">
                    <Info className="h-3.5 w-3.5 text-slate-350 hover:text-slate-500 cursor-help" />
                  </span>
                </span>
                <div className="relative h-7.5 w-7.5 flex items-center justify-center shrink-0 ml-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100" strokeWidth="3.5" stroke="currentColor" />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className={cn(
                        (!data.connected || !reconciliation || reconciliation.pendingTransactions === 0) ? "text-emerald-500" :
                          reconciliation.pendingTransactions <= 50 ? "text-amber-500" : "text-rose-500"
                      )}
                      strokeWidth="3.5"
                      strokeDasharray={`${(data.connected ? (reconciliation?.reconciliationPercentage || 0) : 0)}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center z-10 -mt-1">
                <h4 className="text-[20px] font-extrabold text-slate-800 leading-tight tracking-tight">
                  {data.connected ? (reconciliation ? `${reconciliation.reconciliationPercentage}%` : "0%") : "0%"}
                </h4>
                <p className="text-[11px] font-semibold mt-1 leading-none whitespace-nowrap">
                  <span className={cn(
                    (!data.connected || !reconciliation || reconciliation.pendingTransactions === 0) ? "text-[#10b981]" :
                      reconciliation.pendingTransactions <= 50 ? "text-amber-500" : "text-rose-500"
                  )}>
                    {data.connected ? (reconciliation ? `${reconciliation.pendingTransactions} pending` : "0 pending") : "0 pending"}
                  </span>
                  <span className="text-slate-400"> txns to match</span>
                </p>
              </div>

              {/* Bottom Sparkline */}
              <div className="absolute bottom-0 left-0 right-0 px-1 pointer-events-none">
                <Sparkline dataPoints={[]} color="#10b981" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Middle Row: Line Chart, Health Score, Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {isLoading ? (
          <>
            {/* 1. Revenue Trend Line Chart Skeleton */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs h-[350px] flex flex-col justify-between select-none">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                <div className="h-6 w-32 bg-slate-50 rounded animate-pulse" />
              </div>
              <div className="flex-1 flex flex-col justify-end gap-3 h-52 relative">
                {/* Visual line wave skeleton representation */}
                <svg className="w-full h-full opacity-10" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M0,25 C15,10 30,22 45,5 C60,18 75,5 90,15 C95,20 100,5 100,5" fill="none" stroke="#cbd5e1" strokeWidth="2" className="animate-pulse" />
                </svg>
                <div className="flex justify-between items-center px-1 text-[10px] text-slate-200">
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* 2. Business Health Score Skeleton */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none h-[350px]">
              <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
                <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-4 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                {/* Circle gauge representation skeleton */}
                <div className="h-24 w-24 rounded-full border-[7px] border-slate-50 border-t-slate-200 animate-spin" />
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse mt-4" />
                <div className="h-2 w-32 bg-slate-100 rounded animate-pulse mt-2" />
              </div>
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-50">
                <div className="h-2.5 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-2.5 w-5/6 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>

            {/* 3. Alerts & Notifications Skeleton */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none h-[350px]">
              <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
                <div className="h-3.5 w-12 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="flex-1 space-y-3 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-50 bg-slate-50/20">
                    <div className="h-6 w-6 rounded-full bg-slate-100 shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                      <div className="h-2.5 w-1/2 bg-slate-50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : !data.connected ? (
          <>
            {/* Revenue Trend Disconnected */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[350px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-400 max-w-[240px] leading-relaxed font-sans">
                Please connect your Xero organization to view your Revenue Trend analytics.
              </p>
            </div>
            {/* Business Health Score Disconnected */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[350px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-400 max-w-[200px] leading-relaxed font-sans">
                Please connect your Xero organization to calculate your Business Health Score.
              </p>
            </div>
            {/* Alerts Disconnected */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[350px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-400 max-w-[200px] leading-relaxed font-sans">
                Please connect your Xero organization to view alerts and notifications.
              </p>
            </div>
          </>
        ) : (
          <>
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
              <div className="h-68 w-full flex-1 min-h-[270px] relative">
                <div ref={revenueChartRef} className="w-full h-full" />
                {(isLoading || chartLoading) && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg z-20 transition-all duration-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 border-[3px] border-slate-100 rounded-full animate-spin"></div>
                        <div className="absolute w-10 h-10 border-[3px] border-t-[#0064eb] rounded-full animate-spin"></div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[11.5px] font-bold text-slate-700 animate-pulse">Calculating trends...</p>
                        <p className="text-[9.5px] text-slate-400 font-medium">Processing Xero financial ledger</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Health Score Gauge */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
              <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between shrink-0">
                <h3 className="text-[13.5px] font-bold text-slate-800">Business Health Score</h3>
                <button className="text-slate-400 hover:text-slate-700 outline-none"><MoreVertical className="h-4 w-4" /></button>
              </div>

              <div className="relative flex flex-col items-center justify-center flex-1 min-h-[125px]">
                {/* Single stable gauge canvas node to prevent DOM swapping and rendering size glitches */}
                <div ref={healthGaugeRef} className={cn("w-full h-32", !healthScore && "opacity-30")} />

                {healthScore ? (
                  <div className="text-center mt-1">
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      healthScore.label === 'EXCELLENT' || healthScore.label === 'GOOD' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        healthScore.label === 'FAIR' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                          healthScore.label === 'WARNING' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                            healthScore.label === 'OFFLINE' || healthScore.label === 'DISCONNECTED' ? 'bg-slate-55 border-slate-200 text-slate-500' :
                              'bg-red-50 border-red-100 text-red-600'
                    )}>{healthScore.label}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-normal">{healthScore.description}</p>
                  </div>
                ) : (
                  <div className="text-center mt-1">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border bg-slate-50 border-slate-200 text-slate-400">Loading</span>
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5 leading-normal">Calculating health score...</p>
                  </div>
                )}
              </div>

              {/* KPI progress bars */}
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-50 shrink-0">
                {healthScore ? (
                  healthScore.metrics.map((kpi, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
                        <span>{kpi.name}</span>
                        <span className="text-slate-700 font-bold">{kpi.score}/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${kpi.score}%`, backgroundColor: kpi.color }} />
                      </div>
                    </div>
                  ))
                ) : (
                  ['Profitability', 'Liquidity', 'Efficiency', 'Solvency', 'Growth'].map((name) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
                        <span>{name}</span>
                        <span className="text-slate-300 font-bold">—</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full rounded-full bg-slate-100 animate-pulse" style={{ width: '30%' }} />
                      </div>
                    </div>
                  ))
                )}
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

              <div className="flex-1 overflow-y-auto max-h-[350px] pr-1">
                {alertsData === null ? (
                  /* Loading state - subtle shimmer bars */
                  <div className="space-y-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/30">
                        <div className="h-5.5 w-5.5 shrink-0 rounded-full bg-slate-100 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                          <div className="h-2.5 w-1/2 bg-slate-50 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : alertsData.alerts.length === 0 ? (
                  /* Empty state - No notifications */
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
                      <svg className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-bold text-slate-500">No Notifications</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">You&apos;re all caught up!</p>
                    </div>
                  </div>
                ) : (
                  /* Real alerts from API */
                  <div className="space-y-2.5">
                    {alertsData.alerts.map((alert, idx) => (
                      <div key={alert.id || idx} className="flex items-start gap-3 text-[11px] leading-normal p-2.5 rounded-lg border border-slate-100 bg-slate-50/30">
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
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Financial & Accounting Overview Row */}
      <FinancialAccountingOverview data={data} loading={isLoading} />

      {/* 2.5 New Second Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <OrganizationDetailsCard
          organisation={data.organisation}
          lastSync={data.lastSync}
          loading={isLoading}
        />
        <ConnectedBankAccountsCard
          data={bankOverviewData}
          loading={isLoading}
          onRefresh={fetchDashboardData}
          onManageConnections={() => window.location.href = '/data-sources'}
        />
        <InvoiceStatusSummaryCard
          summary={data.invoiceStatusSummary}
          loading={isLoading}
          onViewAll={() => window.location.href = '/invoices'}
        />
        <BillStatusSummaryCard
          summary={data.billStatusSummary}
          loading={isLoading}
          onViewAll={() => window.location.href = '/purchases'}
        />
      </div>

      {/* 2.7 New Third Row: 6 KPI Cards */}
      <KpisRow
        currency={data.currency}
        fromDate={searchParams.get('from_date')}
        toDate={searchParams.get('to_date')}
        loading={isLoading}
      />

      {/* 2.8 New Fourth Row: 4 Accounts/Reconciliation Summary Cards */}
      <OverviewMoreCardsRow connected={data.connected} loading={isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {isLoading ? (
          <>
            {/* 1. Top Overdue Invoices Skeleton */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs overflow-hidden select-none min-h-[290px] flex flex-col justify-between">
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-4 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="h-3 w-1/4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-1/6 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3.5 w-1/6 bg-slate-200/60 rounded animate-pulse ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bank Accounts Skeleton */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none min-h-[290px]">
              <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="h-3.5 w-1/2 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3.5 w-1/4 bg-slate-200/60 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Profit & Loss Skeleton */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none min-h-[290px]">
              <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-2 w-12 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200/60 rounded animate-pulse ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : !data.connected ? (
          <>
            {/* Top Overdue Invoices Disconnected */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[290px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-455 font-bold max-w-[240px] leading-relaxed font-sans">
                Please connect your Xero organization to view overdue invoices.
              </p>
            </div>
            {/* Bank Accounts Disconnected */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[290px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-455 font-bold max-w-[200px] leading-relaxed font-sans">
                Please connect your Xero organization to view your bank accounts.
              </p>
            </div>
            {/* Profit & Loss Disconnected */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-8 shadow-2xs flex flex-col items-center justify-center text-center select-none min-h-[290px]">
              <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 animate-pulse">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h4 className="text-[12.5px] font-bold text-slate-700 mb-1">Xero Disconnected</h4>
              <p className="text-[10.5px] text-slate-455 font-bold max-w-[200px] leading-relaxed font-sans">
                Please connect your Xero organization to view your Profit & Loss statements.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Top Overdue Invoices Table */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs overflow-hidden select-none">
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-[13.5px] font-bold text-slate-800">Top Overdue Invoices</h3>
                <Link href="/invoices/overdue" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
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
                      <th className="py-3 px-2 text-right w-24">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3 px-2"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
                          <td className="py-3 px-2"><div className="h-3 w-12 bg-slate-100 rounded" /></td>
                          <td className="py-3 px-2"><div className="h-3 w-16 bg-slate-100 rounded" /></td>
                          <td className="py-3 px-2 text-right"><div className="h-3 w-16 bg-slate-100 rounded ml-auto" /></td>
                          <td className="py-3 px-2 text-right"><div className="h-3 w-12 bg-slate-100 rounded ml-auto" /></td>
                        </tr>
                      ))
                    ) : (!data.overdueInvoices || data.overdueInvoices.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="py-12">
                          <div className="flex flex-col items-center justify-center text-center px-4">
                            <div className="h-11 w-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100 shadow-2xs">
                              <FileCheck className="h-5 w-5 stroke-[1.5]" />
                            </div>
                            <h4 className="text-[12px] font-bold text-slate-700 mb-0.5 font-sans">All Caught Up!</h4>
                            <p className="text-[10.5px] text-slate-400 max-w-[240px] font-sans">No overdue invoices found at the moment.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.overdueInvoices.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-2 font-bold text-slate-700 truncate max-w-[150px]">{row.name}</td>
                          <td className="py-3 px-2 text-slate-400 font-semibold">{row.id}</td>
                          <td className="py-3 px-2 text-slate-400 font-semibold">{formatDateString(row.due)}</td>
                          <td className="py-3 px-2 text-right font-bold text-slate-800">
                            <FormattedAmount amount={row.amount} currencyCode={data.currency} className="font-bold text-[11px]" />
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-[#ef4444]">{row.days} days</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Accounts feeds list */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between select-none">
              <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                <h3 className="text-[13.5px] font-bold text-slate-800">Bank Accounts</h3>
                <Link href="/banking/accounts" className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5">
                  <span>View All</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex-1 space-y-0 divide-y divide-slate-100">
                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 animate-pulse animate-duration-1000">
                        <div className="flex items-center gap-3">
                          <div className="h-5.5 w-5.5 rounded-md bg-slate-100 shrink-0" />
                          <div className="flex flex-col gap-1">
                            <div className="h-3 w-24 bg-slate-100 rounded" />
                            <div className="h-2 w-10 bg-slate-100 rounded" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-16 bg-slate-100 rounded" />
                          <div className="h-4 w-10 bg-slate-100 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (!data.bankAccounts || data.bankAccounts.length === 0) ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 flex-1">
                    <div className="h-11 w-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100 shadow-2xs">
                      <Landmark className="h-5 w-5 stroke-[1.5]" />
                    </div>
                    <h4 className="text-[12px] font-bold text-slate-700 mb-0.5 font-sans">No Bank Accounts</h4>
                    <p className="text-[10.5px] text-slate-400 max-w-[200px] font-sans">No connected bank accounts found.</p>
                  </div>
                ) : (
                  data.bankAccounts.map((bank: any, idx: number) => {
                    const isNegative = bank.balance !== null && bank.balance < 0;
                    const nameLower = bank.accountName.toLowerCase();
                    let logo = (
                      <div className="h-5.5 w-5.5 rounded shrink-0 border border-slate-200/50 bg-slate-50 text-[9.5px] font-bold text-slate-500 flex items-center justify-center">
                        BS
                      </div>
                    );

                    if (nameLower.includes('hdfc')) {
                      logo = (
                        <svg className="h-5.5 w-5.5 rounded shrink-0 border border-blue-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#004c8f" />
                          <rect x="5" y="5" width="14" height="14" fill="#ffffff" />
                          <rect x="8.5" y="8.5" width="7" height="7" fill="#004c8f" />
                          <rect x="11" y="5" width="2" height="14" fill="#004c8f" />
                          <rect x="5" y="11" width="14" height="2" fill="#004c8f" />
                        </svg>
                      );
                    } else if (nameLower.includes('icici')) {
                      logo = (
                        <svg className="h-5.5 w-5.5 rounded shrink-0 border border-orange-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#f26e21" />
                          <circle cx="12" cy="12" r="7" fill="#ffffff" />
                          <path d="M12 9v6M10 9h4M10 15h4" stroke="#f26e21" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      );
                    } else if (nameLower.includes('state bank') || nameLower.includes('sbi')) {
                      logo = (
                        <svg className="h-5.5 w-5.5 rounded shrink-0 border border-cyan-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#00a8e8" />
                          <circle cx="12" cy="11" r="5" stroke="#ffffff" strokeWidth="2" fill="none" />
                          <line x1="12" y1="13.5" x2="12" y2="19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                      );
                    } else if (nameLower.includes('axis')) {
                      logo = (
                        <svg className="h-5.5 w-5.5 rounded shrink-0 border border-rose-900/20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#841a41" />
                          <path d="M12 5l6 14H6l6-14z" fill="#ffffff" />
                          <path d="M12 9l3.5 8h-7L12 9z" fill="#841a41" />
                          <line x1="10" y1="14" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.2" />
                        </svg>
                      );
                    } else if (nameLower.includes('kotak')) {
                      logo = (
                        <svg className="h-5.5 w-5.5 rounded shrink-0 border border-red-200/40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="#d81d24" />
                          <circle cx="12" cy="12" r="7" stroke="#ffffff" strokeWidth="1.8" fill="none" />
                          <path d="M9.5 9v6M13.5 9l-2.5 3 2.5 3M11 12h2" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      );
                    }

                    return (
                      <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          {logo}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-slate-700 text-[11px] truncate block" title={bank.accountName}>{bank.accountName}</span>
                            <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">CODE: {bank.accountCode || 'BANK'}</span>
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                          <span className={cn(
                            "font-bold text-[11px] select-all shrink-0 whitespace-nowrap",
                            isNegative ? "text-red-500" : "text-slate-800"
                          )}>
                            {bank.balance !== null ? (
                              <FormattedAmount
                                amount={bank.balance}
                                currencyCode={bank.currency}
                                className="font-bold text-[11px]"
                              />
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
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
                  {
                    label: 'Revenue',
                    amount: data.plRevenue || 0,
                    percent: (data.plRevenue && data.plRevenue > 0) ? 100 : 0,
                    color: 'bg-emerald-500',
                    showBar: true
                  },
                  {
                    label: 'Cost of Goods Sold',
                    amount: data.cogs || 0,
                    percent: (data.plRevenue && data.plRevenue > 0) ? Math.min(100, Math.max(0, ((data.cogs || 0) / data.plRevenue * 100))) : 0,
                    color: 'bg-red-500',
                    showBar: true
                  },
                  {
                    label: 'Gross Profit',
                    amount: data.grossProfit || 0,
                    percent: (data.plRevenue && data.plRevenue > 0) ? Math.min(100, Math.max(0, ((data.grossProfit || 0) / data.plRevenue * 100))) : 0,
                    showBar: false,
                    isLabelBold: true,
                    hasDividerAbove: true
                  },
                  {
                    label: 'Operating Expenses',
                    amount: data.expenses || 0,
                    percent: (data.plRevenue && data.plRevenue > 0) ? Math.min(100, Math.max(0, ((data.expenses || 0) / data.plRevenue * 100))) : 0,
                    color: 'bg-red-500',
                    showBar: true
                  },
                  {
                    label: 'Net Profit',
                    amount: data.netProfit || 0,
                    percent: (data.plRevenue && data.plRevenue > 0) ? Math.min(100, Math.max(0, ((data.netProfit || 0) / data.plRevenue * 100))) : 0,
                    color: 'bg-emerald-500',
                    showBar: true,
                    isLabelBold: true,
                    hasDividerAbove: true
                  },
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
                        {row.label === 'Gross Profit' && (
                          <span className="text-[9px] text-slate-455 font-bold leading-none mt-0.5">
                            {data.plRevenue && data.plRevenue > 0 ? (((data.grossProfit || 0) / data.plRevenue) * 100).toFixed(1) + '%' : '0.0%'}
                          </span>
                        )}
                        {row.label === 'Net Profit' && (
                          <span className="text-[9px] text-slate-455 font-bold leading-none mt-0.5">
                            {data.plRevenue && data.plRevenue > 0 ? (((data.netProfit || 0) / data.plRevenue) * 100).toFixed(1) + '%' : '0.0%'}
                          </span>
                        )}
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
                        <FormattedAmount
                          amount={row.amount}
                          currencyCode={data.currency}
                          className="font-bold text-[11.5px] select-all"
                        />
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Bottom New Row: Recent Activity, Pending Approvals, Top Customers, Top Vendors */}
      <OverviewBottomCardsRow currency={data.currency} connected={data.connected} loading={isLoading} />

      {/* 5. Cash Flow Overview full-width row */}
      <div className="mt-5">
        <CashFlowOverview currency={data.currency} />
      </div>

      {/* 6. AI Insights & Recommendations */}
      <div className="mt-5">
        <AiInsightsWidget connected={data.connected} loading={isLoading} />
      </div>

      {/* 7. Bottom-Most Grid: Data Quality, Sync Status, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
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
