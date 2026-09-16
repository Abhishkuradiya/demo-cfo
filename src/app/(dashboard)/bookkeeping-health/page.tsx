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
  AlertCircle
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
  
  // UI Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [customOnly, setCustomOnly] = useState<boolean>(false);
  const [expandedExceptionId, setExpandedExceptionId] = useState<string | null>(null);
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
  const [customRequirePO, setCustomRequirePO] = useState<boolean>(false);
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
    } catch (err: any) {
      toast.error(err.message || 'Error loading bookkeeping audit health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // Filtered Exceptions
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
        matchesCat = e.category === selectedCategory;
      }

      let matchesSev = true;
      if (selectedSeverity !== 'ALL') {
        matchesSev = e.severity === selectedSeverity;
      }

      let matchesCustom = true;
      if (customOnly) {
        matchesCustom = e.isCustomRule;
      }

      return matchesSearch && matchesCat && matchesSev && matchesCustom;
    });
  }, [exceptions, searchTerm, selectedCategory, selectedSeverity, customOnly, dismissedIds]);

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
      
      // Update local state and refetch audit
      setRules(prev => prev.map(r => r.ruleCode === ruleCode ? { ...r, isEnabled: updatedStatus } : r));
      fetchAuditData();
    } catch (err: any) {
      toast.error(err.message || 'Error updating rule');
    }
  };

  // Save New Custom Rule
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
      } else if (customConditionType === 'MISSING_PO') {
        configJson.requirePO = true;
        configJson.minAmount = customThresholdAmount;
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
      
      // Reset Form & Refetch
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
    if (!confirm('Are you sure you want to reset all bookkeeping rules to CFO system defaults? Custom rules will be removed.')) return;
    try {
      const res = await fetch('/api/dashboard/bookkeeping-health/rules?reset=true', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset rules');
      const json = await res.json();
      toast.success('Bookkeeping rules reset to CFO system defaults');
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
      'Why Flagged Rationale',
      'Rule Type'
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
      `"${e.whyFlagged.replace(/"/g, '""')}"`,
      e.isCustomRule ? 'USER CUSTOM' : 'CFO SYSTEM'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CFO_Bookkeeping_Health_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookkeeping Health Audit Report exported as CSV');
  };

  // Dismiss exception row locally
  const handleDismissException = (id: string, eName: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    toast.success(`Exception "${eName}" marked as reviewed`);
  };

  const healthScore = data?.healthScore !== undefined ? data.healthScore : 94;
  const healthBadge = healthScore >= 85 ? { label: 'EXCELLENT', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' } :
                     healthScore >= 70 ? { label: 'GOOD', bg: 'bg-blue-500/10 text-blue-700 border-blue-300' } :
                     healthScore >= 50 ? { label: 'NEEDS REVIEW', bg: 'bg-amber-500/10 text-amber-700 border-amber-300' } :
                     { label: 'CRITICAL RISK', bg: 'bg-rose-500/10 text-rose-700 border-rose-300' };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* Top Header & Page Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  CFO Bookkeeping Health & Exception Audit
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  Continuous ledger exception detection across 8 CFO audit buckets & user custom policies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowRuleDrawer(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer border border-indigo-400/30"
            >
              <Sliders className="h-4 w-4" />
              <span>Configure Rules & Policies</span>
            </button>

            <button
              onClick={fetchAuditData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700/80 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span>Re-Audit Ledgers</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <Download className="h-4 w-4" />
              <span>Export Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Health Score Gauge & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Main Bookkeeping Health Score Gauge Card */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Bookkeeping Health Score
          </div>

          <div className="relative h-28 w-28 flex items-center justify-center my-1">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={healthScore >= 85 ? "text-emerald-500" : healthScore >= 70 ? "text-blue-500" : healthScore >= 50 ? "text-amber-500" : "text-rose-500"}
                strokeDasharray={`${healthScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{healthScore}</span>
              <span className="text-[10px] font-bold text-slate-400">/ 100</span>
            </div>
          </div>

          <span className={cn("text-[10.5px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider mt-1", healthBadge.bg)}>
            {healthBadge.label}
          </span>
        </div>

        {/* 4 Severity Metrics */}
        <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Critical Exceptions Card */}
          <div className="bg-gradient-to-b from-rose-50/80 to-white border border-rose-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                Critical Issues
              </span>
              <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-950">{data?.summary?.criticalCount || 0}</div>
              <div className="text-[11px] font-medium text-rose-700/90 mt-0.5">
                Requires immediate CFO attention
              </div>
            </div>
          </div>

          {/* Review Required Card */}
          <div className="bg-gradient-to-b from-amber-50/80 to-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Review Required
              </span>
              <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-950">{data?.summary?.reviewCount || 0}</div>
              <div className="text-[11px] font-medium text-amber-700/90 mt-0.5">
                Classification & Tax anomalies
              </div>
            </div>
          </div>

          {/* Data Quality Card */}
          <div className="bg-gradient-to-b from-blue-50/80 to-white border border-blue-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Data Quality
              </span>
              <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <FileSearch className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-blue-950">{data?.summary?.dataQualityCount || 0}</div>
              <div className="text-[11px] font-medium text-blue-700/90 mt-0.5">
                Missing invoice # or contact info
              </div>
            </div>
          </div>

          {/* Monitoring Alerts Card */}
          <div className="bg-gradient-to-b from-indigo-50/80 to-white border border-indigo-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Monitoring
              </span>
              <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                <Info className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-indigo-950">{data?.summary?.monitoringCount || 0}</div>
              <div className="text-[11px] font-medium text-indigo-700/90 mt-0.5">
                Total Financial Risk: <span className="font-extrabold text-indigo-900">£{(data?.summary?.totalRiskExposure || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bucket Category Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { key: 'ALL', label: 'All Exceptions', count: exceptions.length },
            { key: 'DUPLICATE', label: '🔴 Duplicates', count: data?.bucketCounts?.DUPLICATE || 0 },
            { key: 'RECONCILIATION', label: '🏦 Reconciliation', count: data?.bucketCounts?.RECONCILIATION || 0 },
            { key: 'PAYMENT_MISMATCH', label: '💰 Payment & Overdue', count: data?.bucketCounts?.PAYMENT_MISMATCH || 0 },
            { key: 'INCOMPLETE_DATA', label: '🧾 Incomplete Data', count: data?.bucketCounts?.INCOMPLETE_DATA || 0 },
            { key: 'CLASSIFICATION_ANOMALY', label: '📚 Classification Anomalies', count: data?.bucketCounts?.CLASSIFICATION_ANOMALY || 0 },
            { key: 'TAX_ANOMALY', label: '🧮 Tax / VAT Issues', count: data?.bucketCounts?.TAX_ANOMALY || 0 },
            { key: 'PERIOD_CHECK', label: '📅 Dates & Periods', count: data?.bucketCounts?.PERIOD_CHECK || 0 },
            { key: 'CREDIT_NOTE', label: '🔄 Credit Notes', count: data?.bucketCounts?.CREDIT_NOTE || 0 },
            { key: 'CUSTOM_POLICY', label: '⚡ User Custom Rules', count: data?.bucketCounts?.CUSTOM_POLICY || 0 }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none",
                selectedCategory === tab.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                selectedCategory === tab.key ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search party, invoice #, or rule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Severity Dropdown Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="REVIEW_REQUIRED">🟠 Review Required</option>
            <option value="DATA_QUALITY">🟡 Data Quality</option>
            <option value="MONITORING">🔵 Monitoring</option>
          </select>

          {/* User Custom Rule Filter Toggle */}
          <button
            type="button"
            onClick={() => setCustomOnly(!customOnly)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer",
              customOnly
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            )}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>User Custom Rules Only</span>
          </button>
        </div>
      </div>

      {/* Exception Feed & Audit Cards Table */}
      <div className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Bookkeeping Exceptions Found</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
                Your Xero ledger transactions pass all selected audit rules & custom bookkeeping policies cleanly.
              </p>
            </div>
          </div>
        ) : (
          filteredExceptions.map((item) => {
            const isExpanded = expandedExceptionId === item.id;
            const sevBadge = item.severity === 'CRITICAL' ? { label: 'CRITICAL', bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: ShieldAlert } :
                             item.severity === 'REVIEW_REQUIRED' ? { label: 'REVIEW REQUIRED', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertTriangle } :
                             item.severity === 'DATA_QUALITY' ? { label: 'DATA QUALITY', bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: FileSearch } :
                             { label: 'MONITORING', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Info };
            
            const SevIcon = sevBadge.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white rounded-2xl border transition shadow-2xs overflow-hidden",
                  item.severity === 'CRITICAL' ? "border-rose-200 hover:border-rose-300" :
                  item.severity === 'REVIEW_REQUIRED' ? "border-amber-200 hover:border-amber-300" :
                  "border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Exception Card Header Bar */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5", sevBadge.bg)}>
                      <SevIcon className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider", sevBadge.bg)}>
                          {sevBadge.label}
                        </span>

                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category.replace(/_/g, ' ')}
                        </span>

                        {item.isCustomRule && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            USER CUSTOM RULE
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          Confidence: <strong className="text-slate-900 font-extrabold">{item.confidenceScore}%</strong>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {item.ruleName}
                      </h4>

                      <div className="text-xs text-slate-600 font-medium flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <strong className="text-slate-800">{item.contactName}</strong>
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          Ref: {item.reference}
                        </span>

                        {item.date && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {item.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Impact Amount</div>
                      <div className="text-base font-black text-slate-900">
                        £{item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedExceptionId(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Why Flagged?</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismissException(item.id, item.ruleName)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                        title="Mark Reviewed & Dismiss"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* "Why Flagged?" Expandable Rationale Accordion */}
                {isExpanded && (
                  <div className="bg-slate-50/80 border-t border-slate-200/80 p-4 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900">Primary Audit Rationale:</div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {item.whyFlagged}
                        </p>
                      </div>
                    </div>

                    {item.matchingDetails && item.matchingDetails.length > 0 && (
                      <div className="pl-6 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Matching Attributes Breakdown:</div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {item.matchingDetails.map((detail, dIdx) => (
                            <li key={dIdx} className="text-[11.5px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADVANCED RULE CONFIGURATION & CUSTOM POLICY DRAWER */}
      {/* ========================================================================= */}
      {showRuleDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
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
                  title="Reset to CFO System Defaults"
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

            {/* Drawer Navigation Tabs */}
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
                /* TAB 1: RULE LIBRARY LIST & TOGGLES */
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

                      {/* Rule Toggle Switch */}
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
                /* TAB 2: CREATE CUSTOM RULE FORM */
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
                        <option value="CRITICAL">🔴 Critical Issue</option>
                        <option value="REVIEW_REQUIRED">🟠 Review Required</option>
                        <option value="DATA_QUALITY">🟡 Data Quality</option>
                        <option value="MONITORING">🔵 Monitoring</option>
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
                      <option value="MISSING_PO">Missing Purchase Order (PO #)</option>
                    </select>
                  </div>

                  {/* Dynamic Fields Based on Condition Type */}
                  {(customConditionType === 'AMOUNT_THRESHOLD' || customConditionType === 'MISSING_PO') && (
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
                        Keyword to Match (Description or Reference)
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
                      5. "Why Flagged?" Rationale Explanation Message
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
