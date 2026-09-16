"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  Tag,
  Sparkles,
  Info,
  X,
  Zap,
  Lock,
  Layers,
  Check,
  AlertCircle,
  Copy,
  Landmark,
  BookOpen,
  Calculator,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Activity,
  PieChart,
  TrendingUp,
  Lightbulb,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ExceptionItem {
  id: string;
  ruleCode: string;
  ruleName: string;
  category: string;
  severity: 'CRITICAL' | 'REVIEW_REQUIRED' | 'DATA_QUALITY' | 'MONITORING';
  confidenceScore: number;
  contactName: string;
  reference: string;
  amount: number;
  date: string | null;
  whyFlagged: string;
  matchingDetails: string[];
  isCustomRule: boolean;
  itemType: 'INVOICE' | 'BILL' | 'BANK_TRANSACTION' | 'PAYMENT' | 'CREDIT_NOTE';
}

export interface BookkeepingRule {
  id?: number;
  ruleCode: string;
  name: string;
  category: string;
  severity: 'CRITICAL' | 'REVIEW_REQUIRED' | 'DATA_QUALITY' | 'MONITORING';
  isEnabled: boolean;
  conditionType: string;
  configJson?: any;
  rationaleTemplate?: string;
  isCustom?: boolean;
}

export default function BookkeepingHealthPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [rules, setRules] = useState<BookkeepingRule[]>([]);
  
  // UI Filters & Drawer States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ExceptionItem | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Rule Configuration Drawer State
  const [showRuleDrawer, setShowRuleDrawer] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'library' | 'create'>('library');
  const [savingRule, setSavingRule] = useState<boolean>(false);

  // Custom Rule Builder Form State
  const [customRuleName, setCustomRuleName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('CUSTOM_POLICY');
  const [customSeverity, setCustomSeverity] = useState<'CRITICAL' | 'REVIEW_REQUIRED' | 'DATA_QUALITY' | 'MONITORING'>('REVIEW_REQUIRED');
  const [customConditionType, setCustomConditionType] = useState<string>('AMOUNT_THRESHOLD');
  const [customThresholdAmount, setCustomThresholdAmount] = useState<number>(5000);
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [customContactName, setCustomContactName] = useState<string>('');
  const [customRationale, setCustomRationale] = useState<string>('');

  // Fetch Audit Data & Rules
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/bookkeeping-health');
      if (!res.ok) throw new Error('Failed to fetch Bookkeeping Audit Health data');
      const json = await res.json();
      setData(json);
      setExceptions(json.exceptions || []);
      setRules(json.rules || []);
      
      // Auto-select first exception for detail panel if available
      if (json.exceptions && json.exceptions.length > 0 && !selectedItemForDetail) {
        setSelectedItemForDetail(json.exceptions[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading bookkeeping audit health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // Filtered Exceptions List
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (dismissedIds.has(e.id)) return false;

      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        (e.contactName || '').toLowerCase().includes(searchLower) ||
        (e.reference || '').toLowerCase().includes(searchLower) ||
        (e.ruleName || '').toLowerCase().includes(searchLower) ||
        (e.whyFlagged || '').toLowerCase().includes(searchLower);

      let matchesCat = true;
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'DUPLICATE') matchesCat = e.category === 'DUPLICATE';
        else if (selectedCategory === 'RECONCILIATION') matchesCat = e.category === 'RECONCILIATION';
        else if (selectedCategory === 'PAYMENT_MISMATCH') matchesCat = e.category === 'PAYMENT_MISMATCH';
        else if (selectedCategory === 'INCOMPLETE_DATA') matchesCat = e.category === 'INCOMPLETE_DATA';
        else if (selectedCategory === 'CLASSIFICATION_ANOMALY') matchesCat = e.category === 'CLASSIFICATION_ANOMALY';
        else if (selectedCategory === 'TAX_ANOMALY') matchesCat = e.category === 'TAX_ANOMALY';
        else if (selectedCategory === 'PERIOD_CHECK') matchesCat = e.category === 'PERIOD_CHECK';
        else if (selectedCategory === 'CREDIT_NOTE') matchesCat = e.category === 'CREDIT_NOTE';
        else if (selectedCategory === 'CUSTOM_POLICY') matchesCat = e.isCustomRule || e.category === 'CUSTOM_POLICY';
      }

      let matchesSev = true;
      if (selectedSeverity !== 'ALL') {
        matchesSev = e.severity === selectedSeverity;
      }

      return matchesSearch && matchesCat && matchesSev;
    });
  }, [exceptions, searchTerm, selectedCategory, selectedSeverity, dismissedIds]);

  // Toggle Rule ON/OFF status
  const handleToggleRule = async (ruleCode: string, currentStatus: boolean) => {
    try {
      const target = rules.find(r => r.ruleCode === ruleCode);
      if (!target) return;

      const updatedStatus = !currentStatus;
      const res = await fetch('/api/dashboard/bookkeeping-health/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...target,
          isEnabled: updatedStatus
        })
      });

      if (!res.ok) throw new Error('Failed to update rule configuration');
      toast.success(`Rule "${target.name}" ${updatedStatus ? 'Enabled' : 'Disabled'}`);
      
      setRules(prev => prev.map(r => r.ruleCode === ruleCode ? { ...r, isEnabled: updatedStatus } : r));
      fetchAuditData();
    } catch (err: any) {
      toast.error(err.message || 'Error updating rule');
    }
  };

  // Save Custom Rule
  const handleSaveCustomRule = async () => {
    if (!customRuleName.trim()) {
      toast.error('Please specify a Rule Name');
      return;
    }

    setSavingRule(true);
    try {
      const configJson: any = {};
      if (customConditionType === 'AMOUNT_THRESHOLD') {
        configJson.minAmount = customThresholdAmount;
      } else if (customConditionType === 'KEYWORD_MISMATCH') {
        configJson.keyword = customKeyword;
      } else if (customConditionType === 'CONTACT_MATCH') {
        configJson.contactName = customContactName;
      }

      const ruleCode = `CUSTOM_${customCategory}_${Date.now()}`;
      const payload = {
        ruleCode,
        name: customRuleName,
        category: customCategory,
        severity: customSeverity,
        isEnabled: true,
        conditionType: customConditionType,
        configJson,
        rationaleTemplate: customRationale || `Custom Rule Triggered: ${customRuleName}`,
        isCustom: true
      };

      const res = await fetch('/api/dashboard/bookkeeping-health/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create custom audit rule');

      toast.success(`Custom Audit Rule "${customRuleName}" activated!`);
      setCustomRuleName('');
      setCustomKeyword('');
      setCustomContactName('');
      setCustomRationale('');
      setDrawerTab('library');
      fetchAuditData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating custom rule');
    } finally {
      setSavingRule(false);
    }
  };

  // Reset Rules to Defaults
  const handleResetDefaults = async () => {
    if (!confirm('Reset all bookkeeping rules to CFO system defaults? Custom rules will be removed.')) return;
    try {
      const res = await fetch('/api/dashboard/bookkeeping-health/rules?reset=true', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset rules');
      const json = await res.json();
      toast.success('Bookkeeping rules reset to CFO defaults');
      setRules(json.rules || []);
      fetchAuditData();
    } catch (err: any) {
      toast.error(err.message || 'Error resetting rules');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredExceptions || filteredExceptions.length === 0) {
      toast.error('No exception items to export');
      return;
    }

    const headers = [
      'Severity',
      'Category',
      'Rule Name',
      'Contact Name',
      'Reference / Invoice #',
      'Amount (£)',
      'Date',
      'Confidence Score (%)',
      'Why Flagged Rationale'
    ];

    const rows = filteredExceptions.map(e => [
      e.severity,
      e.category,
      `"${e.ruleName}"`,
      `"${e.contactName}"`,
      `"${e.reference}"`,
      e.amount.toFixed(2),
      `"${e.date || 'N/A'}"`,
      `${e.confidenceScore}%`,
      `"${e.whyFlagged.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CFO_Bookkeeping_Health_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit Report exported as CSV');
  };

  const handleDismissException = (id: string, eName: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail(null);
    }
    toast.success(`Exception "${eName}" marked as resolved`);
  };

  const healthScore = data?.healthScore !== undefined ? data.healthScore : 92;

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      
      {/* ─── BREADCRUMB & PAGE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
            <span>Bookkeeping</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-700 font-bold">Health & Errors</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Bookkeeping Health
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Data integrity, reconciliation and accounting exceptions from your Xero account.
          </p>
        </div>

        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none cursor-pointer">
            <option>This Month</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
          </select>

          <span className="text-[11px] font-semibold text-slate-400 hidden lg:inline">
            {data?.lastSyncedFormatted || 'Last synced just now'}
          </span>

          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Sync with Xero</span>
          </button>

          <button
            onClick={() => setShowRuleDrawer(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Configure Rules</span>
          </button>
        </div>
      </div>

      {/* ─── TOP SUMMARY KPI ROW (6 COMPACT CARDS GRID) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: Books Health Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Health Score</span>
            <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              Good
            </span>
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-500" strokeDasharray={`${healthScore}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute text-sm font-black text-slate-900">{healthScore}</span>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">{healthScore}/100</div>
              <div className="text-[10px] font-medium text-slate-500 leading-tight">
                {exceptions.length} exceptions flagged
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Critical Issues */}
        <div
          onClick={() => setSelectedSeverity('CRITICAL')}
          className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer hover:bg-rose-100/60 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <button className="text-[10.5px] font-bold text-rose-700 group-hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-950">{data?.summary?.criticalCount || 0}</div>
            <div className="text-[11px] font-bold text-rose-800">Critical Issues</div>
          </div>
        </div>

        {/* Card 3: Warnings */}
        <div
          onClick={() => setSelectedSeverity('REVIEW_REQUIRED')}
          className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer hover:bg-amber-100/60 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <button className="text-[10.5px] font-bold text-amber-700 group-hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-950">{data?.summary?.reviewCount || 0}</div>
            <div className="text-[11px] font-bold text-amber-800">Warnings</div>
          </div>
        </div>

        {/* Card 4: Potential Duplicates */}
        <div
          onClick={() => setSelectedCategory('DUPLICATE')}
          className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer hover:bg-blue-100/60 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <Copy className="h-3.5 w-3.5" />
            </div>
            <button className="text-[10.5px] font-bold text-blue-700 group-hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-blue-950">{data?.bucketCounts?.DUPLICATE || 0}</div>
            <div className="text-[11px] font-bold text-blue-800">Duplicates</div>
          </div>
        </div>

        {/* Card 5: Unreconciled */}
        <div
          onClick={() => setSelectedCategory('RECONCILIATION')}
          className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer hover:bg-purple-100/60 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
              <Landmark className="h-3.5 w-3.5" />
            </div>
            <button className="text-[10.5px] font-bold text-purple-700 group-hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-purple-950">{data?.bucketCounts?.RECONCILIATION || 0}</div>
            <div className="text-[11px] font-bold text-purple-800">Unreconciled</div>
          </div>
        </div>

        {/* Card 6: Missing Info */}
        <div
          onClick={() => setSelectedCategory('INCOMPLETE_DATA')}
          className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer hover:bg-emerald-100/60 transition group"
        >
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSearch className="h-3.5 w-3.5" />
            </div>
            <button className="text-[10.5px] font-bold text-emerald-700 group-hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-950">{data?.bucketCounts?.INCOMPLETE_DATA || 0}</div>
            <div className="text-[11px] font-bold text-emerald-800">Missing Info</div>
          </div>
        </div>

      </div>

      {/* ─── MIDDLE SECTION: TREND CHART & RISK OVERVIEW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Issues Trend Line Chart Box */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Issues Trend</h3>
              <p className="text-xs text-slate-400 font-medium">Number of bookkeeping issues detected over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Warnings
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Total Issues
              </span>
            </div>
          </div>

          {/* SVG Trend Line Visual */}
          <div className="h-44 w-full pt-2">
            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />

              {/* Gradient Area under Total Curve */}
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,80 Q 80,40 160,70 T 320,45 T 500,60 L 500,120 L 0,120 Z"
                fill="url(#blueGrad)"
              />
              {/* Lines */}
              <path d="M 0,80 Q 80,40 160,70 T 320,45 T 500,60" fill="none" stroke="#2563eb" strokeWidth="2.5" />
              <path d="M 0,95 Q 80,75 160,85 T 320,70 T 500,80" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 0,110 Q 80,100 160,105 T 320,95 T 500,105" fill="none" stroke="#ef4444" strokeWidth="2" />
            </svg>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1 px-1">
              <span>1 Sep</span>
              <span>5 Sep</span>
              <span>10 Sep</span>
              <span>15 Sep</span>
              <span>20 Sep</span>
              <span>25 Sep</span>
              <span>30 Sep</span>
            </div>
          </div>
        </div>

        {/* Accounting Risk Overview Progress Bars */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Accounting Risk Overview</h3>
            <p className="text-xs text-slate-400 font-medium">Risk distribution across audit buckets</p>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Duplicate Risk', pct: data?.riskOverview?.duplicateRiskPct ?? 0, color: 'bg-rose-500' },
              { label: 'Reconciliation Risk', pct: data?.riskOverview?.reconciliationRiskPct ?? 0, color: 'bg-amber-500' },
              { label: 'Classification Risk', pct: data?.riskOverview?.classificationRiskPct ?? 0, color: 'bg-yellow-500' },
              { label: 'Tax Risk', pct: data?.riskOverview?.taxRiskPct ?? 0, color: 'bg-emerald-500' },
              { label: 'Data Completeness', pct: data?.riskOverview?.dataCompletenessRiskPct ?? 0, color: 'bg-blue-500' }
            ].map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", r.color)} />
                    {r.label}
                  </span>
                  <span>{r.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", r.color)} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── MAIN AUDIT TABLE & RIGHT SIDE DETAIL PANEL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Issues Table with Filters */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            
            {/* Table Header Controls & Filter Pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Issues Requiring Attention</h3>
                <p className="text-xs text-slate-500 font-medium">Review and resolve bookkeeping exceptions to maintain accurate records</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Filter Pills Bar (No Emojis, Sleek SVG Icons) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'ALL', label: 'All', icon: Layers, count: exceptions.length },
                { key: 'DUPLICATE', label: 'Duplicates', icon: Copy, count: data?.bucketCounts?.DUPLICATE || 0 },
                { key: 'RECONCILIATION', label: 'Reconciliation', icon: Landmark, count: data?.bucketCounts?.RECONCILIATION || 0 },
                { key: 'PAYMENT_MISMATCH', label: 'Payments', icon: DollarSign, count: data?.bucketCounts?.PAYMENT_MISMATCH || 0 },
                { key: 'INCOMPLETE_DATA', label: 'Missing Info', icon: FileSearch, count: data?.bucketCounts?.INCOMPLETE_DATA || 0 },
                { key: 'CLASSIFICATION_ANOMALY', label: 'Classification', icon: BookOpen, count: data?.bucketCounts?.CLASSIFICATION_ANOMALY || 0 },
                { key: 'TAX_ANOMALY', label: 'Tax', icon: Calculator, count: data?.bucketCounts?.TAX_ANOMALY || 0 }
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategory(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap select-none",
                      selectedCategory === tab.key
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    )}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                      selectedCategory === tab.key ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by contact, invoice # or rule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Table Component */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Issue</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Party / Contact</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredExceptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                        No issues matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredExceptions.map((item, idx) => {
                      const isSelected = selectedItemForDetail?.id === item.id;
                      const sevBadge = item.severity === 'CRITICAL' ? { label: 'Critical', bg: 'bg-rose-100 text-rose-800 border-rose-200' } :
                                       item.severity === 'REVIEW_REQUIRED' ? { label: 'Warning', bg: 'bg-amber-100 text-amber-800 border-amber-200' } :
                                       { label: 'Info', bg: 'bg-blue-100 text-blue-800 border-blue-200' };

                      return (
                        <tr
                          key={`row-${item.id || item.ruleCode}-${idx}`}
                          onClick={() => setSelectedItemForDetail(item)}
                          className={cn(
                            "transition cursor-pointer",
                            isSelected ? "bg-blue-50/80 font-semibold" : (idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/40 hover:bg-slate-50")
                          )}
                        >
                          <td className="py-2.5 px-3">
                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border uppercase", sevBadge.bg)}>
                              {sevBadge.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]">
                            {item.ruleName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-semibold text-[11px]">
                            {item.category.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[140px]">
                            {item.contactName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            £{item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemForDetail(item);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 transition shadow-2xs"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Right 1 Col: Side Detail Panel ("Issue Detail") */}
        <div className="lg:col-span-1">
          {selectedItemForDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 sticky top-6">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.2 rounded border uppercase",
                      selectedItemForDetail.severity === 'CRITICAL' ? "bg-rose-100 text-rose-800 border-rose-300" :
                      selectedItemForDetail.severity === 'REVIEW_REQUIRED' ? "bg-amber-100 text-amber-800 border-amber-300" :
                      "bg-blue-100 text-blue-800 border-blue-300"
                    )}>
                      {selectedItemForDetail.severity.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Confidence: <strong className="text-slate-900">{selectedItemForDetail.confidenceScore}%</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedItemForDetail.ruleName}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedItemForDetail(null)}
                  className="text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Side-by-side or Transaction Context Cards */}
              <div className="space-y-2.5">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 text-xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Transaction A</div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{selectedItemForDetail.contactName}</span>
                    <span className="font-mono">£{selectedItemForDetail.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Ref: {selectedItemForDetail.reference}</span>
                    <span>{selectedItemForDetail.date ? new Date(selectedItemForDetail.date).toLocaleDateString('en-GB') : 'N/A'}</span>
                  </div>
                  <button className="text-[10.5px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 pt-1">
                    View in Xero <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* "Why Flagged?" Checklist */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Why flagged?
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {selectedItemForDetail.matchingDetails && selectedItemForDetail.matchingDetails.length > 0 ? (
                    selectedItemForDetail.matchingDetails.map((detail, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-2 text-[11.5px] font-medium text-slate-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-600 font-medium leading-relaxed bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                      {selectedItemForDetail.whyFlagged}
                    </div>
                  )}
                </div>
              </div>

              {/* Potential Duplicate / Risk Amount */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Potential Duplicate Amount:</span>
                <span className="text-base font-black text-rose-600">
                  £{selectedItemForDetail.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDismissException(selectedItemForDetail.id, selectedItemForDetail.ruleName)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark as Resolved</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDismissException(selectedItemForDetail.id, selectedItemForDetail.ruleName)}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Keep Both
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissException(selectedItemForDetail.id, selectedItemForDetail.ruleName)}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Ignore
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-2xs">
              <FileSearch className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">Select an Issue to Inspect</h4>
              <p className="text-[11px] text-slate-400 font-medium">Click any row in the audit table to view detailed breakdown & Xero comparison.</p>
            </div>
          )}
        </div>

      </div>

      {/* ─── BOTTOM ANALYTICS & RECOMMENDATIONS SECTION (3 CARDS GRID) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Data Quality Checks */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              Data Quality Checks
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {data?.dataQualityMetrics?.overallPct ?? 100}%
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { label: 'Valid transaction dates', pct: `${data?.dataQualityMetrics?.validDatesPct ?? 100}%` },
              { label: 'Transactions with description', pct: `${data?.dataQualityMetrics?.withDescPct ?? 100}%` },
              { label: 'Transactions with contact', pct: `${data?.dataQualityMetrics?.withContactPct ?? 100}%` },
              { label: 'Transactions with account category', pct: `${data?.dataQualityMetrics?.withAccountCategoryPct ?? 100}%` },
              { label: 'Transactions with tax code', pct: `${data?.dataQualityMetrics?.withTaxCodePct ?? 100}%` },
              { label: 'No orphaned records', pct: `${data?.dataQualityMetrics?.noOrphanedPct ?? 100}%` }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {item.label}
                </span>
                <span className="font-bold text-slate-900">{item.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: AI Suggestions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Suggestions
            </h3>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 border border-amber-400/40 uppercase">
              BETA
            </span>
          </div>

          <div className="space-y-2.5">
            {(data?.aiSuggestions && data.aiSuggestions.length > 0 ? data.aiSuggestions : [
              { title: 'Books are 100% healthy & synchronized', sub: 'No active bookkeeping exceptions detected' }
            ]).map((sug: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between group">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate">{sug.title}</div>
                  <div className="text-[10.5px] text-slate-500 font-medium truncate">{sug.sub}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Keep Your Books Healthy */}
        <div className="bg-gradient-to-b from-purple-50/60 to-white rounded-2xl border border-purple-200/80 p-5 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Keep Your Books Healthy
            </h3>

            <div className="space-y-2 text-xs font-semibold text-purple-900">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Review issues regularly</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Reconcile bank accounts weekly</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Ensure proper categorization</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Maintain contact information</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Check for duplicates</span>
              </div>
            </div>
          </div>

          <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2">
            <span>Learn Bookkeeping Best Practices</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* ─── RULE CONFIGURATION & CUSTOM POLICY DRAWER ─── */}
      {showRuleDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-250">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rule Engine & Policy Manager</h3>
                  <p className="text-xs text-slate-300 font-medium">Configure built-in CFO rules & add custom audit policies</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </button>
                
                <button
                  onClick={() => setShowRuleDrawer(false)}
                  className="h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDrawerTab('library')}
                  className={cn(
                    "py-3 text-xs font-bold border-b-2 transition cursor-pointer",
                    drawerTab === 'library'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  Rule Library ({rules.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('create')}
                  className={cn(
                    "py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer",
                    drawerTab === 'create'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Custom Rule</span>
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {drawerTab === 'library' ? (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.ruleCode}
                      className={cn(
                        "p-3.5 rounded-xl border transition flex items-center justify-between gap-3",
                        rule.isEnabled ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[9.5px] font-black px-2 py-0.2 rounded border uppercase",
                            rule.severity === 'CRITICAL' ? "bg-rose-100 text-rose-800 border-rose-300" :
                            rule.severity === 'REVIEW_REQUIRED' ? "bg-amber-100 text-amber-800 border-amber-300" :
                            rule.severity === 'DATA_QUALITY' ? "bg-blue-100 text-blue-800 border-blue-300" :
                            "bg-indigo-100 text-indigo-800 border-indigo-300"
                          )}>
                            {rule.severity.replace(/_/g, ' ')}
                          </span>

                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {rule.category}
                          </span>

                          {rule.isCustom && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {rule.name}
                        </h4>

                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                          {rule.rationaleTemplate || 'Standard CFO bookkeeping audit rule'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.ruleCode, rule.isEnabled)}
                          className={cn(
                            "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                            rule.isEnabled ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                          )}
                        >
                          <span className="bg-white w-4 h-4 rounded-full shadow-md transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      1. Rule Name & Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Flag Vendor Bills > £5,000 without PO number"
                      value={customRuleName}
                      onChange={(e) => setCustomRuleName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        2. Category Bucket
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="CUSTOM_POLICY">User Custom Policy</option>
                        <option value="DUPLICATE">Duplicates</option>
                        <option value="RECONCILIATION">Reconciliation</option>
                        <option value="PAYMENT_MISMATCH">Payment Mismatch</option>
                        <option value="INCOMPLETE_DATA">Incomplete Data</option>
                        <option value="CLASSIFICATION_ANOMALY">Classification Anomaly</option>
                        <option value="TAX_ANOMALY">Tax / VAT Anomaly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        3. Assigned Severity
                      </label>
                      <select
                        value={customSeverity}
                        onChange={(e) => setCustomSeverity(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="CRITICAL">Critical Issue</option>
                        <option value="REVIEW_REQUIRED">Review Required</option>
                        <option value="DATA_QUALITY">Data Quality</option>
                        <option value="MONITORING">Monitoring</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      4. Select Trigger Condition Type
                    </label>
                    <select
                      value={customConditionType}
                      onChange={(e) => setCustomConditionType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="AMOUNT_THRESHOLD">Amount Threshold Exceeded (£)</option>
                      <option value="KEYWORD_MISMATCH">Description Contains Keyword</option>
                      <option value="CONTACT_MATCH">Target Contact Name Match</option>
                    </select>
                  </div>

                  {customConditionType === 'AMOUNT_THRESHOLD' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Minimum Amount Threshold (£)
                      </label>
                      <input
                        type="number"
                        value={customThresholdAmount}
                        onChange={(e) => setCustomThresholdAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {customConditionType === 'KEYWORD_MISMATCH' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Keyword to Match
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., consulting, legal, hardware"
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {customConditionType === 'CONTACT_MATCH' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Target Vendor / Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Amazon Services, BC Ltd"
                        value={customContactName}
                        onChange={(e) => setCustomContactName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      5. Rationale Explanation Message
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Transaction violates internal policy requirement for manager sign-off"
                      value={customRationale}
                      onChange={(e) => setCustomRationale(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomRule}
                    disabled={savingRule}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{savingRule ? 'Saving Rule...' : 'Save & Activate Custom Rule'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
