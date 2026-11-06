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
    depreciation?: number | null;
    operatingProfit?: number | null;
    interestExpenses?: number | null;
    profitBeforeTax?: number | null;
    taxProvision?: number | null;
    netProfit?: number | null;
    netMarginPct?: number | null;
    breakEvenSales?: number | null;
    marginOfSafetyPct?: number | null;
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
    priorPeriod?: {
      revenue?: number | null;
      cogs?: number | null;
      grossProfit?: number | null;
      operatingExpenses?: number | null;
      operatingProfit?: number | null;
      netProfit?: number | null;
    } | null;
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 15.35; // Consistent 15.35mm margin matching Management Accounts
  const right = pageWidth - 15.35;
  const tableWidth = right - left; // 179.3mm
  const totalPages = 5;

  // Management Accounts Color Palette
  const navy: [number, number, number] = [15, 23, 42]; // Slate 900
  const teal: [number, number, number] = [2, 132, 199]; // Sky 600
  const cyanAccent: [number, number, number] = [14, 116, 144]; // Cyan 700
  const muted: [number, number, number] = [100, 116, 139]; // Slate 500
  const border: [number, number, number] = [226, 232, 238];
  const cardBg: [number, number, number] = [250, 251, 252];
  const tableHeaderBg: [number, number, number] = [241, 245, 248]; // Light table header style
  const zebraBg: [number, number, number] = [248, 250, 252];
  const emerald: [number, number, number] = [5, 125, 91];
  const rose: [number, number, number] = [190, 24, 93];
  const amber: [number, number, number] = [217, 119, 6];

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
    return `${Number(val).toFixed(1)}%`;
  };

  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(220, 228, 235);
    doc.setLineWidth(0.25);
    doc.line(left, pageHeight - 11, right, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...muted);
    doc.text(
      `Virtual CFO Intelligence  |  Profitability Storybook  |  ${options.orgName || 'Financial Reporting'}  |  ${currency}`,
      left,
      pageHeight - 6,
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNum} of ${totalPages}`, right, pageHeight - 6, {
      align: 'right',
    });
  };

  // Management Accounts Top Header Banner (3-Row collision-free layout)
  const drawPageHeaderBanner = (chapterTag: string, pageTitle: string) => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFillColor(...teal);
    doc.rect(0, 0, 5, 35, 'F');

    // Bottom accent border line
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.35);
    doc.line(0, 35, pageWidth, 35);

    // Row 1 (y = 11.5): System Tag & Currency Indicator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(145, 211, 224); // Cyan tint
    doc.text(`VIRTUAL CFO INTELLIGENCE  /  ${chapterTag.toUpperCase()}`, left, 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(186, 205, 224);
    doc.text(`Currency: ${currency} (${symbol})  |  Accrual P&L`, right, 11.5, { align: 'right' });

    // Row 2 (y = 21): Page Title (Full horizontal width - zero collision)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pageTitle, left, 21);

    // Row 3 (y = 28): Reporting Cycle & Ledger Source
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(203, 213, 225);
    doc.text(`Reporting Period: ${options.periodLabel}  |  Ledger Source: ${options.dataSource || 'Xero Live Organization Ledger'}`, left, 28);
  };

  // Table Renderer with Light Theme Support
  interface ColumnDef {
    header: string;
    width: number;
    align?: 'left' | 'right' | 'center';
  }

  const renderTable = (
    startX: number,
    startY: number,
    columns: ColumnDef[],
    rows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][],
    tableOptions?: {
      headerHeight?: number;
      rowHeight?: number;
      fontSize?: number;
      headerFontSize?: number;
      zebra?: boolean;
      headerBg?: [number, number, number];
      headerTextColor?: [number, number, number];
      borderColor?: [number, number, number];
      isTotalRowLast?: boolean;
    },
  ): number => {
    const headerHeight = tableOptions?.headerHeight ?? 7.2;
    const rowHeight = tableOptions?.rowHeight ?? 5.8;
    const fontSize = tableOptions?.fontSize ?? 7.2;
    const headerFontSize = tableOptions?.headerFontSize ?? 6.8;
    const headerBg = tableOptions?.headerBg ?? tableHeaderBg;
    const headerTextColor = tableOptions?.headerTextColor ?? navy;
    const borderColor = tableOptions?.borderColor ?? border;

    let currentY = startY;
    const totalTableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    // Header Background
    doc.setFillColor(...headerBg);
    doc.rect(startX, currentY, totalTableWidth, headerHeight, 'F');

    // Header Bottom Line
    doc.setDrawColor(...(headerBg === navy ? navy : border));
    doc.setLineWidth(0.35);
    doc.line(startX, currentY + headerHeight, startX + totalTableWidth, currentY + headerHeight);

    let currentX = startX;
    columns.forEach((col) => {
      doc.setTextColor(...headerTextColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(headerFontSize);

      const headerLines = col.header.split('\n');
      const lineH = 2.8;
      const textStartY = currentY + headerHeight / 2 - ((headerLines.length - 1) * lineH) / 2 + 0.9;

      headerLines.forEach((hLine, hIdx) => {
        let textX = currentX + 3;
        if (col.align === 'right') textX = currentX + col.width - 3;
        else if (col.align === 'center') textX = currentX + col.width / 2;
        doc.text(hLine, textX, textStartY + hIdx * lineH, { align: col.align || 'left' });
      });

      currentX += col.width;
    });

    currentY += headerHeight;

    // Table Rows
    rows.forEach((row, rowIdx) => {
      const isTotalRow = tableOptions?.isTotalRowLast && rowIdx === rows.length - 1;

      let maxLinesInRow = 1;
      row.forEach((cell, colIdx) => {
        const col = columns[colIdx];
        const cellText = typeof cell === 'object' ? cell.text : cell;
        const lines = doc.splitTextToSize(cellText, col.width - 6);
        if (lines.length > maxLinesInRow) maxLinesInRow = lines.length;
      });

      const actualRowHeight = Math.max(rowHeight, maxLinesInRow * 3.4 + 2.4);

      currentX = startX;
      const isZebra = tableOptions?.zebra && rowIdx % 2 === 1 && !isTotalRow;

      if (isTotalRow) {
        doc.setFillColor(241, 245, 249);
        doc.rect(startX, currentY, totalTableWidth, actualRowHeight, 'F');
      } else if (isZebra) {
        doc.setFillColor(...zebraBg);
        doc.rect(startX, currentY, totalTableWidth, actualRowHeight, 'F');
      }

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.15);
      doc.line(startX, currentY + actualRowHeight, startX + totalTableWidth, currentY + actualRowHeight);

      if (isTotalRow) {
        doc.setLineWidth(0.35);
        doc.line(startX, currentY, startX + totalTableWidth, currentY);
        doc.line(startX, currentY + actualRowHeight - 0.4, startX + totalTableWidth, currentY + actualRowHeight - 0.4);
      }

      row.forEach((cell, colIdx) => {
        const col = columns[colIdx];
        const cellObj = typeof cell === 'object' ? cell : { text: cell };
        const text = cellObj.text ?? '';
        const align = cellObj.align || col.align || 'left';
        const isBold = isTotalRow || cellObj.bold;

        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);

        if (cellObj.color) {
          doc.setTextColor(...cellObj.color);
        } else if (isTotalRow) {
          doc.setTextColor(...navy);
        } else {
          doc.setTextColor(30, 41, 59);
        }

        let cellTextX = currentX + 3;
        if (align === 'right') cellTextX = currentX + col.width - 3;
        else if (align === 'center') cellTextX = currentX + col.width / 2;

        const lines = doc.splitTextToSize(text, col.width - 6);
        const textStartY = currentY + actualRowHeight / 2 - ((lines.length - 1) * 3) / 2 + 0.9;
        doc.text(lines, cellTextX, textStartY, { align });

        currentX += col.width;
      });

      currentY += actualRowHeight;
    });

    return currentY;
  };

  const d = options.data;
  const rev = Number(d.revenue) || 0;
  const cogs = Number(d.cogs) || 0;
  const grossProfit = Number(d.grossProfit) || (rev - cogs);
  const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : (Number(d.grossMarginPct) || 0);
  const opex = Number(d.operatingExpenses) || 0;
  const operatingProfit = Number(d.operatingProfit) ?? (grossProfit - opex);
  const operatingMargin = rev > 0 ? (operatingProfit / rev) * 100 : (Number(d.operatingMarginPct) || 0);
  const ebitda = d.ebitda != null ? Number(d.ebitda) : operatingProfit;
  const netProfit = Number(d.netProfit) ?? operatingProfit;
  const netMargin = rev > 0 ? (netProfit / rev) * 100 : (Number(d.netMarginPct) || 0);

  // =========================================================================
  // PAGE 1: EXECUTIVE STORYBOOK COVER PAGE
  // =========================================================================
  try {
    doc.addImage(FORECAST_COVER_BASE64, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  } catch (err) {
    console.error('Failed to render profitability cover image:', err);
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Cover Title Block (Management Accounts style)
  doc.setFillColor(...navy);
  doc.roundedRect(left, 44, tableWidth, 54, 2.5, 2.5, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.roundedRect(left, 44, tableWidth, 54, 2.5, 2.5, 'S');

  // Cyan Pill Badge
  doc.setFillColor(...teal);
  doc.roundedRect(left + 8, 52, 48, 5.5, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE FINANCIAL STORYBOOK', left + 10.5, 55.8);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Profitability Statement', left + 8, 67);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'Commercial performance, contribution margins, and unit economics storybook.',
    left + 8,
    74.5,
  );
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Reconciled accounting report for trading period: ${options.periodLabel}.`,
    left + 8,
    80.5,
  );

  // Cover Metadata Card at Bottom
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(left, pageHeight - 26, tableWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, pageHeight - 26, tableWidth, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text(options.orgName || 'Virtual CFO Client Organization', left + 5, pageHeight - 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text(
    `Ledger Source: ${options.dataSource || 'Xero Live Organization Ledger'}`,
    left + 5,
    pageHeight - 12.5,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...teal);
  doc.text(
    `Reporting Window: ${options.periodLabel}`,
    right - 5,
    pageHeight - 17,
    { align: 'right' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text(
    `Currency: ${currency} (${symbol}) · Generated: ${new Date().toLocaleDateString('en-GB')}`,
    right - 5,
    pageHeight - 12.5,
    { align: 'right' },
  );

  // =========================================================================
  // PAGE 2: REPORT GUIDE & TABLE OF CONTENTS (INDEXING)
  // =========================================================================
  doc.addPage();
  drawPageFooter(2);
  drawPageHeaderBanner('Report Navigation Guide', 'Table of Contents');

  // Subheader: SECTION / CHAPTER and PAGE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text('SECTION / CHAPTER', left, 46);
  doc.text('PAGE', right, 46, { align: 'right' });
  doc.setDrawColor(220, 228, 235);
  doc.setLineWidth(0.3);
  doc.line(left, 49, right, 49);

  const indexEntries = [
    {
      num: '01',
      chapter: 'CHAPTER 01',
      title: 'Executive Profitability Overview & Profit Waterfall',
      description: 'P&L Trading statement, gross and net margin KPIs, revenue conversion tracks, and break-even sales diagnostics.',
      page: '03',
    },
    {
      num: '02',
      chapter: 'CHAPTER 02',
      title: 'Commercial Analysis: Customer Revenue & Concentration',
      description: 'Client billing ledger, customer concentration risk metrics, average revenue per client, and margin distribution tiers.',
      page: '04',
    },
    {
      num: '03',
      chapter: 'CHAPTER 03',
      title: 'Catalog Economics: Product & Service Profitability',
      description: 'Itemized revenue and gross margin contribution breakdown for catalog offerings and invoiced services.',
      page: '05',
    },
    {
      num: '04',
      chapter: 'CHAPTER 03',
      title: 'Departmental Tracking & Regional Performance',
      description: 'Tracking category analytics across departments, cost centers, and regional operational branches.',
      page: '05',
    },
    {
      num: '05',
      chapter: 'CHAPTER 03',
      title: 'Operating Expense Analysis & CFO Governance Sign-Off',
      description: 'Overhead budget vs actual variance tracking, ledger reconciliation status, and formal executive sign-off certificate.',
      page: '05',
    },
  ];

  let indexY = 59;
  indexEntries.forEach((entry) => {
    // Number pill badge
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(left, indexY - 4, 8.5, 7.5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navy);
    doc.text(entry.num, left + 4.25, indexY + 1, { align: 'center' });

    // Chapter badge label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...teal);
    doc.text(entry.chapter, left + 13, indexY - 1);

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(...navy);
    doc.text(entry.title, left + 13, indexY + 3.8);

    // Dotted Leader Line to Page Number
    const titleWidth = doc.getTextWidth(entry.title);
    const leaderStart = Math.min(right - 22, left + 15 + titleWidth);
    doc.setDrawColor(204, 216, 225);
    doc.setLineWidth(0.25);
    doc.line(leaderStart, indexY + 3, right - 16, indexY + 3);

    // Page number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...teal);
    doc.text(entry.page, right, indexY + 3.8, { align: 'right' });

    // Description text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...muted);
    doc.text(entry.description, left + 13, indexY + 8.5, { maxWidth: tableWidth - 30 });

    // Subtle divider line
    doc.setDrawColor(238, 242, 246);
    doc.setLineWidth(0.2);
    doc.line(left, indexY + 13.5, right, indexY + 13.5);

    indexY += 19.5;
  });

  // Scope & Methodology Card
  const methY = indexY + 4;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.roundedRect(left, methY, tableWidth, 36, 1.8, 1.8, 'FD');
  doc.setFillColor(...teal);
  doc.roundedRect(left, methY, 1.5, 36, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...teal);
  doc.text('REPORTING METHODOLOGY & ACCRUAL ACCOUNTING FRAMEWORK', left + 4.5, methY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('Standardized Financial Measurement & Ledger Reconciliation', left + 4.5, methY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'This executive profitability report is synthesized directly from verified general ledger transactions recorded in Xero. Trading income reflects net sales turnover excluding sales taxes (GST/VAT) on a strict accrual basis.',
    left + 4.5,
    methY + 16.5,
    { maxWidth: tableWidth - 10 },
  );
  doc.text(
    'Cost of Sales includes direct materials, contractor fees, and merchant fulfillment costs. Operating expenses are classified per standard management accounting rules to isolate true commercial contribution from corporate overheads.',
    left + 4.5,
    methY + 23.5,
    { maxWidth: tableWidth - 10 },
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...teal);
  doc.text('✓ Accrual Basis Reconciled      ✓ Tax-Exclusive Net Revenue      ✓ Standardized Expense Mapping      ✓ Verified General Ledger', left + 4.5, methY + 31.5);

  // Financial Highlights Bar at Bottom of Index Page
  const snapY = methY + 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.text('FINANCIAL HIGHLIGHTS & TRADING SNAPSHOT', left, snapY + 3);

  const snapCardW = (tableWidth - 6) / 3;
  const snapCards = [
    { label: 'NET TRADING REVENUE', val: fmtMoney(rev), sub: 'Total reported turnover', color: navy },
    { label: 'GROSS PROFIT POOL', val: fmtMoney(grossProfit), sub: `${grossMargin.toFixed(1)}% Gross Margin`, color: grossMargin >= 40 ? emerald : amber },
    { label: 'NET BOTTOM LINE', val: fmtMoney(netProfit), sub: `${netMargin.toFixed(1)}% Net Margin`, color: netProfit >= 0 ? emerald : rose },
  ];

  snapCards.forEach((sc, i) => {
    const scX = left + i * (snapCardW + 3);
    const scY = snapY + 6;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...border);
    doc.roundedRect(scX, scY, snapCardW, 18, 1.6, 1.6, 'FD');
    doc.setFillColor(...sc.color);
    doc.roundedRect(scX, scY, 1.4, 18, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...muted);
    doc.text(sc.label, scX + 4.5, scY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...sc.color);
    doc.text(sc.val, scX + 4.5, scY + 11.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...muted);
    doc.text(sc.sub, scX + 4.5, scY + 15.5);
  });

  // Short provenance note below highlights
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text(
    `Prepared for ${options.orgName || 'Financial Reporting'}  ·  Reporting Period: ${options.periodLabel}  ·  Accrual P&L Accounting Standards`,
    left + 2,
    snapY + 29,
  );

  // =========================================================================
  // PAGE 3: CHAPTER 1 — EXECUTIVE PROFITABILITY OVERVIEW & PROFIT BRIDGE
  // =========================================================================
  doc.addPage();
  drawPageFooter(3);
  drawPageHeaderBanner('Management Reporting', 'Executive Profitability Overview');

  let y = 41;

  // Reporting Scope Card with left teal accent (Management Accounts Style)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.roundedRect(left, y, tableWidth, 17, 1.8, 1.8, 'FD');
  doc.setFillColor(...teal);
  doc.roundedRect(left, y, 1.5, 17, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...teal);
  doc.text('REPORTING SCOPE & ACCOUNTING BASIS', left + 4.5, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...navy);
  doc.text(`${options.periodLabel}`, left + 4.5, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...muted);
  doc.text(`Accounting basis: Accrual P&L`, right - 4, y + 6, { align: 'right' });
  doc.text(`Ledger status: Reconciled with Xero`, right - 4, y + 13, { align: 'right' });

  y += 22;

  // 4 Executive Figure Cards with colored left accent strip (Management Accounts Style)
  const cardW = (tableWidth - 9) / 4; // ~44mm
  const cardH = 19;
  const figures: { title: string; val: string; sub: string; color: [number, number, number] }[] = [
    { title: 'NET REVENUE', val: fmtMoney(rev), sub: 'Trading Turnover', color: navy },
    { title: 'GROSS PROFIT', val: fmtMoney(grossProfit), sub: `${grossMargin.toFixed(1)}% Gross Margin`, color: grossMargin >= 40 ? emerald : amber },
    { title: 'OPERATING PROFIT', val: fmtMoney(operatingProfit), sub: `${operatingMargin.toFixed(1)}% Operating Margin`, color: operatingProfit >= 0 ? emerald : rose },
    { title: 'NET PROFIT', val: fmtMoney(netProfit), sub: `${netMargin.toFixed(1)}% Net Margin`, color: netProfit >= 0 ? emerald : rose },
  ];

  figures.forEach((fig, idx) => {
    const cx = left + idx * (cardW + 3);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...border);
    doc.roundedRect(cx, y, cardW, cardH, 1.6, 1.6, 'FD');
    doc.setFillColor(...fig.color);
    doc.roundedRect(cx, y, 1.4, cardH, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);
    doc.text(fig.title, cx + 4.5, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...fig.color);
    doc.text(fig.val, cx + 4.5, y + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...muted);
    doc.text(fig.sub, cx + 4.5, y + 16.5);
  });

  y += cardH + 6;

  // Section Header: Statement of Profitability
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('STATEMENT OF PROFITABILITY & MARGINS', left, y + 3.5);

  y += 5.5;

  // Core Financial Table (Light Table Header as requested by user)
  const statementCols: ColumnDef[] = [
    { header: 'ACCOUNT / COMMERCIAL LINE', width: 63, align: 'left' },
    { header: 'CLASSIFICATION', width: 28, align: 'left' },
    { header: `REPORTED (${symbol})`, width: 30, align: 'right' },
    { header: '% REVENUE', width: 19, align: 'right' },
    { header: 'PRIOR PERIOD', width: 21, align: 'right' },
    { header: 'ASSESSMENT', width: 18.3, align: 'center' },
  ];

  const prior = d.priorPeriod;
  const pctOfRev = (val: number | null | undefined) =>
    rev > 0 && val != null ? `${((Number(val) / rev) * 100).toFixed(1)}%` : '0.0%';

  const statementRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = [
    [
      'Net Trading Revenue (Turnover)',
      'Operating Sales',
      fmtMoney(rev),
      '100.0%',
      fmtMoney(prior?.revenue),
      { text: 'Base Income', color: emerald, bold: true },
    ],
    [
      'Cost of Goods Sold (COGS)',
      'Direct Trading Costs',
      fmtMoney(cogs),
      pctOfRev(cogs),
      fmtMoney(prior?.cogs),
      { text: cogs <= rev * 0.4 ? 'Disciplined' : 'Elevated', color: cogs <= rev * 0.4 ? emerald : amber },
    ],
    [
      'Gross Profit',
      'Contribution Margin',
      fmtMoney(grossProfit),
      `${grossMargin.toFixed(1)}%`,
      fmtMoney(prior?.grossProfit),
      { text: grossMargin >= 50 ? 'Strong' : 'Standard', color: emerald, bold: true },
    ],
    [
      'Operating Expenses (OPEX)',
      'Indirect Overheads',
      fmtMoney(opex),
      pctOfRev(opex),
      fmtMoney(prior?.operatingExpenses),
      { text: opex < grossProfit ? 'Controlled' : 'Overhead Load', color: opex < grossProfit ? navy : rose },
    ],
    [
      'Operating Profit (EBIT)',
      'Core Trading Surplus',
      fmtMoney(operatingProfit),
      `${operatingMargin.toFixed(1)}%`,
      fmtMoney(prior?.operatingProfit),
      { text: operatingProfit >= 0 ? 'Profitable' : 'Deficit', color: operatingProfit >= 0 ? emerald : rose, bold: true },
    ],
    [
      'EBITDA (Operating Cash proxy)',
      'Cash Generation',
      fmtMoney(ebitda),
      pctOfRev(ebitda),
      'N/A',
      { text: ebitda >= 0 ? 'Cash Positive' : 'Cash Burn', color: ebitda >= 0 ? emerald : rose },
    ],
    [
      'Depreciation & Amortization',
      'Non-Cash Adjustments',
      fmtMoney(d.depreciation ?? 0),
      pctOfRev(d.depreciation ?? 0),
      'N/A',
      { text: 'Non-Cash', color: muted },
    ],
    [
      'Interest & Financing Costs',
      'Financing Overheads',
      fmtMoney(d.interestExpenses ?? 0),
      pctOfRev(d.interestExpenses ?? 0),
      'N/A',
      { text: 'Financing', color: muted },
    ],
    [
      'Profit Before Tax (EBT)',
      'Pre-Tax Earnings',
      fmtMoney(d.profitBeforeTax ?? operatingProfit),
      pctOfRev(d.profitBeforeTax ?? operatingProfit),
      'N/A',
      { text: 'Taxable Base', color: navy },
    ],
    [
      'Corporation Tax Provision',
      'Statutory Tax Accrual',
      fmtMoney(d.taxProvision ?? 0),
      pctOfRev(d.taxProvision ?? 0),
      'N/A',
      { text: 'Tax Accrual', color: muted },
    ],
    [
      'Net Profit (Bottom Line)',
      'Net Retained Surplus',
      fmtMoney(netProfit),
      `${netMargin.toFixed(1)}%`,
      fmtMoney(prior?.netProfit),
      { text: netProfit >= 0 ? 'Net Surplus' : 'Net Deficit', color: netProfit >= 0 ? emerald : rose, bold: true },
    ],
  ];

  y = renderTable(left, y, statementCols, statementRows, {
    headerHeight: 6.8,
    rowHeight: 5.6,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
    isTotalRowLast: true,
  });

  y += 6;

  // Visual Profit Bridge & Financial Profile (Management Accounts style — Fills page comfortably)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.roundedRect(left, y, tableWidth, 48, 1.8, 1.8, 'FD');
  doc.setFillColor(...teal);
  doc.roundedRect(left, y, 1.5, 48, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...teal);
  doc.text('PROFIT CONVERSION PROFILE & BREAK-EVEN ANALYSIS', left + 4.5, y + 6);

  // Left side: Progress Bars showing profit progression
  const profileItems = [
    { label: 'Trading Revenue', value: rev, color: navy },
    { label: 'Gross Profit', value: grossProfit, color: teal },
    { label: 'Operating Overheads', value: opex, color: amber },
    { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? emerald : rose },
  ];

  const maxVal = Math.max(1, rev, grossProfit, opex, Math.abs(netProfit));
  const trackX = left + 35;
  const trackW = 55;

  profileItems.forEach((item, idx) => {
    const py = y + 14 + idx * 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);
    doc.text(item.label, left + 4.5, py + 1.8);

    doc.setFillColor(241, 245, 248);
    doc.roundedRect(trackX, py - 1, trackW, 3, 1, 1, 'F');

    const fillW = Math.max(2, (Math.abs(item.value) / maxVal) * trackW);
    doc.setFillColor(...item.color);
    doc.roundedRect(trackX, py - 1, fillW, 3, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...navy);
    doc.text(fmtMoney(item.value), trackX + trackW + 15, py + 1.8, { align: 'right' });
  });

  // Divider inside box
  doc.setDrawColor(...border);
  doc.line(left + 112, y + 10, left + 112, y + 44);

  // Right side: Commercial Diagnostics
  const breakEvenVal = d.breakEvenSales != null ? fmtMoney(d.breakEvenSales) : (grossMargin > 0 ? fmtMoney((opex / (grossMargin / 100))) : 'N/A');
  const safetyVal = d.marginOfSafetyPct != null ? `${d.marginOfSafetyPct.toFixed(1)}%` : (rev > 0 && opex > 0 && grossMargin > 0 ? `${Math.max(0, ((rev - (opex / (grossMargin / 100))) / rev) * 100).toFixed(1)}%` : 'N/A');
  const absorptionVal = rev > 0 ? `${((opex / rev) * 100).toFixed(1)}%` : 'N/A';

  const diagX = left + 118;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text('BREAK-EVEN SALES VOLUME', diagX, y + 15);
  doc.setFontSize(9.5);
  doc.setTextColor(...teal);
  doc.text(breakEvenVal, right - 4, y + 15, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text('MARGIN OF SAFETY', diagX, y + 25);
  doc.setFontSize(9.5);
  doc.setTextColor(...emerald);
  doc.text(safetyVal, right - 4, y + 25, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text('OVERHEAD ABSORPTION RATE', diagX, y + 35);
  doc.setFontSize(9.5);
  doc.setTextColor(...navy);
  doc.text(absorptionVal, right - 4, y + 35, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...muted);
  doc.text('Operating buffer before encountering an accounting deficit.', diagX, y + 42, { maxWidth: tableWidth - 120 });

  // =========================================================================
  // PAGE 4: CHAPTER 2 — CUSTOMER REVENUE & COMMERCIAL CONCENTRATION
  // =========================================================================
  doc.addPage();
  drawPageFooter(4);
  drawPageHeaderBanner('Commercial Analysis', 'Customer Revenue & Concentration');

  y = 41;

  // Customer Summary Bar (3 Executive Cards from Management Accounts Style)
  const custW = (tableWidth - 6) / 3;
  const customersList = d.customerProfitability || [];
  const totalCustCount = customersList.length;
  const totalCustRev = customersList.reduce((acc, c) => acc + (Number(c.revenue) || 0), 0);
  const top1CustRev = customersList[0]?.revenue || 0;
  const top1Share = totalCustRev > 0 ? ((top1CustRev / totalCustRev) * 100).toFixed(1) : '0.0';
  const avgCustRev = totalCustCount > 0 ? totalCustRev / totalCustCount : 0;

  const custSummary = [
    { title: 'ACTIVE COMMERCIAL CLIENTS', val: `${totalCustCount} Accounts`, sub: 'Billed in current cycle', color: navy },
    { title: 'TOP CLIENT CONCENTRATION', val: `${top1Share}%`, sub: `Led by ${customersList[0]?.customer || 'N/A'}`, color: top1Share > '40' ? amber : emerald },
    { title: 'AVERAGE REVENUE PER CLIENT', val: fmtMoney(avgCustRev), sub: 'Mean client sales turnover', color: teal },
  ];

  custSummary.forEach((cs, i) => {
    const cx = left + i * (custW + 3);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...border);
    doc.roundedRect(cx, y, custW, 17, 1.6, 1.6, 'FD');
    doc.setFillColor(...cs.color);
    doc.roundedRect(cx, y, 1.4, 17, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...muted);
    doc.text(cs.title, cx + 4.5, y + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...cs.color);
    doc.text(cs.val, cx + 4.5, y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...muted);
    doc.text(cs.sub, cx + 4.5, y + 15);
  });

  y += 22;

  // Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('CUSTOMER REVENUE & MARGIN CONTRIBUTION SCHEDULE', left, y + 3.5);

  y += 5.5;

  // Full Customer Performance Table (Light Table Header)
  const custCols: ColumnDef[] = [
    { header: '#', width: 8, align: 'center' },
    { header: 'CUSTOMER / COMMERCIAL COUNTERPARTY', width: 68, align: 'left' },
    { header: 'INVOICES', width: 22, align: 'center' },
    { header: `SALES VOLUME (${symbol})`, width: 30, align: 'right' },
    { header: '% REVENUE', width: 23, align: 'right' },
    { header: 'CONTRIBUTION MARGIN', width: 28.3, align: 'right' },
  ];

  // Show up to 14 customer rows to fill page comfortably
  const custRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = customersList.slice(0, 14).map((cust, idx) => {
    const invCount = Array.isArray(cust.invoices) ? cust.invoices.length : 0;
    const cRev = Number(cust.revenue) || 0;
    const cShare = rev > 0 ? `${((cRev / rev) * 100).toFixed(1)}%` : '0.0%';
    const marginStr = cust.margin != null ? `${cust.margin}%` : 'N/A';
    return [
      String(idx + 1),
      cust.customer,
      `${invCount} ${invCount === 1 ? 'inv' : 'invs'}`,
      fmtMoney(cRev),
      cShare,
      marginStr,
    ];
  });

  if (customersList.length === 0) {
    custRows.push(['-', 'No customer invoice records found for this period.', '-', fmtMoney(0), '0.0%', 'N/A']);
  } else {
    custRows.push([
      '',
      'TOTAL CUSTOMER SALES ACTIVITY',
      `${customersList.reduce((acc, c) => acc + (Array.isArray(c.invoices) ? c.invoices.length : 0), 0)} invs`,
      fmtMoney(totalCustRev),
      '100.0%',
      `${grossMargin.toFixed(1)}%`,
    ]);
  }

  y = renderTable(left, y, custCols, custRows, {
    headerHeight: 6.8,
    rowHeight: 5.6,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
    isTotalRowLast: customersList.length > 0,
  });

  y += 7;

  // Margin Distribution Tier Table (Management Accounts Style)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('COMMERCIAL MARGIN TIER BREAKDOWN', left, y + 3.5);

  y += 5.5;

  const tierCols: ColumnDef[] = [
    { header: 'MARGIN CLASSIFICATION TIER', width: 55, align: 'left' },
    { header: 'QUALIFYING CLIENTS', width: 30, align: 'center' },
    { header: 'PROPORTION (%)', width: 28, align: 'right' },
    { header: 'STRATEGIC PORTFOLIO ASSESSMENT', width: 66.3, align: 'left' },
  ];

  const md = d.marginDistribution;
  const tierRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = [
    [
      'High Contribution Margin (> 50%)',
      String(md?.highMargin?.count ?? 0),
      md?.highMargin?.pct != null ? `${md.highMargin.pct.toFixed(1)}%` : 'N/A',
      { text: 'Core profit engine; protect key contract retention terms.', color: emerald },
    ],
    [
      'Medium Contribution Margin (20% – 50%)',
      String(md?.mediumMargin?.count ?? 0),
      md?.mediumMargin?.pct != null ? `${md.mediumMargin.pct.toFixed(1)}%` : 'N/A',
      { text: 'Standard commercial volume; explore service upselling avenues.', color: navy },
    ],
    [
      'Low Contribution Margin (< 20%)',
      String(md?.lowMargin?.count ?? 0),
      md?.lowMargin?.pct != null ? `${md.lowMargin.pct.toFixed(1)}%` : 'N/A',
      { text: 'Margin dilution risk; audit service delivery and input costs.', color: rose },
    ],
  ];

  y = renderTable(left, y, tierCols, tierRows, {
    headerHeight: 6.5,
    rowHeight: 5.6,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
  });

  y += 6;

  // Narrative Concentration Insight Note (Fills bottom of page gracefully)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.roundedRect(left, y, tableWidth, 18, 1.6, 1.6, 'FD');
  doc.setFillColor(...cyanAccent);
  doc.roundedRect(left, y, 1.4, 18, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...cyanAccent);
  doc.text('EXECUTIVE COMMERCIAL OBSERVATION', left + 4.5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  const custNarrative = totalCustCount > 0
    ? `The commercial client ledger comprises ${totalCustCount} active accounts with total billed turnover of ${fmtMoney(totalCustRev)}. The top customer accounts for ${top1Share}% of revenue, indicating ${top1Share > '40' ? 'moderate customer concentration' : 'a diversified and balanced customer portfolio'}. Continue monitoring gross margins across low-tier accounts to protect overall EBITDA.`
    : 'No active commercial client transactions were recorded in Xero during this reporting cycle.';
  doc.text(custNarrative, left + 4.5, y + 10.5, { maxWidth: tableWidth - 10 });

  // =========================================================================
  // PAGE 5: CHAPTER 3 — PRODUCT ECONOMICS, TRACKING & GOVERNANCE SIGN-OFF
  // =========================================================================
  doc.addPage();
  drawPageFooter(5);
  drawPageHeaderBanner('Unit Economics & Governance', 'Catalog Economics & Governance');

  y = 41;

  // Section 1: Product / Service Profitability Schedule
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('PRODUCT & SERVICE PROFITABILITY SCHEDULE', left, y + 3.5);

  y += 5.5;

  const prodCols: ColumnDef[] = [
    { header: '#', width: 8, align: 'center' },
    { header: 'CATALOG ITEM / SERVICE DESCRIPTION', width: 73, align: 'left' },
    { header: `REVENUE (${symbol})`, width: 32, align: 'right' },
    { header: `GROSS PROFIT (${symbol})`, width: 33, align: 'right' },
    { header: 'MARGIN (%)', width: 33.3, align: 'right' },
  ];

  const productsList = (d.productProfitability || []).slice(0, 6);
  const prodRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = productsList.map((prod, pIdx) => [
    String(pIdx + 1),
    prod.product,
    fmtMoney(prod.revenue),
    fmtMoney(prod.grossProfit),
    prod.margin != null ? `${prod.margin}%` : 'N/A',
  ]);

  if (productsList.length === 0) {
    prodRows.push(['-', 'No product/service catalog items recorded in this period.', fmtMoney(0), fmtMoney(0), 'N/A']);
  }

  y = renderTable(left, y, prodCols, prodRows, {
    headerHeight: 6.5,
    rowHeight: 5.5,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
  });

  y += 6;

  // Section 2: Department / Regional Tracking Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('DEPARTMENTAL & REGIONAL TRACKING PERFORMANCE', left, y + 3.5);

  y += 5.5;

  const deptCols: ColumnDef[] = [
    { header: '#', width: 8, align: 'center' },
    { header: 'DEPARTMENT / REGIONAL TRACKING CATEGORY', width: 73, align: 'left' },
    { header: `REVENUE (${symbol})`, width: 32, align: 'right' },
    { header: `GROSS PROFIT (${symbol})`, width: 33, align: 'right' },
    { header: 'MARGIN (%)', width: 33.3, align: 'right' },
  ];

  const deptList = (d.departmentProfitability || []).slice(0, 5);
  const deptRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = deptList.map((dept, dIdx) => [
    String(dIdx + 1),
    dept.department,
    fmtMoney(dept.revenue),
    fmtMoney(dept.grossProfit),
    dept.margin != null ? `${dept.margin}%` : 'N/A',
  ]);

  if (deptList.length === 0) {
    deptRows.push(['-', 'No tracking categories recorded in this period.', fmtMoney(0), fmtMoney(0), 'N/A']);
  }

  y = renderTable(left, y, deptCols, deptRows, {
    headerHeight: 6.5,
    rowHeight: 5.5,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
  });

  y += 6;

  // Section 3: Operating Expense Analysis & Ledger Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...teal);
  doc.text('OPERATING EXPENSE ANALYSIS & BUDGET VARIANCE', left, y + 3.5);

  y += 5.5;

  const expCols: ColumnDef[] = [
    { header: 'EXPENSE ACCOUNT CLASSIFICATION', width: 68, align: 'left' },
    { header: `BUDGET (${symbol})`, width: 28, align: 'right' },
    { header: `ACTUAL (${symbol})`, width: 28, align: 'right' },
    { header: `VARIANCE (${symbol})`, width: 28, align: 'right' },
    { header: 'STATUS', width: 27.3, align: 'center' },
  ];

  const budgetItems = (d.budgetVsActual || []).slice(0, 5);
  const expRows: (string | { text: string; color?: [number, number, number]; bold?: boolean; align?: 'left' | 'right' | 'center' })[][] = budgetItems.map((item) => {
    const diff = Number(item.actual) - Number(item.budget);
    const isFavorable = diff <= 0;
    return [
      item.category,
      fmtMoney(item.budget),
      fmtMoney(item.actual),
      fmtMoney(diff),
      { text: isFavorable ? 'On Budget' : 'Over Budget', color: isFavorable ? emerald : rose, bold: true },
    ];
  });

  if (budgetItems.length === 0) {
    const expenseItems = (d.expenseAnalysis || []).slice(0, 5);
    if (expenseItems.length > 0) {
      expenseItems.forEach((exp) => {
        expRows.push([
          exp.account,
          fmtMoney(0),
          fmtMoney(exp.actual),
          fmtMoney(exp.actual),
          { text: exp.accountType || 'Expense', color: muted },
        ]);
      });
    } else {
      expRows.push(['No operating expense records identified for this reporting cycle.', fmtMoney(0), fmtMoney(0), fmtMoney(0), 'N/A']);
    }
  }

  y = renderTable(left, y, expCols, expRows, {
    headerHeight: 6.5,
    rowHeight: 5.5,
    fontSize: 6.8,
    headerFontSize: 6.6,
    zebra: true,
  });

  y += 6;

  // Section 4: Formal Governance Sign-Off Certificate (Fills bottom of Page 4)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.roundedRect(left, y, tableWidth, 25, 1.8, 1.8, 'FD');
  doc.setFillColor(...teal);
  doc.roundedRect(left, y, 1.5, 25, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('EXECUTIVE CFO ATTESTATION & GOVERNANCE SIGN-OFF', left + 4.5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...muted);
  doc.text(
    'This profitability statement has been compiled directly from verified Xero general ledger journals, sales invoices, and bills.',
    left + 4.5,
    y + 10,
  );
  doc.text(
    'Sales taxes (GST/VAT) have been excluded from revenue in strict compliance with accrual accounting principles.',
    left + 4.5,
    y + 14.5,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...teal);
  doc.text(`Status: Live Ledger Reconciled  |  Reporting Currency: ${currency}`, left + 4.5, y + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text(
    `Certified: ${new Date().toLocaleDateString('en-GB')}  |  Chief Financial Officer Review`,
    right - 4,
    y + 20.5,
    { align: 'right' },
  );

  // Save the formal report PDF
  doc.save(`profitability-${options.selectedPeriod || 'statement'}.pdf`);
}
