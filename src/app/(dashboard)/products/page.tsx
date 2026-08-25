'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  FileText, 
  FileSpreadsheet, 
  ChevronDown, 
  SlidersHorizontal,
  RefreshCw, 
  BookOpen,
  Clock,
  Building,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Package,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Settings,
  MoreVertical,
  PlusCircle,
  FileUp,
  FileDown,
  Warehouse,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/common/page-container';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface InventoryItemDTO {
  code: string;
  name: string;
  group: string;
  location: string;
  qtyOnHand: number;
  qtyAvailable: number;
  qtyReserved: number;
  unitCost: number;
  totalValue: number;
  status: 'In Stock' | 'Low Stock' | 'Dead Stock';
  lastMovement: string;
}

interface InventoryData {
  connected: boolean;
  summary: {
    inventoryValue: number;
    realValue: number;
    lowStockCount: number;
    deadStockCount: number;
    totalItems: number;
  };
  items: InventoryItemDTO[];
  meta: {
    currency: string;
    calculatedAt: string;
  };
}

export default function ProductsPage() {
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Low' | 'Dead'>('All');
  const [itemTypeFilter, setItemTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [showZeroStock, setShowZeroStock] = useState('No');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/inventory?date=${date}`);
      if (!res.ok) {
        throw new Error('Failed to load Inventory data');
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load Inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [date]);

  const currencyCode = data?.meta?.currency || 'USD';

  const getCurrencySymbol = (code: string) => {
    try {
      const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
      return parts.find(p => p.type === 'currency')?.value || '';
    } catch {
      return code === 'GBP' ? '£' : (code === 'EUR' ? '€' : (code === 'INR' ? '₹' : '$'));
    }
  };

  const currencySymbol = getCurrencySymbol(currencyCode);

  const formatAmount = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  const getFilteredItems = () => {
    if (!data || !data.items) return [];
    return data.items.filter(item => {
      // 1. Search Query
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Tab Filter
      let matchTab = true;
      if (activeTab === 'Low') matchTab = item.status === 'Low Stock';
      else if (activeTab === 'Dead') matchTab = item.status === 'Dead Stock';

      // 3. Location Filter
      let matchLocation = true;
      if (locationFilter !== 'All') {
        matchLocation = item.location === locationFilter;
      }

      // 4. Status Dropdown Filter
      let matchStatus = true;
      if (statusFilter !== 'All') {
        matchStatus = item.status === statusFilter;
      }

      // 5. Group Filter
      let matchGroup = true;
      if (groupFilter !== 'All') {
        matchGroup = item.group === groupFilter;
      }

      // 6. Zero Stock Filter
      let matchZero = true;
      if (showZeroStock === 'No') {
        matchZero = item.qtyOnHand > 0;
      }

      return matchSearch && matchTab && matchLocation && matchStatus && matchGroup && matchZero;
    });
  };

  const filteredItems = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Sparkline generator helper
  const getSparklineOption = (color: string, sparkData: number[]) => ({
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: sparkData,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.5, color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}25` },
              { offset: 1, color: `${color}00` }
            ]
          }
        }
      }
    ]
  });

  // Value over time mockup trend option
  const valueOverTimeOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'],
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 }
    },
    series: [
      {
        name: 'Inventory Value',
        type: 'line',
        data: [200, 190, 230, 350, 330, 310, data?.summary?.inventoryValue ?? 320.00],
        itemStyle: { color: '#2563eb' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f61e' },
              { offset: 1, color: '#3b82f600' }
            ]
          }
        }
      }
    ]
  };

  const getInventoryByLocationData = () => {
    if (!data || !data.items) return [];
    const totals: Record<string, number> = {};
    data.items.forEach(item => {
      totals[item.location] = (totals[item.location] || 0) + item.totalValue;
    });
    const colors: Record<string, string> = { 'Main Warehouse': '#3b82f6', 'Store Room': '#10b981', 'Branch Office': '#f59e0b' };
    return Object.keys(totals).map(name => ({
      value: Math.round(totals[name] * 100) / 100,
      name,
      itemStyle: { color: colors[name] || '#94a3b8' }
    }));
  };

  const locationData = getInventoryByLocationData();
  const totalLocValue = locationData.reduce((acc, item) => acc + item.value, 0);

  const inventoryByLocationOption = {
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${currencySymbol}${params.value.toLocaleString()} (${params.percent}%)`
    },
    legend: { show: false },
    series: [
      {
        name: 'Locations',
        type: 'pie',
        radius: ['60%', '80%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.summary?.realValue ?? 320;
            return `${currencySymbol}${sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}\nTotal Value`;
          },
          textStyle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: locationData
      }
    ]
  };

  const getStockStatusData = () => {
    if (!data || !data.items) return [];
    const counts: Record<string, number> = { 'In Stock': 0, 'Low Stock': 0, 'Dead Stock': 0 };
    data.items.forEach(item => {
      counts[item.status]++;
    });
    return [
      { value: counts['In Stock'], name: 'In Stock', itemStyle: { color: '#10b981' } },
      { value: counts['Low Stock'], name: 'Low Stock', itemStyle: { color: '#f59e0b' } },
      { value: counts['Dead Stock'], name: 'Dead Stock', itemStyle: { color: '#ef4444' } }
    ];
  };

  const statusOverviewOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} items ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#64748b' } },
    series: [
      {
        name: 'Stock Status',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.items?.length || 0;
            return `${sum}\nTotal Items`;
          },
          textStyle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: getStockStatusData()
      }
    ]
  };

  const getInventoryByGroupData = () => {
    if (!data || !data.items) return [];
    const totals: Record<string, number> = {};
    data.items.forEach(item => {
      totals[item.group] = (totals[item.group] || 0) + item.totalValue;
    });
    const colors: Record<string, string> = { 'Electronics': '#3b82f6', 'Accessories': '#10b981', 'Office Supplies': '#f59e0b', 'Consumables': '#ef4444' };
    return Object.keys(totals).map(name => ({
      value: Math.round(totals[name] * 100) / 100,
      name,
      itemStyle: { color: colors[name] || '#94a3b8' }
    }));
  };

  const groupOverviewOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 9, color: '#64748b' } },
    series: [
      {
        name: 'Item Groups',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const sum = data?.summary?.realValue ?? 320;
            return `${currencySymbol}${sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}\nTotal Value`;
          },
          textStyle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', lineHeight: 18 }
        },
        labelLine: { show: false },
        data: getInventoryByGroupData()
      }
    ]
  };

  const getTopValuedItems = () => {
    if (!data || !data.items) return [];
    return [...data.items]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 4);
  };

  const topValuedItems = getTopValuedItems();

  return (
    <PageContainer>
      {/* ─── Breadcrumbs ─── */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium select-none mb-3">
        <Link href="/overview" className="hover:text-slate-600 text-slate-400 transition">Dashboard</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <Link href="/reports" className="hover:text-slate-600 text-slate-400 transition">Accounting</Link>
        <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-slate-350" />
        <span className="text-slate-600 font-semibold">Inventory</span>
      </div>

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">Inventory</h1>
            <HelpCircle className="h-4 w-4 text-slate-350 hover:text-slate-500 cursor-pointer transition" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Track stock levels, value and movement of your items.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:bg-slate-50/85 transition">
            <span className="text-xs font-semibold text-slate-500">As at:</span>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-250 bg-white hover:bg-emerald-50/20 text-emerald-600 transition cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50/20 text-purple-600 transition cursor-pointer">
            <FileUp className="h-3.5 w-3.5" />
            <span>Import Items</span>
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-3 select-none text-[11px] font-semibold text-slate-500">
        <div className="flex flex-col gap-1 min-w-[125px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Item Group</span>
          <select 
            value={groupFilter}
            onChange={(e) => { setGroupFilter(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All Groups</option>
            <option value="Electronics">Electronics</option>
            <option value="Accessories">Accessories</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Consumables">Consumables</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[125px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Warehouse/Location</span>
          <select 
            value={locationFilter}
            onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All Locations</option>
            <option value="Main Warehouse">Main Warehouse</option>
            <option value="Store Room">Store Room</option>
            <option value="Branch Office">Branch Office</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Stock Status</span>
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Dead Stock">Dead Stock</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Show Zero Stock</span>
          <select 
            value={showZeroStock}
            onChange={(e) => { setShowZeroStock(e.target.value); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white text-xs outline-none cursor-pointer"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 w-[160px] md:w-[200px] ml-auto">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Search</span>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 w-full focus:bg-white focus:border-slate-350 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* ─── Error Handling ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 flex items-start gap-3 select-none">
          <AlertCircle className="h-5 w-5 text-red-550 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-red-800">Unable to load Inventory</h4>
            <p className="text-xs text-red-650 font-medium">{error}</p>
            <button 
              onClick={fetchInventory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Skeleton Loader ─── */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 h-96 animate-pulse" />
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 h-96 animate-pulse" />
          </div>
        </div>
      )}

      {/* ─── Main Dynamic View ─── */}
      {!loading && !error && data && data.connected !== false && (
        <>
          {/* Card KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 select-none">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Value</span>
                  <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{formatAmount(data.summary.inventoryValue)}</h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                  <Package className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-400">Total value of all stock</p>
              <div className="h-7 w-full">
                <ReactECharts option={getSparklineOption('#f97316', [20, 18, 22, 26, 23, 28, 25])} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock Items</span>
                  <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{data.summary.lowStockCount}</h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                  <Warehouse className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-400">Items below reorder level</p>
              <div className="h-7 w-full">
                <ReactECharts option={getSparklineOption('#3b82f6', [2, 3, 1, 4, 2, 3, 2])} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dead Stock Items</span>
                  <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{data.summary.deadStockCount}</h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-red-50 border border-red-100 text-red-650 flex items-center justify-center">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-400">No movement for 90+ days</p>
              <div className="h-7 w-full">
                <ReactECharts option={getSparklineOption('#ef4444', [3, 4, 3, 2, 4, 3, 3])} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items</span>
                  <h3 className="text-xl font-extrabold text-slate-805 tracking-tight">{data.summary.totalItems}</h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                  <Sliders className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-400">Active inventory items</p>
              <div className="h-7 w-full">
                <ReactECharts option={getSparklineOption('#8b5cf6', [18, 18, 17, 19, 18, 18, 18])} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Middle charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 select-none">
            {/* Value trend */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Inventory Value Over Time</span>
                <select className="border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-650 bg-white">
                  <option>Last 12 Months</option>
                </select>
              </div>
              <div className="h-[200px] w-full">
                <ReactECharts option={valueOverTimeOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Warehouse locations breakdown */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Inventory by Location</span>
                <Link href="#" className="text-[9.5px] font-bold text-blue-600 hover:underline">View Details</Link>
              </div>
              <div className="h-[150px] w-full relative">
                <ReactECharts option={inventoryByLocationOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
              <div className="space-y-2 text-xs font-semibold text-slate-500 pt-3 border-t border-slate-50">
                {locationData.map((loc, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: loc.itemStyle.color }} />
                      <span>{loc.name}</span>
                    </div>
                    <span className="text-slate-805 font-bold">{formatAmount(loc.value)} ({totalLocValue > 0 ? Math.round((loc.value / totalLocValue) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main items table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 select-none">
              {/* Tabs */}
              <div className="flex gap-3 text-xs font-bold text-slate-400">
                <button 
                  onClick={() => { setActiveTab('All'); setCurrentPage(1); }}
                  className={cn("pb-3 border-b-2 cursor-pointer transition", activeTab === 'All' ? "border-blue-600 text-slate-850" : "border-transparent hover:text-slate-600")}
                >
                  All Items
                </button>
                <button 
                  onClick={() => { setActiveTab('Low'); setCurrentPage(1); }}
                  className={cn("pb-3 border-b-2 cursor-pointer transition", activeTab === 'Low' ? "border-blue-600 text-slate-850" : "border-transparent hover:text-slate-600")}
                >
                  Low Stock Items ({data.summary.lowStockCount})
                </button>
                <button 
                  onClick={() => { setActiveTab('Dead'); setCurrentPage(1); }}
                  className={cn("pb-3 border-b-2 cursor-pointer transition", activeTab === 'Dead' ? "border-blue-600 text-slate-850" : "border-transparent hover:text-slate-600")}
                >
                  Dead Stock Items ({data.summary.deadStockCount})
                </button>
              </div>

              <div className="flex items-center gap-2 self-end">
                <select className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white cursor-pointer outline-none">
                  <option>Bulk Actions</option>
                </select>
                <button className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 cursor-pointer shadow-2xs">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-semibold text-slate-650 text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold tracking-wider uppercase bg-slate-50/50">
                    <th className="py-2.5 px-3 w-6"><input type="checkbox" className="rounded border-slate-250 cursor-pointer" /></th>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Item Group</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">On Hand</th>
                    <th className="py-2.5 px-3 text-right">Available</th>
                    <th className="py-2.5 px-3 text-right">Reserved</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Value</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Last Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {paginatedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/40 transition">
                      <td className="py-3 px-3"><input type="checkbox" className="rounded border-slate-250 cursor-pointer" /></td>
                      <td className="py-3 px-3 text-slate-400 font-bold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="py-3 px-3 text-slate-805 font-bold font-mono">{item.code}</td>
                      <td className="py-3 px-3 text-slate-700 font-bold">{item.name}</td>
                      <td className="py-3 px-3 text-slate-500 font-medium">{item.group}</td>
                      <td className="py-3 px-3 text-slate-550 font-medium">{item.location}</td>
                      <td className="py-3 px-3 text-right text-slate-800 font-bold font-mono">{item.qtyOnHand}</td>
                      <td className="py-3 px-3 text-right text-slate-700 font-bold font-mono">{item.qtyAvailable}</td>
                      <td className="py-3 px-3 text-right text-slate-500 font-medium font-mono">{item.qtyReserved}</td>
                      <td className="py-3 px-3 text-right text-slate-650 font-mono">${item.unitCost.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-805 font-bold font-mono">${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.75 rounded-md text-[9px] font-bold border",
                          item.status === 'In Stock' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                          item.status === 'Low Stock' ? "bg-amber-50 border-amber-100 text-amber-600" :
                          "bg-red-50 border-red-100 text-red-600"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-medium font-mono">{item.lastMovement}</td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-slate-400 font-bold italic">
                        No inventory items matched the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 select-none">
                <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1 border border-slate-200 bg-white rounded-md text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-slate-700">Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 border border-slate-200 bg-white rounded-md text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom visual row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 select-none">
            {/* Status distribution */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Stock Status Overview</span>
              <div className="h-[180px] w-full relative">
                <ReactECharts option={statusOverviewOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Value group distribution */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Inventory Value by Item Group</span>
              <div className="h-[180px] w-full relative">
                <ReactECharts option={groupOverviewOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </div>

            {/* Top valued progress bars */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Top Items by Value</span>
                  <Link href="#" className="text-[9.5px] font-bold text-blue-600 hover:underline">View All</Link>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-slate-650">
                  {topValuedItems.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-slate-100 font-extrabold text-[10px] text-slate-500 flex items-center justify-center">{idx + 1}</span>
                          <span className="text-slate-805 font-bold truncate max-w-[130px]">{item.name}</span>
                        </div>
                        <span className="text-slate-805 font-extrabold font-mono">${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.round((item.totalValue / data.summary.realValue) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                  {topValuedItems.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 block italic py-4">No active stock items</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Xero Disconnected State ─── */}
      {data && data.connected === false && (
        <div className="flex flex-col items-center justify-center text-center select-none py-20 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-8 mt-6">
          <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-450 mb-4 animate-pulse">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-slate-800 mb-1.5">Xero Organization Disconnected</h2>
          <p className="text-xs text-slate-500 max-w-[340px] leading-relaxed mb-6">
            Please connect your Xero organization under credentials in Data Sources to compile and view your Inventory.
          </p>
          <Link href="/data-sources" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
            Go to Data Sources
          </Link>
        </div>
      )}

      {/* ─── Footer Notes Section ─── */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 select-none text-[11px] font-semibold text-slate-500/85">
        <div className="flex items-center gap-2 mb-3 text-slate-700">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold">Report Notes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed pl-1.5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.75"><Clock className="h-3.5 w-3.5 text-slate-400" /><span>Inventory value is calculated based on average cost.</span></div>
            <div className="flex items-center gap-1.75"><Building className="h-3.5 w-3.5 text-slate-400" /><span>Low stock items are below the reorder level.</span></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.75"><SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /><span>Dead stock items have no sales movement for 90+ days.</span></div>
            <div className="flex items-center gap-1.75"><Database className="h-3.5 w-3.5 text-slate-400" /><span>Data Source: Xero Accounting API</span></div>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex items-center gap-1.75"><CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /><span>Currency: {currencyCode}</span></div>
            <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">
              "This report reflects inventory status as at the selected date."
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
