"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ChevronLeft, Download, Layers, ChevronDown, Search, ArrowUpAZ, ArrowDownZA, Filter } from 'lucide-react';
import { toast } from 'sonner';
import XeroInvoiceViewerDrawer, { OpenInvoiceData } from './XeroInvoiceViewerDrawer';

interface TransactionLine {
  date: string;
  source: string;
  desc: string;
  ref: string;
  currency: string;
  debitSource: string;
  creditSource: number;
  debitGbp: string;
  creditGbp: number;
  runningBalance: number;
}

interface AccountTransactionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  streamName: string;
  totalRevenue: number;
}

export default function AccountTransactionsDrawer({
  isOpen,
  onClose,
  onBack,
  streamName,
  totalRevenue
}: AccountTransactionsDrawerProps) {
  // Preserve data during exit animation transition
  const [displayStreamName, setDisplayStreamName] = useState(streamName);
  const [displayTotalRevenue, setDisplayTotalRevenue] = useState(totalRevenue);

  // Excel Column Filtering & Sorting States
  const [filterSelections, setFilterSelections] = useState<Record<string, string[]>>({});
  const [draftSelections, setDraftSelections] = useState<string[]>([]);
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ colKey: string; direction: 'asc' | 'desc' } | null>(null);

  // 3rd Level Multi-Instance Floating Xero Invoice Windows
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceData[]>([]);

  const handleOpenInvoice = (row: TransactionLine) => {
    setOpenInvoices(prev => {
      const existing = prev.find(inv => inv.refNumber === row.ref);
      if (existing) {
        const maxZ = Math.max(...prev.map(i => i.zIndex), 1000);
        toast.info(`Invoice ${row.ref} is already open and brought to front!`);
        return prev.map(inv => inv.refNumber === row.ref ? { ...inv, zIndex: maxZ + 1, isMinimized: false, isHighlighted: true } : inv);
      }
      const offset = (prev.length % 5) * 30;
      const maxZ = Math.max(...prev.map(i => i.zIndex), 1000);
      const winW = typeof window !== 'undefined' ? Math.min(820, window.innerWidth - 60) : 820;
      const winH = typeof window !== 'undefined' ? Math.min(520, window.innerHeight - 180) : 520;
      const startX = typeof window !== 'undefined' ? Math.max(30, Math.round((window.innerWidth - winW) / 2) + offset) : 90;
      const startY = typeof window !== 'undefined' ? Math.max(30, Math.round((window.innerHeight - winH) / 2 - 30) + offset) : 50;

      return [
        ...prev,
        {
          id: `${row.ref}-${Date.now()}`,
          refNumber: row.ref,
          date: row.date,
          desc: row.desc,
          amount: row.creditGbp,
          x: startX,
          y: startY,
          width: winW,
          height: winH,
          zIndex: maxZ + 1,
          isMinimized: false,
          isMaximized: false,
          isHighlighted: true
        }
      ];
    });
  };

  const handleCloseInvoice = (id: string) => {
    setOpenInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const handleFocusInvoice = (id: string) => {
    setOpenInvoices(prev => {
      const maxZ = Math.max(...prev.map(i => i.zIndex), 1000);
      return prev.map(inv => inv.id === id ? { ...inv, zIndex: maxZ + 1 } : inv);
    });
  };

  const handleUpdateInvoice = (id: string, updates: Partial<OpenInvoiceData>) => {
    setOpenInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
  };

  useEffect(() => {
    if (isOpen) {
      if (streamName) {
        setDisplayStreamName(streamName);
        setDisplayTotalRevenue(totalRevenue);
      }
      // Reset column filters and sorting whenever the drawer opens or stream changes
      setFilterSelections({});
      setDraftSelections([]);
      setActiveFilterColumn(null);
      setSearchTerms({});
      setSortConfig(null);
    }
  }, [isOpen, streamName, totalRevenue]);

  const activeStreamName = streamName || displayStreamName || "Sales";
  const activeTotalRevenue = totalRevenue || displayTotalRevenue || 0;

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeFilterColumn && !target.closest('.excel-filter-cell')) {
        setActiveFilterColumn(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeFilterColumn]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeFilterColumn) {
          setActiveFilterColumn(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeFilterColumn, onClose]);

  // Generate authentic Xero Account Transactions matching user screenshot
  const transactionsData: TransactionLine[] = useMemo(() => {
    const currentStream = activeStreamName.toLowerCase();
    const isAmazon = currentStream.includes('amazon');
    const isWebsite = currentStream.includes('web');
    const isEbay = currentStream.includes('ebay');

    const rawList = isAmazon ? [
      { date: "02 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "26610293812", credit: 28450.00 },
      { date: "05 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26640192831", credit: 19820.50 },
      { date: "10 Apr 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "26681029381", credit: 32100.00 },
      { date: "14 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26701928301", credit: 15430.25 },
      { date: "18 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26718293019", credit: 22150.00 },
      { date: "20 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26722238172", credit: 120742.33 },
      { date: "20 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26722238172", credit: 7021.28 },
      { date: "20 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26722238172", credit: 6489.93 },
      { date: "24 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26812355232", credit: 177142.24 },
      { date: "24 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26812355232", credit: 4961.91 },
      { date: "24 Apr 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26812355232", credit: 18312.98 },
      { date: "28 Apr 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "26859102938", credit: 29400.00 },
      { date: "02 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26871029381", credit: 18250.00 },
      { date: "05 May 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "26880192831", credit: 24100.00 },
      { date: "08 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26892820132", credit: 151974.68 },
      { date: "08 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26892820132", credit: 2287.86 },
      { date: "08 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26892820132", credit: 14265.66 },
      { date: "12 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26921029381", credit: 16800.00 },
      { date: "16 May 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "26950192831", credit: 21350.00 },
      { date: "22 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26981842802", credit: 128932.66 },
      { date: "22 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26981842802", credit: 1106.04 },
      { date: "22 May 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "26981842802", credit: 8263.72 },
      { date: "27 May 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "27010293819", credit: 25400.00 },
      { date: "31 May 2026", source: "Receivable Invoice", desc: "Invoice 27065195232 Part 1", ref: "27065195232", credit: 118407.43 },
      { date: "31 May 2026", source: "Receivable Invoice", desc: "Invoice 27065195232 Part 1", ref: "27065195232", credit: 938.75 },
      { date: "31 May 2026", source: "Receivable Invoice", desc: "Invoice 27065195232 Part 1", ref: "27065195232", credit: 3863.60 },
      { date: "01 Jun 2026", source: "Receivable Invoice", desc: "Invoice 27065195232 Part 2", ref: "27065195232", credit: 28.47 },
      { date: "05 Jun 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "27101928301", credit: 19800.00 },
      { date: "10 Jun 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "27138102938", credit: 14200.00 },
      { date: "14 Jun 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "27160192831", credit: 22600.00 },
      { date: "19 Jun 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 92151.58 },
      { date: "19 Jun 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 4403.96 },
      { date: "19 Jun 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 16025.36 },
      { date: "25 Jun 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "27220192831", credit: 18900.00 },
      { date: "03 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 69095.05 },
      { date: "03 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 3901.36 },
      { date: "03 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "19 June", credit: 4430.00 },
      { date: "10 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "27310192831", credit: 21500.00 },
      { date: "17 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "17 July", credit: 66057.45 },
      { date: "17 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "17 July", credit: 3056.32 },
      { date: "17 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "17 July", credit: 3462.33 },
      { date: "24 Jul 2026", source: "Receivable Invoice", desc: "Amazon - FBA Disbursement", ref: "27410192831", credit: 17400.00 },
      { date: "31 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "31 July", credit: 85764.91 },
      { date: "31 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "31 July", credit: 8848.20 },
      { date: "31 Jul 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "31 July", credit: 7269.89 },
      { date: "07 Aug 2026", source: "Receivable Invoice", desc: "Amazon - Marketplace Settlement", ref: "27510192831", credit: 23100.00 },
      { date: "14 Aug 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "14 Aug", credit: 206636.50 },
      { date: "14 Aug 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "14 Aug", credit: 13527.67 },
      { date: "14 Aug 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "14 Aug", credit: 10459.53 },
      { date: "28 Aug 2026", source: "Receivable Invoice", desc: "Amazon - Amazon Sales", ref: "28 Aug", credit: 131629.33 }
    ] : isWebsite ? [
      { date: "02 Apr 2026", source: "Receivable Invoice", desc: "Website - Stripe Payment", ref: "INV-WEB-1001", credit: 145000.00 },
      { date: "15 Apr 2026", source: "Receivable Invoice", desc: "Website - Online Checkout", ref: "INV-WEB-1002", credit: 210500.50 },
      { date: "01 May 2026", source: "Receivable Invoice", desc: "Website - E-Commerce Sales", ref: "INV-WEB-1003", credit: 389780.00 },
      { date: "20 May 2026", source: "Receivable Invoice", desc: "Website - Stripe Payment", ref: "INV-WEB-1004", credit: 175200.00 },
      { date: "10 Jun 2026", source: "Receivable Invoice", desc: "Website - Online Store", ref: "INV-WEB-1005", credit: 298400.00 },
      { date: "05 Jul 2026", source: "Receivable Invoice", desc: "Website - Online Checkout", ref: "INV-WEB-1006", credit: 184500.00 },
      { date: "22 Aug 2026", source: "Receivable Invoice", desc: "Website - Stripe Payment", ref: "INV-WEB-1007", credit: 217468.50 }
    ] : isEbay ? [
      { date: "05 Apr 2026", source: "Receivable Invoice", desc: "eBay - Merchant Sales", ref: "EBAY-8801", credit: 54100.00 },
      { date: "28 Apr 2026", source: "Receivable Invoice", desc: "eBay - Direct Payout", ref: "EBAY-8802", credit: 92400.00 },
      { date: "18 May 2026", source: "Receivable Invoice", desc: "eBay - Merchant Sales", ref: "EBAY-8803", credit: 110500.00 },
      { date: "14 Jun 2026", source: "Receivable Invoice", desc: "eBay - Direct Payout", ref: "EBAY-8804", credit: 86450.00 },
      { date: "19 Jul 2026", source: "Receivable Invoice", desc: "eBay - Merchant Sales", ref: "EBAY-8805", credit: 72753.00 }
    ] : [
      { date: "10 Apr 2026", source: "Receivable Invoice", desc: `${activeStreamName} Entry`, ref: "INV-2001", credit: Math.round(activeTotalRevenue * 0.4) },
      { date: "15 Jun 2026", source: "Receivable Invoice", desc: `${activeStreamName} Entry`, ref: "INV-2002", credit: Math.round(activeTotalRevenue * 0.35) },
      { date: "20 Aug 2026", source: "Receivable Invoice", desc: `${activeStreamName} Entry`, ref: "INV-2003", credit: Math.round(activeTotalRevenue * 0.25) }
    ];

    let running = 0;
    return rawList.map(item => {
      running += item.credit;
      return {
        date: item.date,
        source: item.source,
        desc: item.desc,
        ref: item.ref,
        currency: "GBP",
        debitSource: "-",
        creditSource: item.credit,
        debitGbp: "-",
        creditGbp: item.credit,
        runningBalance: running
      };
    });
  }, [activeStreamName, activeTotalRevenue]);

  const getColVal = (item: TransactionLine, colKey: string) => {
    if (colKey === 'date') return item.date;
    if (colKey === 'source') return item.source;
    if (colKey === 'desc') return item.desc;
    if (colKey === 'ref') return item.ref;
    if (colKey === 'currency') return item.currency;
    if (colKey === 'debitGbp') return item.debitGbp;
    if (colKey === 'creditGbp') return item.creditGbp.toString();
    if (colKey === 'runningBalance') return item.runningBalance.toString();
    return "";
  };

  // Processed Data with Column Filters & Sorting
  const processedData = useMemo(() => {
    let result = [...transactionsData];

    // Apply column filters
    Object.keys(filterSelections).forEach(colKey => {
      const selectedVals = filterSelections[colKey];
      if (selectedVals) {
        const selectedSet = new Set(selectedVals);
        result = result.filter(item => {
          const valStr = getColVal(item, colKey);
          return selectedSet.has(valStr);
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      const { colKey, direction } = sortConfig;
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";
        if (colKey === 'date') { valA = new Date(a.date).getTime() || 0; valB = new Date(b.date).getTime() || 0; }
        else if (colKey === 'source') { valA = a.source; valB = b.source; }
        else if (colKey === 'desc') { valA = a.desc; valB = b.desc; }
        else if (colKey === 'ref') { valA = a.ref; valB = b.ref; }
        else if (colKey === 'currency') { valA = a.currency; valB = b.currency; }
        else if (colKey === 'debitGbp') { valA = a.debitGbp; valB = b.debitGbp; }
        else if (colKey === 'creditGbp') { valA = a.creditGbp; valB = b.creditGbp; }
        else if (colKey === 'runningBalance') { valA = a.runningBalance; valB = b.runningBalance; }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Recalculate running balance
    let running = 0;
    return result.map(item => {
      running += item.creditGbp;
      return {
        ...item,
        runningBalance: running
      };
    });
  }, [transactionsData, filterSelections, sortConfig]);

  const filteredTotalSum = useMemo(() => {
    return processedData.reduce((acc, curr) => acc + curr.creditGbp, 0);
  }, [processedData]);

  const getCurrencySymbol = (curr: string = "GBP") => {
    switch (curr.toUpperCase()) {
      case 'GBP': return '£';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      case 'AUD': return 'A$';
      case 'CAD': return 'C$';
      default: return '£';
    }
  };

  const formatNum = (val: number) => {
    return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const activeCurrencySymbol = getCurrencySymbol(processedData[0]?.currency || "GBP");

  const handleExportCSV = () => {
    try {
      const headers = ["Date,Source,Description,Reference,Currency,Credit (GBP),Running Balance (GBP)"];
      const rows = processedData.map(t => `"${t.date}","${t.source}","${t.desc}","${t.ref}","${t.currency}",${t.creditGbp},${t.runningBalance}`);
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${activeStreamName}_Account_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Account transactions CSV exported successfully!");
    } catch (err) {
      toast.error("Failed to export CSV");
    }
  };

  const renderColumnHeader = (colKey: string, label: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isFilterActive = filterSelections[colKey] !== undefined;
    const isPopoverOpen = activeFilterColumn === colKey;

    const allUniqueValues = Array.from(new Set(transactionsData.map(item => getColVal(item, colKey)))).sort();

    const searchTerm = searchTerms[colKey] || '';

    const visibleOptions = allUniqueValues.filter(val =>
      val.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAllSelected = visibleOptions.length > 0 && visibleOptions.every(v => draftSelections.includes(v));

    const toggleSelectAll = () => {
      if (isAllSelected) {
        setDraftSelections(prev => prev.filter(v => !visibleOptions.includes(v)));
      } else {
        setDraftSelections(prev => Array.from(new Set([...prev, ...visibleOptions])));
      }
    };

    const toggleOption = (val: string) => {
      setDraftSelections(prev => 
        prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
      );
    };

    const applyFilter = () => {
      if (draftSelections.length === allUniqueValues.length) {
        setFilterSelections(prev => {
          const copy = { ...prev };
          delete copy[colKey];
          return copy;
        });
      } else {
        setFilterSelections(prev => ({ ...prev, [colKey]: draftSelections }));
      }
      setActiveFilterColumn(null);
    };

    const clearColumnFilter = () => {
      setFilterSelections(prev => {
        const copy = { ...prev };
        delete copy[colKey];
        return copy;
      });
      setSearchTerms(prev => ({ ...prev, [colKey]: '' }));
      setActiveFilterColumn(null);
    };

    const openPopover = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPopoverOpen) {
        setActiveFilterColumn(null);
      } else {
        const existing = filterSelections[colKey];
        setDraftSelections(existing !== undefined ? [...existing] : [...allUniqueValues]);
        setActiveFilterColumn(colKey);
      }
    };

    return (
      <th className={`py-3.5 px-6 relative select-none excel-filter-cell text-${align}`}>
        <div 
          className={`inline-flex items-center gap-1.5 cursor-pointer group ${align === 'right' ? 'flex-row-reverse' : align === 'center' ? 'justify-center w-full' : ''}`}
          onClick={openPopover}
        >
          <span>{label}</span>
          <button
            type="button"
            className={`p-1 rounded-md transition-all ${
              isFilterActive 
                ? 'bg-blue-600 text-white font-bold shadow-2xs' 
                : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/80'
            }`}
            title={`Filter / Sort ${label}`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Excel Filter Dropdown Popover */}
        {isPopoverOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full mt-1.5 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-2xl p-3.5 text-slate-800 text-xs font-normal normal-case text-left ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
              <span>Filter: {label}</span>
              <button
                type="button"
                onClick={() => setActiveFilterColumn(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Buttons */}
            <div className="py-2 flex flex-col gap-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSortConfig({ colKey, direction: 'asc' });
                  setActiveFilterColumn(null);
                }}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer ${
                  sortConfig?.colKey === colKey && sortConfig?.direction === 'asc' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                }`}
              >
                <ArrowUpAZ className="h-4 w-4 text-slate-400" />
                <span>Sort A to Z (Ascending)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSortConfig({ colKey, direction: 'desc' });
                  setActiveFilterColumn(null);
                }}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer ${
                  sortConfig?.colKey === colKey && sortConfig?.direction === 'desc' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                }`}
              >
                <ArrowDownZA className="h-4 w-4 text-slate-400" />
                <span>Sort Z to A (Descending)</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="pt-2.5 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search values..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, [colKey]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Checkbox Multiselect List */}
            <div className="max-h-48 overflow-y-auto border border-slate-200/90 rounded-lg bg-slate-50/50 p-1 space-y-0.5">
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-200/60 rounded cursor-pointer font-bold text-slate-800 border-b border-slate-200/80 mb-1">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>(Select All)</span>
              </label>

              {visibleOptions.length === 0 ? (
                <div className="py-3 text-center text-slate-400 italic">No matching items</div>
              ) : (
                visibleOptions.map((optVal, idx) => {
                  const isChecked = draftSelections.includes(optVal);
                  let displayOpt = optVal;
                  if (colKey === 'creditGbp' || colKey === 'runningBalance') {
                    displayOpt = formatNum(parseFloat(optVal) || 0);
                  }

                  return (
                    <label key={idx} className="flex items-center gap-2 px-2 py-1 hover:bg-blue-50/70 rounded cursor-pointer text-slate-700 text-xs transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOption(optVal)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate">{displayOpt}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={clearColumnFilter}
                className="text-xs text-slate-500 hover:text-red-600 font-medium transition cursor-pointer"
              >
                Clear Filter
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilterColumn(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilter}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                >
                  OK
                </button>
              </div>
            </div>

          </div>
        )}
      </th>
    );
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-white">
          {/* Full Screen Ultra Smooth Slide-Over Page (Left-to-Right Entrance) */}
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full bg-white flex flex-col"
          >
            
            {/* Full Screen Header (Clean Modern Accounting Style) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-8 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={onBack}
                  className="w-10 h-10 rounded-full bg-slate-100/90 hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200/80 hover:border-blue-600 flex items-center justify-center transition-all duration-200 shadow-2xs hover:shadow-md hover:shadow-blue-500/25 cursor-pointer group shrink-0 active:scale-95"
                  title="Back to Turnover Breakdown"
                  aria-label="Back to Turnover Breakdown"
                >
                  <ChevronLeft className="h-5.5 w-5.5 group-hover:-translate-x-0.5 transition-transform ease-out" />
                </button>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {activeStreamName} Transactions
                  </h2>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    MI Health Ltd &nbsp;|&nbsp; For the period 1 April 2026 to 30 September 2026
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-4 py-2 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  <Download className="h-4 w-4 text-slate-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer outline-none ml-2"
                  aria-label="Close transactions view"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Account Transactions Data Table (Clean Full Screen Accounting Typography with Excel Filters) */}
            <div className="flex-1 overflow-y-auto px-2 relative custom-table-scrollbar">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider text-center">
                    {renderColumnHeader('date', 'Date', 'center')}
                    {renderColumnHeader('source', 'Source', 'center')}
                    {renderColumnHeader('desc', 'Description', 'center')}
                    {renderColumnHeader('ref', 'Reference', 'center')}
                    {renderColumnHeader('currency', 'Currency', 'center')}
                    {renderColumnHeader('debitGbp', 'Debit', 'center')}
                    {renderColumnHeader('creditGbp', 'Credit', 'center')}
                    {renderColumnHeader('runningBalance', 'Running Balance', 'center')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans text-xs">
                  {processedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic font-medium">
                        No transactions match the selected filters
                      </td>
                    </tr>
                  ) : (
                    processedData.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`transition-colors border-b border-slate-100 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                        } hover:bg-blue-50/70`}
                      >
                        <td className="py-3 px-6 text-center whitespace-nowrap text-slate-700 font-medium">{row.date}</td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-slate-500">{row.source}</td>
                        <td className="py-3 px-6 text-center font-semibold text-slate-900">{row.desc}</td>
                        <td 
                          className="py-3 px-6 text-center font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors" 
                          title="Click to view full Xero invoice details & breakdown"
                          onClick={() => handleOpenInvoice(row)}
                        >
                          {row.ref}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 text-[11px] font-medium">{row.currency}</td>
                        <td className="py-3 px-6 text-center text-slate-300 font-normal">{row.debitGbp}</td>
                        <td className="py-3 px-6 text-center font-semibold text-slate-900 tabular-nums">
                          <span className="text-slate-400 font-normal text-[11px] mr-1">{getCurrencySymbol(row.currency)}</span>
                          <span>{formatNum(row.creditGbp)}</span>
                        </td>
                        <td className="py-3 px-8 text-center font-bold text-slate-900 tabular-nums">
                          <span className="text-slate-400 font-normal text-[11px] mr-1">{getCurrencySymbol(row.currency)}</span>
                          <span>{formatNum(row.runningBalance)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Normal Sticky Bottom Total Summary Row */}
                <tfoot className="sticky bottom-0 z-10 bg-slate-50 border-t-2 border-slate-300 shadow-md">
                  <tr className="border-b border-b-slate-300 bg-slate-50 font-bold text-xs text-slate-900 text-center">
                    <td colSpan={5} className="py-4 px-6 text-center font-bold text-slate-800 uppercase tracking-wider text-xs">
                      Total {activeStreamName}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-normal">-</td>
                    <td className="py-4 px-6 text-center font-extrabold text-slate-900 tabular-nums text-sm">
                      <span className="text-slate-600 font-bold text-xs mr-1">{activeCurrencySymbol}</span>
                      <span>{formatNum(filteredTotalSum)}</span>
                    </td>
                    <td className="py-4 px-8 text-center font-black text-slate-900 tabular-nums text-sm">
                      <span className="text-slate-600 font-bold text-xs mr-1">{activeCurrencySymbol}</span>
                      <span>{formatNum(filteredTotalSum)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Fixed Footer Note */}
            <div className="border-t border-slate-200 bg-slate-100/80 px-8 py-3 text-xs text-slate-500 flex justify-between shrink-0">
              <span>Showing {processedData.length} of {transactionsData.length} entries</span>
              <span className="font-semibold text-slate-700">Official Xero Account Transactions Report</span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* 3rd Level Multi-Instance Floating, Draggable, Resizable Invoice Window Manager */}
    <XeroInvoiceViewerDrawer
      invoices={openInvoices}
      onCloseInvoice={handleCloseInvoice}
      onFocusInvoice={handleFocusInvoice}
      onUpdateInvoice={handleUpdateInvoice}
    />
    </>
  );
}
