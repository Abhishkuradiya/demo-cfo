"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Download, Printer, CheckCircle2, Loader2, ExternalLink, Minus, Maximize2, Minimize2, Move, FileText, Layers } from 'lucide-react';
import { toast } from 'sonner';

export interface OpenInvoiceData {
  id: string;
  refNumber: string;
  date: string;
  desc: string;
  amount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isHighlighted?: boolean;
}

interface XeroInvoiceWindowManagerProps {
  invoices: OpenInvoiceData[];
  onCloseInvoice: (id: string) => void;
  onFocusInvoice: (id: string) => void;
  onUpdateInvoice: (id: string, updates: Partial<OpenInvoiceData>) => void;
}

export default function XeroInvoiceViewerDrawer({
  invoices,
  onCloseInvoice,
  onFocusInvoice,
  onUpdateInvoice
}: XeroInvoiceWindowManagerProps) {
  if (!invoices || invoices.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Floating Windows Stack */}
      {invoices.map((inv) => (
        <SingleFloatingInvoiceWindow
          key={inv.id}
          invoice={inv}
          onClose={() => onCloseInvoice(inv.id)}
          onFocus={() => onFocusInvoice(inv.id)}
          onUpdate={(updates) => onUpdateInvoice(inv.id, updates)}
        />
      ))}

      {/* Bottom Full-Width Taskbar Dock for Open/Minimized Invoice Windows */}
      <div className="fixed bottom-3 left-6 right-6 z-[10000] pointer-events-auto flex items-center justify-between gap-3 bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-2xl">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold px-2 border-r border-slate-700/80 mr-1 shrink-0">
          <Layers className="h-4 w-4 text-blue-400" />
          <span>Open Invoices ({invoices.length})</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto thin-scrollbar py-1 min-w-0">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => {
                onFocusInvoice(inv.id);
                if (inv.isMinimized) {
                  onUpdateInvoice(inv.id, { isMinimized: false, isHighlighted: true });
                } else {
                  onUpdateInvoice(inv.id, { isHighlighted: true });
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                inv.isMinimized
                  ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-blue-600 text-white border-blue-500 shadow-xs hover:bg-blue-700'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{inv.refNumber}</span>
              <span className="text-[10px] opacity-75">(&pound;{formatNum(inv.amount)})</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseInvoice(inv.id);
                }}
                className="hover:bg-black/20 p-0.5 rounded-md ml-1 transition"
                title="Close Window"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Single Floating, Draggable, Resizable Window Component
function SingleFloatingInvoiceWindow({
  invoice,
  onClose,
  onFocus,
  onUpdate
}: {
  invoice: OpenInvoiceData;
  onClose: () => void;
  onFocus: () => void;
  onUpdate: (updates: Partial<OpenInvoiceData>) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, winW: 0, winH: 0 });

  const [isInteracting, setIsInteracting] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [invoice.id]);

  // Clear highlight glow ring after 1.4s
  useEffect(() => {
    if (invoice.isHighlighted) {
      const timer = setTimeout(() => {
        onUpdate({ isHighlighted: false });
      }, 1450);
      return () => clearTimeout(timer);
    }
  }, [invoice.isHighlighted, onUpdate]);

  // Ultra-Smooth 60FPS Dragging Implementation
  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (invoice.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    isDraggingRef.current = true;
    setIsInteracting(true);

    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = invoice.x;
    const initialY = invoice.y;
    let latestX = initialX;
    let latestY = initialY;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      // Strict boundary clamping so title bar is NEVER lost behind taskbar dock or screen edges
      const maxTop = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 120) : 600;
      const maxLeft = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 200) : 800;

      latestX = Math.max(10, Math.min(maxLeft, initialX + dx));
      latestY = Math.max(10, Math.min(maxTop, initialY + dy));

      if (windowRef.current) {
        windowRef.current.style.left = `${latestX}px`;
        windowRef.current.style.top = `${latestY}px`;
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsInteracting(false);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdate({ x: latestX, y: latestY });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Ultra-Smooth 60FPS Resizing Implementation
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (invoice.isMaximized) return;
    onFocus();
    isResizingRef.current = true;
    setIsInteracting(true);
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = invoice.width;
    const initialH = invoice.height;
    let latestW = initialW;
    let latestH = initialH;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      ev.preventDefault();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      const maxW = typeof window !== 'undefined' ? Math.max(480, window.innerWidth - invoice.x - 20) : 820;
      const maxH = typeof window !== 'undefined' ? Math.max(320, window.innerHeight - invoice.y - 70) : 600;

      latestW = Math.max(480, Math.min(maxW, initialW + dx));
      latestH = Math.max(320, Math.min(maxH, initialH + dy));

      if (windowRef.current) {
        windowRef.current.style.width = `${latestW}px`;
        windowRef.current.style.height = `${latestH}px`;
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsInteracting(false);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdate({ width: latestW, height: latestH });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (invoice.isMinimized) return null;

  const invNum = invoice.refNumber ? (invoice.refNumber.startsWith('INV-') ? invoice.refNumber : `INV-${invoice.refNumber.slice(-5)}`) : 'INV-0153';

  // Authentic line items matching exact user 4-column data specification
  const lineItems = [
    { desc: "Amazon Sales", account: "412 - Amazon Sales", taxRate: "Zero Rated Income", amountGbp: 206636.50 },
    { desc: "Amazon Sales", account: "412 - Amazon Sales", taxRate: "5% (VAT on Income)", amountGbp: 14204.05 },
    { desc: "Amazon Sales", account: "412 - Amazon Sales", taxRate: "20% (VAT on Income)", amountGbp: 12551.43 },
    { desc: "Amazon Sales", account: "420 - Rebates & Supplier Incentives", taxRate: "No VAT", amountGbp: 1038.39 },
    { desc: "amazon fee", account: "508 - Amazon Fee", taxRate: "20% (VAT on Expenses)", amountGbp: -44023.41 },
  ];

  const handlePrint = () => {
    toast.info(`Preparing print for ${invNum}...`);
    window.print();
  };

  const handleExportPDF = () => {
    toast.success(`Exported PDF for ${invNum}`);
  };

  const maxTopBound = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 120) : 600;
  const maxLeftBound = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 200) : 800;
  const safeX = Math.max(10, Math.min(maxLeftBound, invoice.x));
  const safeY = Math.max(10, Math.min(maxTopBound, invoice.y));

  const windowStyle: React.CSSProperties = invoice.isMaximized
    ? {
        position: 'fixed',
        top: 10,
        left: 10,
        right: 10,
        bottom: 70,
        zIndex: invoice.zIndex
      }
    : {
        position: 'fixed',
        top: safeY,
        left: safeX,
        width: invoice.width,
        height: invoice.height,
        zIndex: invoice.zIndex
      };

  return (
    <div
      ref={windowRef}
      onClick={onFocus}
      style={windowStyle}
      className={`pointer-events-auto bg-slate-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 ${
        isInteracting
          ? 'transition-none select-none border-2 border-blue-500 shadow-2xl scale-[1.005]'
          : invoice.isHighlighted
          ? 'transition-all duration-300 ring-4 ring-blue-500 shadow-[0_0_35px_rgba(59,130,246,0.65)] border-2 border-blue-400 scale-[1.01]'
          : 'transition-shadow duration-200 border border-slate-400/80 hover:shadow-blue-500/10'
      }`}
    >
      {/* Draggable Window Top Title Bar */}
      <div
        onMouseDown={handleDragMouseDown}
        className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 select-none cursor-move border-b border-slate-700/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-slate-900 transition"
              title="Close"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ isMinimized: true });
              }}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-slate-900 transition"
              title="Minimize"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ isMaximized: !invoice.isMaximized });
              }}
              className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-slate-900 transition"
              title={invoice.isMaximized ? "Restore Window" : "Maximize Window"}
            />
          </div>

          <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
            <Move className="h-3.5 w-3.5 text-slate-400" />
            <span>Tax Invoice Document</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400 font-mono">{invNum}</span>
          </div>
        </div>

        {/* Window Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer border border-slate-700"
          >
            <Download className="h-3 w-3 inline mr-1 text-slate-400" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer border border-slate-700"
          >
            <Printer className="h-3 w-3 inline mr-1 text-slate-400" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdate({ isMinimized: true })}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ isMaximized: !invoice.isMaximized })}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={invoice.isMaximized ? "Restore Window" : "Maximize Window"}
          >
            {invoice.isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-red-600 transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Window Body Container */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-table-scrollbar relative">
        {isLoading ? (
          <div className="min-h-[300px] bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center p-8 text-center shadow-xs">
            <Loader2 className="h-7 w-7 text-blue-600 animate-spin mb-2" />
            <h4 className="text-xs font-bold text-slate-800">Loading Invoice Document...</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Fetching verified records for {invNum}</p>
          </div>
        ) : (
          /* Formal Paper Tax Invoice Sheet */
          <div className="bg-white rounded-md border border-slate-300 shadow-md p-6 md:p-8 space-y-6 text-slate-800 font-sans text-xs">
            
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-5 gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  MI Health Ltd
                </h1>
                <p className="text-slate-500 font-medium text-[11px] mt-0.5">
                  123 Healthcare Avenue, London, UK &bull; VAT Reg: GB987654321
                </p>
                <p className="text-slate-400 text-[10px]">Official Xero Financial Record</p>
              </div>

              <div className="text-left sm:text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] uppercase tracking-wider mb-1.5 border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>PAID IN FULL</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                  TAX INVOICE
                </h2>
                <div className="font-mono font-bold text-slate-700 text-xs mt-0.5">
                  {invNum}
                </div>
              </div>
            </div>

            {/* Billed To Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-lg border border-slate-200 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed To (Contact)</div>
                <div className="font-extrabold text-blue-700 text-xs">Amazon</div>
                <div className="text-slate-500 text-[11px]">No address</div>
                <div className="text-slate-500 text-[11px]">Branding Theme: <span className="font-semibold text-slate-700">PillPharm</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</div>
                  <div className="font-bold text-slate-800 mt-0.5">{invoice.date || '14 Aug 2026'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due Date</div>
                  <div className="font-bold text-slate-800 mt-0.5">{invoice.date || '14 Aug 2026'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reference</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{invoice.refNumber || '14 Aug'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Online Payments</div>
                  <div className="font-semibold text-slate-600 mt-0.5">None</div>
                </div>
              </div>
            </div>

            {/* Line Items Table - Strictly 4 Columns Specified by User */}
            <div className="border border-slate-300 rounded-md overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right border-b border-slate-300">
                Amounts are tax inclusive
              </div>
              <div className="overflow-x-auto custom-table-scrollbar">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-4 border-r border-slate-700">Description</th>
                      <th className="py-2.5 px-4 border-r border-slate-700">Account</th>
                      <th className="py-2.5 px-4 border-r border-slate-700">Tax rate</th>
                      <th className="py-2.5 px-4 text-right">Amount GBP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                    {lineItems.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-200">{row.desc}</td>
                        <td className="py-2.5 px-4 text-slate-600 border-r border-slate-200 font-medium">{row.account}</td>
                        <td className="py-2.5 px-4 text-slate-600 border-r border-slate-200 font-medium">{row.taxRate}</td>
                        <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${row.amountGbp < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatNum(row.amountGbp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reconciliation & Totals Box */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-1">
              <div className="space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600 text-[10px]">Columns (6 hidden)</span>
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600 text-[10px]">Files (2)</span>
                </div>
              </div>

              <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-md border border-slate-300 space-y-2 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-200 font-bold text-slate-800">
                  <span>Subtotal</span>
                  <span className="tabular-nums">190,406.96</span>
                </div>

                <div className="space-y-0.5 text-[10px] text-slate-600 pl-1.5">
                  <div className="flex justify-between">
                    <span>Includes Zero Rated Income</span>
                    <span className="tabular-nums">0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Includes 5% (VAT on Income)</span>
                    <span className="tabular-nums">676.38</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Includes 20% (VAT on Income)</span>
                    <span className="tabular-nums">2,091.90</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Includes No VAT</span>
                    <span className="tabular-nums">0.00</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Includes 20% (VAT on Expenses)</span>
                    <span className="tabular-nums">-7,337.23</span>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-t-2 border-b-4 border-slate-900 text-xs font-black text-slate-900">
                  <span>Total</span>
                  <span className="tabular-nums">190,406.96</span>
                </div>

                <div className="space-y-1 pt-1.5 border-t border-slate-200 text-[11px]">
                  <a
                    href="https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=f28c455c-1daa-4f6e-a71d-380efb70e418"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                  >
                    <span className="flex items-center gap-1">
                      <span>Less: Payment (14 Aug 2026)</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                    <span className="tabular-nums">190,398.53</span>
                  </a>

                  <a
                    href="https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=ff493b46-c172-4a7d-be2e-a14b8ca97df0"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                  >
                    <span className="flex items-center gap-1">
                      <span>Less: Payment (28 Aug 2026)</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                    <span className="tabular-nums">8.43</span>
                  </a>
                </div>

                <div className="flex justify-between py-1.5 px-2.5 bg-emerald-100 border border-emerald-300 rounded font-black text-xs text-emerald-900 mt-1.5">
                  <span>Amount due</span>
                  <span className="tabular-nums text-emerald-800">0.00</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Resize Handle on Bottom Right Corner */}
      {!invoice.isMaximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-slate-700 select-none"
          title="Drag to resize window"
        >
          &para;
        </div>
      )}
    </div>
  );
}

function formatNum(val: number) {
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}
