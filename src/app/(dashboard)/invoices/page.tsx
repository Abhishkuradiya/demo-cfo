'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  X
} from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  taxAmount: number;
  lineAmount: number;
  accountCode: string;
  taxType: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
  date: string | null;
  dueDate: string | null;
  contactName: string;
  lineItems: LineItem[];
}

interface SummaryData {
  draftCount: number;
  draftValue: number;
  awaitingApprovalCount: number;
  awaitingApprovalValue: number;
  awaitingPaymentCount: number;
  awaitingPaymentValue: number;
  paidCount: number;
  paidValue: number;
  overdueCount: number;
  overdueValue: number;
  totalCount: number;
  totalValue: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ACCREC'); // Default to ACCREC (Receivables)
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Date Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Invoice State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/dashboard/invoices?type=${typeFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load invoices');
      }
      const data = await res.json();
      if (data.connected === false) {
        throw new Error('Xero is not connected. Please go to Connectors page.');
      }
      setInvoices(data.invoices || []);
      setSummary(data.summary || null);
      if (data.meta?.currency) {
        setCurrency(data.meta.currency);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, typeFilter, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    fetchInvoices();
  };

  const formatCurrency = (amount: number, customCurr = '') => {
    const curr = customCurr || currency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
          Paid
        </span>
      );
    }
    if (s === 'AUTHORISED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />
          Awaiting Payment
        </span>
      );
    }
    if (s === 'SUBMITTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Awaiting Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
        Draft
      </span>
    );
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (sortBy === 'date_desc') {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    }
    if (sortBy === 'date_asc') {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeA - timeB;
    }
    if (sortBy === 'amount_desc') {
      return b.total - a.total;
    }
    if (sortBy === 'amount_asc') {
      return a.total - b.total;
    }
    return 0;
  });

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <SectionHeader
          title="Invoices & Receivables"
          description="Detailed transaction cockpit tracking your sales invoices, payment collection, and outstanding balances."
        />
        
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setTypeFilter('ACCREC')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition duration-200 ${
              typeFilter === 'ACCREC' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sales Invoices (AR)
          </button>
          <button
            onClick={() => setTypeFilter('ACCPAY')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition duration-200 ${
              typeFilter === 'ACCPAY' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Purchase Bills (AP)
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Awaiting Payment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
            {summary && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                {summary.awaitingPaymentCount} Unpaid
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Payment</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">
            {loading ? (
              <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
            ) : (
              formatCurrency(summary?.awaitingPaymentValue || 0)
            )}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Outstanding accounts receivable</p>
        </div>

        {/* Card 2: Total Overdue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600 border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            {summary && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                {summary.overdueCount} Overdue
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue AR</p>
          <h3 className="text-xl font-black text-rose-600 mt-1">
            {loading ? (
              <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
            ) : (
              formatCurrency(summary?.overdueValue || 0)
            )}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Invoices exceeding credit days</p>
        </div>

        {/* Card 3: Paid Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            {summary && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {summary.paidCount} Paid
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">
            {loading ? (
              <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
            ) : (
              formatCurrency(summary?.paidValue || 0)
            )}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Payments successfully processed</p>
        </div>

        {/* Card 4: Total Generated */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            {summary && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {summary.totalCount} Total
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Generated Value</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">
            {loading ? (
              <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
            ) : (
              formatCurrency(summary?.totalValue || 0)
            )}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Sum value of all active invoice records</p>
        </div>

      </div>

      {/* FILTER COCKPIT CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="AUTHORISED">Awaiting Payment</option>
              <option value="SUBMITTED">Awaiting Approval</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Sort selection */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="date_desc">Newest Date First</option>
              <option value="date_asc">Oldest Date First</option>
              <option value="amount_desc">Highest Total Amount</option>
              <option value="amount_asc">Lowest Total Amount</option>
            </select>
          </div>

          {/* Custom Date Filters */}
          <div className="flex items-center gap-2 md:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Period:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-350">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 md:col-span-2 justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
            >
              Clear Filters
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
            >
              Apply Search
            </button>
          </div>

        </form>
      </div>

      {/* INVOICES TABLE GRID */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-500">Querying transaction entries from ledger...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : sortedInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-700">No Invoices Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no invoices matching your selected filters or date ranges.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-5 font-black text-slate-800">
                      {inv.invoiceNumber || '—'}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700">
                      {inv.contactName}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-500">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-500">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-4 px-4 font-extrabold text-slate-800 text-right">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700 text-right">
                      {inv.status.toUpperCase() === 'PAID' ? (
                        <span className="text-emerald-600 font-extrabold">Paid</span>
                      ) : (
                        <span className={inv.amountDue > 0 ? 'text-slate-800' : 'text-slate-400'}>
                          {formatCurrency(inv.amountDue, inv.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-md text-[10.5px] font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition duration-150"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-slate-800">
                    Invoice {selectedInvoice.invoiceNumber || 'Details'}
                  </h3>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <p className="text-[10px] text-slate-450 mt-1 font-bold">
                  Transaction identifier: <span className="font-mono text-slate-600">{selectedInvoice.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-450 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Meta Info Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Contact</span>
                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedInvoice.contactName}</p>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Date Issued</span>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatDate(selectedInvoice.date)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Due Date</span>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Currency</span>
                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedInvoice.currency}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Line Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[9px] font-extrabold uppercase text-slate-450">
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Tax (VAT)</th>
                        <th className="py-2.5 px-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-600">
                      {selectedInvoice.lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                            No detailed line items recorded for this invoice.
                          </td>
                        </tr>
                      ) : (
                        selectedInvoice.lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="py-3 px-4 font-bold text-slate-750 max-w-xs truncate">
                              {item.description || '—'}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-600">
                              {formatCurrency(item.unitAmount, selectedInvoice.currency)}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-600">
                              {formatCurrency(item.taxAmount, selectedInvoice.currency)}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                              {formatCurrency(item.lineAmount, selectedInvoice.currency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdowns */}
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-bold">Subtotal</span>
                    <span>
                      {formatCurrency(
                        selectedInvoice.total - selectedInvoice.lineItems.reduce((acc, l) => acc + l.taxAmount, 0),
                        selectedInvoice.currency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-bold">Tax Total</span>
                    <span>
                      {formatCurrency(
                        selectedInvoice.lineItems.reduce((acc, l) => acc + l.taxAmount, 0),
                        selectedInvoice.currency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-800 text-sm font-black">
                    <span>Total Amount</span>
                    <span>{formatCurrency(selectedInvoice.total, selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(selectedInvoice.amountPaid, selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-extrabold border-b border-slate-200 pb-2">
                    <span>Amount Due</span>
                    <span>{formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </PageContainer>
  );
}
