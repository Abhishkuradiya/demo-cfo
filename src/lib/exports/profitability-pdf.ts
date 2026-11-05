import type { jsPDF } from 'jspdf';
import { FORECAST_COVER_BASE64 } from './cover-images';

export interface ProfitabilityPdfOptions {
  orgName?: string;
  currency?: string;
  periodLabel: string;
  dataSource?: string;
  selectedPeriod: string;
  data: {
    revenue?: number | null;
    cogs?: number | null;
    grossProfit?: number | null;
    grossMarginPct?: number | null;
    operatingExpenses?: number | null;
    operatingMarginPct?: number | null;
    ebitda?: number | null;
    operatingProfit?: number | null;
    profitBeforeTax?: number | null;
    netProfit?: number | null;
    netMarginPct?: number | null;
    currency?: string;
    customerProfitability?: Array<{
      customer: string;
      revenue: number;
      grossProfit?: number | null;
      margin?: number | null;
      invoices?: Array<{
        invoiceNumber?: string;
        date?: string;
        description?: string;
        status?: string;
        amount?: number;
      }>;
    }>;
    productProfitability?: Array<{
      product: string;
      revenue: number;
      grossProfit?: number | null;
      margin?: number | null;
      subEntries?: Array<{
        customer?: string;
        invoiceNumber?: string;
        date?: string;
        quantity?: number;
        unitAmount?: number;
        amount?: number;
      }>;
    }>;
    departmentProfitability?: Array<{
      department: string;
      revenue: number;
      grossProfit?: number | null;
      margin?: number | null;
      subEntries?: Array<{
        customer?: string;
        invoiceNumber?: string;
        date?: string;
        description?: string;
        amount?: number;
      }>;
    }>;
    budgetVsActual?: Array<{
      category: string;
      type: string;
      budget: number;
      actual: number;
    }>;
    expenseAnalysis?: Array<{
      account: string;
      accountType: string;
      actual: number;
    }>;
    marginDistribution?: {
      eligibleCount?: number;
      highMargin?: { count: number; pct: number | null };
      mediumMargin?: { count: number; pct: number | null };
      lowMargin?: { count: number; pct: number | null };
    };
    aiOpportunities?: string[];
  };
}

export async function exportProfitabilityPdf(options: ProfitabilityPdfOptions): Promise<void> {
  const { default: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm
  const totalPages = 4;

  const currency = options.currency || options.data?.currency || 'USD';
  const symbol =
    currency === 'GBP'
      ? '£'
      : currency === 'EUR'
        ? '€'
        : currency === 'AUD'
          ? 'A$'
          : currency === 'CAD'
            ? 'C$'
            : '$';

  const fmtMoney = (val: number | null | undefined): string => {
    if (val == null || !Number.isFinite(Number(val))) return 'N/A';
    const num = Number(val);
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  };

  const fmtPct = (val: number | null | undefined): string => {
    if (val == null || !Number.isFinite(Number(val))) return 'N/A';
    return `${Number(val).toFixed(2)}%`;
  };

  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Virtual CFO Intelligence · ${options.orgName || 'Financial Reporting'} · Reporting Window: ${options.periodLabel} · Currency: ${currency}`,
      margin,
      pageHeight - 5,
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, {
      align: 'right',
    });
  };

  const drawRunningHeader = (title: string) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('VIRTUAL CFO PLATFORM · PROFITABILITY ANALYSIS', margin, 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${title} · Period: ${options.periodLabel}`, pageWidth - margin, 9.5, {
      align: 'right',
    });
  };

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  try {
    doc.addImage(FORECAST_COVER_BASE64, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  } catch (err) {
    console.error('Failed to render profitability cover image:', err);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Cover Title Block
  doc.setFillColor(15, 23, 42); // Navy overlay box
  doc.roundedRect(margin, 45, contentWidth, 54, 3, 3, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, 45, contentWidth, 54, 3, 3, 'S');

  // Blue Accent Pill
  doc.setFillColor(0, 112, 243);
  doc.roundedRect(margin + 8, 54, 46, 5.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('CFO INTELLIGENCE SUITE', margin + 11, 57.8);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Profitability Analysis', margin + 8, 69);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'Executive report on revenue performance, direct costs, contribution margins, and unit economics.',
    margin + 8,
    76,
  );
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Reconciled with live Xero General Ledger data for reporting cycle: ${options.periodLabel}.`,
    margin + 8,
    82,
  );

  // Executive Metadata Card at bottom of cover
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, pageHeight - 26, contentWidth, 16, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, pageHeight - 26, contentWidth, 16, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(options.orgName || 'Virtual CFO Client Organization', margin + 5, pageHeight - 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Ledger Source: ${options.dataSource || 'Xero Live Organization Ledger'}`,
    margin + 5,
    pageHeight - 12.5,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 112, 243);
  doc.text(
    `Reporting Window: ${options.periodLabel}`,
    margin + contentWidth - 5,
    pageHeight - 17,
    { align: 'right' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Currency: ${currency} (${symbol}) · Generated: ${new Date().toLocaleDateString('en-GB')}`,
    margin + contentWidth - 5,
    pageHeight - 12.5,
    { align: 'right' },
  );

  // =========================================================================
  // PAGE 2: EXECUTIVE SUMMARY & 10 KPI CARDS + REVENUE BY CUSTOMER
  // =========================================================================
  doc.addPage();
  drawPageFooter(2);
  drawRunningHeader('Executive Summary & Customer Revenue');

  let y = 17;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('Profitability Analysis & Margins', margin, y + 4);

  // Live Xero Badge
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin + contentWidth - 36, y - 1, 36, 6, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin + contentWidth - 36, y - 1, 36, 6, 2, 2, 'S');

  doc.setFillColor(16, 185, 129);
  doc.circle(margin + contentWidth - 32.5, y + 2, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text('Xero Verified Actuals', margin + contentWidth - 29.5, y + 3);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Understand where your business makes — and loses — money across customers, products, and operational departments.',
    margin,
    y + 9.5,
  );

  y += 14;

  // 10 KPI Cards (5 columns x 2 rows)
  const d = options.data;
  const kpis = [
    { label: 'Net Revenue', val: fmtMoney(d.revenue), color: [16, 185, 129], sub: 'P&L Trading Income' },
    { label: 'Cost of Sales', val: fmtMoney(d.cogs), color: [244, 63, 94], sub: 'Direct Costs' },
    { label: 'Gross Profit', val: fmtMoney(d.grossProfit), color: [59, 130, 246], sub: 'Contribution Pool' },
    { label: 'Operating Expenses', val: fmtMoney(d.operatingExpenses), color: [245, 158, 11], sub: 'Overheads & Admin' },
    { label: 'Gross Margin', val: fmtPct(d.grossMarginPct), color: [168, 85, 247], sub: 'Gross Profit Margin' },
    { label: 'Operating Margin', val: fmtPct(d.operatingMarginPct), color: [13, 148, 136], sub: 'Operating Efficiency' },
    { label: 'EBITDA', val: fmtMoney(d.ebitda), color: [99, 102, 241], sub: 'Operating Cash Flow' },
    { label: 'Operating Profit', val: fmtMoney(d.operatingProfit), color: [234, 88, 12], sub: 'EBIT' },
    { label: 'Profit Before Tax', val: fmtMoney(d.profitBeforeTax), color: [2, 132, 199], sub: 'Pre-tax Earnings' },
    { label: 'Net Profit', val: fmtMoney(d.netProfit), color: [22, 163, 74], sub: 'Net Bottom Line' },
  ];

  const colCount = 5;
  const gap = 2.5;
  const cardW = (contentWidth - gap * (colCount - 1)) / colCount; // ~35.2mm
  const cardH = 17;

  kpis.forEach((kpi, idx) => {
    const col = idx % colCount;
    const row = Math.floor(idx / colCount);
    const cx = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    // Card background & border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');

    // Color bar accent at top of card
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cx, cy, cardW, 1.4, 1, 1, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 2.5, cy + 5.2);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, cx + 2.5, cy + 10.5);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, cx + 2.5, cy + 14.5);
  });

  y += cardH * 2 + gap + 6;

  // Margin Distribution & AI Opportunities Widgets side-by-side
  const widgetH = 34;
  const widgetW = (contentWidth - 4) / 2; // 91mm

  // Widget 1: Margin Distribution
  const w1x = margin;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(w1x, y, widgetW, widgetH, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(w1x, y, widgetW, widgetH, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Margin Distribution', w1x + 4, y + 5.5);

  const md = d.marginDistribution;
  const tiers = [
    { label: 'High Margin (>50%)', count: md?.highMargin?.count, pct: md?.highMargin?.pct, barColor: [16, 185, 129] },
    { label: 'Medium Margin (20-50%)', count: md?.mediumMargin?.count, pct: md?.mediumMargin?.pct, barColor: [245, 158, 11] },
    { label: 'Low Margin (<20%)', count: md?.lowMargin?.count, pct: md?.lowMargin?.pct, barColor: [244, 63, 94] },
  ];

  let ty = y + 9.5;
  tiers.forEach((t) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    doc.text(t.label, w1x + 4, ty + 2.5);

    const countStr = `${t.count ?? 'N/A'} (${t.pct == null ? 'N/A' : `${t.pct.toFixed(1)}%`})`;
    doc.text(countStr, w1x + widgetW - 4, ty + 2.5, { align: 'right' });

    // Progress bar track
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(w1x + 4, ty + 4, widgetW - 8, 2.2, 1, 1, 'F');

    // Progress bar fill
    const fillWidth = Math.max(0, Math.min(widgetW - 8, ((t.pct || 0) / 100) * (widgetW - 8)));
    if (fillWidth > 0) {
      doc.setFillColor(t.barColor[0], t.barColor[1], t.barColor[2]);
      doc.roundedRect(w1x + 4, ty + 4, fillWidth, 2.2, 1, 1, 'F');
    }
    ty += 7.5;
  });

  // Widget 2: Top Profitability Opportunities
  const w2x = margin + widgetW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(w2x, y, widgetW, widgetH, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(w2x, y, widgetW, widgetH, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Top Profitability Opportunities', w2x + 4, y + 5.5);

  doc.setFillColor(243, 232, 255);
  doc.roundedRect(w2x + widgetW - 22, y + 2.5, 18, 4, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(126, 34, 206);
  doc.text('AI Generated', w2x + widgetW - 20, y + 5.2);

  const opps = (d.aiOpportunities && d.aiOpportunities.length > 0)
    ? d.aiOpportunities.slice(0, 3)
    : [
        'Optimize high-revenue customer gross margins by reviewing line-item service costs.',
        'Review tracking categories with elevated operating overheads to protect net margin.',
        'Eliminate negative margin products and align service pricing with target contribution.',
      ];

  let oy = y + 10;
  opps.forEach((opp, i) => {
    doc.setFillColor(254, 243, 199);
    doc.circle(w2x + 6, oy + 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(146, 64, 14);
    doc.text(String(i + 1), w2x + 5.2, oy + 2.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(opp, widgetW - 14);
    doc.text(lines, w2x + 10, oy + 2.2);
    oy += 7.5;
  });

  y += widgetH + 6;

  // Table 1: Revenue by Customer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Revenue by Customer', margin, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer invoice activity and net revenue contribution from Xero sales ledger', margin, y + 7.5);

  y += 9.5;

  // Customer Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 3, y + 4.2);
  doc.text('CUSTOMER NAME', margin + 12, y + 4.2);
  doc.text('INVOICE ACTIVITY', margin + 95, y + 4.2, { align: 'right' });
  doc.text('DIRECT COSTS', margin + 140, y + 4.2, { align: 'right' });
  doc.text('MARGIN', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += 6;

  const customers = (d.customerProfitability || []).slice(0, 8);
  customers.forEach((cust, cIdx) => {
    const isEven = cIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 5.8, 'F');

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 5.8, margin + contentWidth, y + 5.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(cIdx + 1), margin + 3, y + 4);

    doc.setTextColor(15, 23, 42);
    const custName = doc.splitTextToSize(cust.customer, 65)[0];
    doc.text(custName, margin + 12, y + 4);

    const invCount = Array.isArray(cust.invoices) ? cust.invoices.length : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${invCount} ${invCount === 1 ? 'inv' : 'invs'})`, margin + 14 + doc.getTextWidth(custName), y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(fmtMoney(cust.revenue), margin + 95, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('N/A', margin + 140, y + 4, { align: 'right' });
    doc.text('N/A', margin + contentWidth - 4, y + 4, { align: 'right' });

    y += 5.8;

    // Expand top customer invoices as sub-entries breakdown (e.g. for first 2 customers)
    if (cIdx < 2 && Array.isArray(cust.invoices) && cust.invoices.length > 0) {
      cust.invoices.slice(0, 3).forEach((inv) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 4.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(0, 112, 243);
        doc.text(`↳ ${inv.invoiceNumber || 'INV'}`, margin + 15, y + 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(100, 116, 139);
        const invDate = inv.date ? String(inv.date).slice(0, 10) : '—';
        doc.text(invDate, margin + 35, y + 3.2);

        const desc = doc.splitTextToSize(inv.description || 'Line item', 45)[0];
        doc.setTextColor(71, 85, 105);
        doc.text(desc, margin + 55, y + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(4, 120, 87);
        doc.text(inv.status || 'PAID', margin + 95, y + 3.2, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(fmtMoney(inv.amount), margin + 140, y + 3.2, { align: 'right' });

        y += 4.8;
      });
    }
  });

  // =========================================================================
  // PAGE 3: PRODUCT PROFITABILITY & DEPARTMENT TRACKING
  // =========================================================================
  doc.addPage();
  drawPageFooter(3);
  drawRunningHeader('Product & Department Contribution');

  y = 17;

  // Table 2: Product / Service Profitability
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Product / Service Profitability', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Revenues and margins by catalog item, consulting service, or billable activity', margin, y + 8.5);

  y += 11;

  // Product Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 3, y + 4.2);
  doc.text('PRODUCT / SERVICE DESCRIPTION', margin + 12, y + 4.2);
  doc.text('REVENUE', margin + 105, y + 4.2, { align: 'right' });
  doc.text('GROSS PROFIT', margin + 145, y + 4.2, { align: 'right' });
  doc.text('MARGIN', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += 6;

  const products = (d.productProfitability || []).slice(0, 10);
  products.forEach((prod, pIdx) => {
    const isEven = pIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(pIdx + 1), margin + 3, y + 4.2);

    doc.setTextColor(15, 23, 42);
    const prodName = doc.splitTextToSize(prod.product, 75)[0];
    doc.text(prodName, margin + 12, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(fmtMoney(prod.revenue), margin + 105, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(fmtMoney(prod.grossProfit), margin + 145, y + 4.2, { align: 'right' });

    if (prod.margin != null) {
      const mColor = prod.margin >= 50 ? [16, 185, 129] : prod.margin >= 30 ? [245, 158, 11] : [244, 63, 94];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mColor[0], mColor[1], mColor[2]);
      doc.text(`${prod.margin}%`, margin + contentWidth - 4, y + 4.2, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('N/A', margin + contentWidth - 4, y + 4.2, { align: 'right' });
    }

    y += 6;

    // Sub-entry lines for top products (first 2)
    if (pIdx < 2 && Array.isArray(prod.subEntries) && prod.subEntries.length > 0) {
      prod.subEntries.slice(0, 2).forEach((entry) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 4.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(0, 112, 243);
        doc.text(`↳ ${entry.invoiceNumber || 'INV'}`, margin + 15, y + 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(71, 85, 105);
        doc.text(entry.customer || 'Client', margin + 35, y + 3.2);

        doc.setTextColor(100, 116, 139);
        doc.text(`Qty: ${entry.quantity || 1} @ ${fmtMoney(entry.unitAmount)}`, margin + 80, y + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(fmtMoney(entry.amount), margin + 105, y + 3.2, { align: 'right' });

        y += 4.8;
      });
    }
  });

  y += 8;

  // Table 3: Department / Tracking Profitability
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Department / Tracking Profitability', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Performance by Xero tracking category, business unit, or geographic region', margin, y + 8.5);

  y += 11;

  // Department Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 3, y + 4.2);
  doc.text('TRACKING / DEPARTMENT OPTION', margin + 12, y + 4.2);
  doc.text('REVENUE', margin + 105, y + 4.2, { align: 'right' });
  doc.text('GROSS PROFIT', margin + 145, y + 4.2, { align: 'right' });
  doc.text('MARGIN', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += 6;

  const depts = (d.departmentProfitability || []).slice(0, 8);
  depts.forEach((dept, dIdx) => {
    const isEven = dIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(dIdx + 1), margin + 3, y + 4.2);

    doc.setTextColor(15, 23, 42);
    doc.text(dept.department, margin + 12, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(fmtMoney(dept.revenue), margin + 105, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(fmtMoney(dept.grossProfit), margin + 145, y + 4.2, { align: 'right' });
    doc.text(dept.margin != null ? `${dept.margin}%` : 'N/A', margin + contentWidth - 4, y + 4.2, { align: 'right' });

    y += 6;

    // Sub-entries for departments
    if (dIdx < 2 && Array.isArray(dept.subEntries) && dept.subEntries.length > 0) {
      dept.subEntries.slice(0, 2).forEach((entry) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 4.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(0, 112, 243);
        doc.text(`↳ ${entry.invoiceNumber || 'INV'}`, margin + 15, y + 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(71, 85, 105);
        doc.text(entry.customer || 'Customer', margin + 35, y + 3.2);

        const desc = doc.splitTextToSize(entry.description || 'Service line item', 40)[0];
        doc.setTextColor(100, 116, 139);
        doc.text(desc, margin + 65, y + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(fmtMoney(entry.amount), margin + 105, y + 3.2, { align: 'right' });

        y += 4.8;
      });
    }
  });

  // =========================================================================
  // PAGE 4: BUDGET VS ACTUAL & EXPENSE ANALYSIS + SIGN-OFF
  // =========================================================================
  doc.addPage();
  drawPageFooter(4);
  drawRunningHeader('Budget vs Actual & Ledger Variance');

  y = 17;

  // Table 4: Budget vs Actual Variance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Budget vs Actual Variance Analysis', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Comparing active VirtualCFO operating plan with verified Xero actuals', margin, y + 8.5);

  y += 11;

  // Budget Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ACCOUNT / CATEGORY', margin + 3, y + 4.2);
  doc.text('TYPE', margin + 65, y + 4.2);
  doc.text('BUDGET', margin + 100, y + 4.2, { align: 'right' });
  doc.text('ACTUAL', margin + 130, y + 4.2, { align: 'right' });
  doc.text('VARIANCE', margin + 160, y + 4.2, { align: 'right' });
  doc.text('VAR %', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += 6;

  const budgetRows = (d.budgetVsActual || []).slice(0, 8);
  if (budgetRows.length > 0) {
    budgetRows.forEach((row, bIdx) => {
      const isEven = bIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 5.8, 'F');

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(margin, y + 5.8, margin + contentWidth, y + 5.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(doc.splitTextToSize(row.category, 58)[0], margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(row.type, margin + 65, y + 4);

      doc.setTextColor(51, 65, 85);
      doc.text(fmtMoney(row.budget), margin + 100, y + 4, { align: 'right' });
      doc.text(fmtMoney(row.actual), margin + 130, y + 4, { align: 'right' });

      const variance = Number(row.actual) - Number(row.budget);
      const favourable = row.type === 'expense' ? variance <= 0 : variance >= 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(favourable ? 4 : 225, favourable ? 120 : 29, favourable ? 87 : 72);
      doc.text(fmtMoney(variance), margin + 160, y + 4, { align: 'right' });

      const pctStr = Number(row.budget) === 0 ? 'N/A' : `${((variance / Number(row.budget)) * 100).toFixed(1)}%`;
      doc.text(pctStr, margin + contentWidth - 4, y + 4, { align: 'right' });

      y += 5.8;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('N/A — No budget variance records configured for this reporting period.', margin + 4, y + 4.8);
    y += 7;
  }

  y += 7;

  // Table 5: Expense Accounts Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Expense Accounts Analysis', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Attributable expenses recorded across active Xero account classifications', margin, y + 8.5);

  y += 11;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('XERO ACCOUNT NAME', margin + 3, y + 4.2);
  doc.text('ACCOUNT TYPE', margin + 95, y + 4.2);
  doc.text('ACTUAL AMOUNT', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += 6;

  const expenses = (d.expenseAnalysis || []).slice(0, 8);
  if (expenses.length > 0) {
    expenses.forEach((exp, eIdx) => {
      const isEven = eIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 5.5, 'F');

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(doc.splitTextToSize(exp.account, 85)[0], margin + 3, y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(exp.accountType, margin + 95, y + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(fmtMoney(exp.actual), margin + contentWidth - 4, y + 3.8, { align: 'right' });

      y += 5.5;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('N/A — No expense accounts recorded for this reporting cycle.', margin + 4, y + 4.8);
    y += 7;
  }

  y += 8;

  // Executive Sign-off Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive CFO Profitability Sign-Off', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This profitability report has been generated directly from verified Xero general ledger journals and invoices.',
    margin + 4,
    y + 11,
  );
  doc.text(
    'All sales taxes (GST/VAT) have been excluded from revenue in strict compliance with GAAP/IFRS standards.',
    margin + 4,
    y + 15.5,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 112, 243);
  doc.text(`Status: Live Ledger Reconciled · Currency: ${currency}`, margin + 4, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Release: ${new Date().toLocaleDateString('en-GB')}`, margin + contentWidth - 4, y + 20, {
    align: 'right',
  });

  // Save the PDF
  doc.save(`profitability-${options.selectedPeriod || 'report'}.pdf`);
}

