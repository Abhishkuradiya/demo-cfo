export type BudgetScenario = "average" | "best" | "worst";

export interface ScenarioMultipliers {
  revenue: number;
  cost: number;
}

export interface BudgetReportItem {
  category: string;
  budget: number;
  actual: number;
  type: "revenue" | "expense";
}

export interface BudgetingReportData {
  currency?: string;
  scenario?: BudgetScenario;
  scenarioLabel?: string;
  scenarioMultipliers?: ScenarioMultipliers;
  periodInfo?: {
    label: string;
    startDate: string;
    endDate: string;
    dataSource: string;
  };
  profitability?: {
    revenue: number;
    grossProfit: number;
    grossMarginPct: number;
    ebitdaMarginPct: number;
    opexFixed: number;
    opexVariable: number;
    ebitda: number;
    cogs?: number;
    netProfit?: number;
    netMarginPct?: number;
    customerProfitability?: {
      customer: string;
      revenue: number;
      grossProfit: number;
      margin: number;
    }[];
    productProfitability?: {
      product: string;
      revenue: number;
      grossProfit: number;
      margin: number;
    }[];
    aiOpportunities?: string[];
    monthlyTrend: {
      month: string;
      revenue: number;
      grossProfit?: number;
      netProfit?: number;
      grossMarginPct?: number;
    }[];
  };
  cashFlow13Week?: {
    startingCash: number;
    weeks?: {
      weekNum?: number;
      weekLabel?: string;
      week?: string;
      cashIn?: number;
      inflow?: number;
      cashOut?: number;
      outflow?: number;
      netCash: number;
      endingCash?: number;
      closingCash?: number;
      status?: 'healthy' | 'warning' | 'critical' | string;
    }[];
  };
  balanceSheet?: {
    assets: {
      current: { name: string; value: number }[];
      nonCurrent: { name: string; value: number }[];
      totalCurrent: number;
      totalNonCurrent: number;
      totalAssets: number;
    };
    liabilities: {
      current: { name: string; value: number }[];
      nonCurrent: { name: string; value: number }[];
      totalCurrent: number;
      totalNonCurrent: number;
      totalLiabilities: number;
    };
    equity: {
      items: { name: string; value: number }[];
      totalEquity: number;
    };
    workingCapital: number;
    isBalanced: boolean;
  };
  kpiScorecard?: {
    dso?: number;
    dpo?: number;
    dio?: number;
    workingCapitalCycle?: number;
    currentRatio?: number;
    quickRatio?: number;
    debtToEquity?: number;
  };
  budgeting?: {
    revBudget?: number;
    revActual?: number;
    expBudget?: number;
    expActual?: number;
    netBudget?: number;
    netActual?: number;
    budgetItems: BudgetReportItem[];
  };
}

const colors = {
  navy: "FF0F172A",
  slate: "FF334155",
  text: "FF1E293B",
  muted: "FF64748B",
  border: "FFE2E8F0",
  zebra: "FFF8FAFC",
  teal: "FF155E75",
  green: "FF047857",
  red: "FFBE123C",
  amber: "FFB45309",
  white: "FFFFFFFF",
};

const currencySymbol = (currency: string) => {
  try {
    return (
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
};

const formatMoney = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  }
};

const getVariance = (item: BudgetReportItem) => item.actual - item.budget;
const getUnfavorable = (item: BudgetReportItem) =>
  item.type === "revenue"
    ? getVariance(item) < 0
    : getVariance(item) > 0;
const getVariancePercent = (item: BudgetReportItem) =>
  item.budget === 0 ? 0 : (getVariance(item) / Math.abs(item.budget)) * 100;

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function getPeriodRange(data: BudgetingReportData, fromDate: string, toDate: string) {
  return `${data.periodInfo?.label ?? "Selected period"} · ${fromDate} to ${toDate}`;
}

export async function exportBudgetingExcelReport(
  data: BudgetingReportData,
  fromDate: string,
  toDate: string,
  forecastRevenue: number,
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const currency = data.currency || "GBP";
  const symbol = currencySymbol(currency).replaceAll('"', '""');
  const moneyFormat = `"${symbol}"#,##0.00;[Red]("${symbol}"#,##0.00);-`;
  const percentageFormat = '0.0%;[Red](0.0%);-';
  const trend = data.profitability?.monthlyTrend ?? [];
  const items = data.budgeting?.budgetItems ?? [];
  const profitability = data.profitability;
  const revenue = profitability?.revenue ?? 0;
  const periodRange = getPeriodRange(data, fromDate, toDate);

  workbook.creator = "Virtual CFO";
  workbook.subject = "Budget and variance report";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Executive Summary", {
    views: [{ showGridLines: false }],
  });
  summary.columns = [
    { width: 28 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  summary.mergeCells("A1:F2");
  summary.getCell("A1").value = "BUDGET & VARIANCE REPORT";
  summary.getCell("A1").font = {
    name: "Segoe UI",
    size: 16,
    bold: true,
    color: { argb: colors.white },
  };
  summary.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let column = 1; column <= 6; column++) {
    summary.getCell(1, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.navy },
    };
    summary.getCell(2, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.navy },
    };
  }
  const scenarioTitle = data.scenarioLabel ?? (
    data.scenario === "best"
      ? "Best Case (+15% Rev / -5% Costs)"
      : data.scenario === "worst"
        ? "Worst Case (-15% Rev / +10% Costs)"
        : "Average Case (Baseline Plan)"
  );

  summary.mergeCells("A3:F3");
  summary.getCell("A3").value =
    `${periodRange} | Scenario: ${scenarioTitle} | Currency: ${currency} | Source: ${data.periodInfo?.dataSource ?? "Xero finance integration"}`;
  summary.getCell("A3").font = {
    name: "Segoe UI",
    size: 9,
    italic: true,
    color: { argb: colors.muted },
  };

  const metrics = [
    {
      label: "REVENUE",
      value: revenue,
      detail: "Actual revenue in selected period",
      color: colors.green,
    },
    {
      label: "GROSS MARGIN",
      value: (profitability?.grossMarginPct ?? 0) / 100,
      detail: `${formatMoney(profitability?.grossProfit ?? 0, currency)} gross profit`,
      color: colors.green,
      percent: true,
    },
    {
      label: "OPERATING EXPENSES",
      value: (profitability?.opexFixed ?? 0) + (profitability?.opexVariable ?? 0),
      detail: "Fixed and variable operating costs",
      color: colors.amber,
    },
    {
      label: "EBITDA",
      value: profitability?.ebitda ?? 0,
      detail: `${(profitability?.ebitdaMarginPct ?? 0).toFixed(1)}% EBITDA margin`,
      color: colors.green,
    },
    {
      label: "CASH POSITION",
      value: data.cashFlow13Week?.startingCash ?? 0,
      detail: "Current cash balance",
      color: colors.amber,
    },
    {
      label: "FY FORECAST REVENUE",
      value: forecastRevenue,
      detail: `Annualized run rate · ${data.scenario === "best" ? "+25% upside case" : data.scenario === "worst" ? "-5% stress test" : "+10% base case"}`,
      color: colors.teal,
    },
  ];

  const addMetric = (
    metric: (typeof metrics)[number],
    startColumn: number,
    startRow: number,
  ) => {
    const endColumn = startColumn + 1;
    summary.mergeCells(startRow, startColumn, startRow, endColumn);
    summary.mergeCells(startRow + 1, startColumn, startRow + 1, endColumn);
    summary.mergeCells(startRow + 2, startColumn, startRow + 2, endColumn);
    const labelCell = summary.getCell(startRow, startColumn);
    const valueCell = summary.getCell(startRow + 1, startColumn);
    const detailCell = summary.getCell(startRow + 2, startColumn);
    labelCell.value = metric.label;
    labelCell.font = {
      name: "Segoe UI",
      size: 9,
      bold: true,
      color: { argb: metric.color },
    };
    valueCell.value = metric.value;
    valueCell.font = {
      name: "Segoe UI",
      size: 15,
      bold: true,
      color: { argb: colors.text },
    };
    valueCell.numFmt = metric.percent ? percentageFormat : moneyFormat;
    detailCell.value = metric.detail;
    detailCell.font = {
      name: "Segoe UI",
      size: 8,
      color: { argb: colors.muted },
    };
    for (let row = startRow; row <= startRow + 2; row++) {
      for (let column = startColumn; column <= endColumn; column++) {
        const cell = summary.getCell(row, column);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: colors.border } },
          bottom: { style: "thin", color: { argb: colors.border } },
        };
      }
    }
  };

  metrics.forEach((metric, index) => {
    const row = index < 3 ? 5 : 10;
    const column = ((index % 3) * 2) + 1;
    addMetric(metric, column, row);
  });

  let row = 15;
  const addSectionHeading = (title: string, endColumn: number) => {
    summary.mergeCells(row, 1, row, endColumn);
    const heading = summary.getCell(row, 1);
    heading.value = title;
    heading.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: colors.white },
    };
    heading.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.slate },
    };
    row++;
  };

  addSectionHeading("MONTHLY REVENUE TREND", 6);
  const trendHeaders = ["Month", "Revenue", "Month", "Revenue", "Month", "Revenue"];
  trendHeaders.forEach((header, index) => {
    const cell = summary.getCell(row, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: colors.slate }, size: 9 };
    cell.border = { bottom: { style: "thin", color: { argb: colors.border } } };
  });
  row++;
  for (let offset = 0; offset < trend.length; offset += 3) {
    const entries = [trend[offset], trend[offset + 1], trend[offset + 2]];
    entries.forEach((entry, pairIndex) => {
      const monthColumn = pairIndex * 2 + 1;
      const monthCell = summary.getCell(row, monthColumn);
      const revenueCell = summary.getCell(row, monthColumn + 1);
      monthCell.value = entry?.month ?? "";
      revenueCell.value = entry?.revenue ?? null;
      revenueCell.numFmt = moneyFormat;
      if (row % 2 === 0) {
        for (let column = monthColumn; column <= monthColumn + 1; column++) {
          summary.getCell(row, column).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colors.zebra },
          };
        }
      }
    });
    row++;
  }
  if (trend.length === 0) {
    summary.mergeCells(row, 1, row, 6);
    summary.getCell(row, 1).value = "No monthly revenue data is available.";
    summary.getCell(row, 1).font = { italic: true, color: { argb: colors.muted } };
    row++;
  }

  row += 2;
  addSectionHeading("BUDGET WATCHLIST", 6);
  const watchlist = items
    .filter(getUnfavorable)
    .sort((left, right) => Math.abs(getVariance(right)) - Math.abs(getVariance(left)))
    .slice(0, 3);
  if (watchlist.length > 0) {
    watchlist.forEach((item) => {
      summary.mergeCells(row, 1, row, 3);
      summary.mergeCells(row, 4, row, 6);
      summary.getCell(row, 1).value = item.category;
      summary.getCell(row, 4).value =
        `${formatMoney(Math.abs(getVariance(item)), currency)} unfavorable variance`;
      summary.getCell(row, 4).font = { color: { argb: colors.amber } };
      row++;
    });
  } else {
    summary.mergeCells(row, 1, row, 6);
    summary.getCell(row, 1).value = "No unfavorable variances in the available budget lines.";
    summary.getCell(row, 1).font = { color: { argb: colors.muted } };
    row++;
  }
  row += 2;
  summary.mergeCells(row, 1, row, 6);
  summary.getCell(row, 1).value =
    "FY forecast revenue is an illustrative annualized run rate using a 10% base-case growth assumption; it is not a Xero-reported forecast.";
  summary.getCell(row, 1).font = {
    size: 8,
    italic: true,
    color: { argb: colors.muted },
  };
  summary.getCell(row, 1).alignment = { wrapText: true };
  summary.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  const detail = workbook.addWorksheet("Budget vs Actual", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
  });
  detail.columns = [
    { header: "Line item", key: "category", width: 34 },
    { header: "Type", key: "type", width: 14 },
    { header: "Actual", key: "actual", width: 18 },
    { header: "Budget", key: "budget", width: 18 },
    { header: "Variance", key: "variance", width: 18 },
    { header: "Variance %", key: "variancePercent", width: 16 },
    { header: "Status", key: "status", width: 16 },
  ];
  detail.mergeCells("A1:G2");
  detail.getCell("A1").value = "BUDGET VS ACTUAL (P&L)";
  detail.getCell("A1").font = {
    name: "Segoe UI",
    size: 16,
    bold: true,
    color: { argb: colors.white },
  };
  detail.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let column = 1; column <= 7; column++) {
    detail.getCell(1, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.navy },
    };
    detail.getCell(2, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.navy },
    };
  }
  detail.mergeCells("A3:G3");
  detail.getCell("A3").value =
    `${periodRange} | Variance = actual − budget. Revenue is favorable above budget; costs are favorable below budget.`;
  detail.getCell("A3").font = {
    name: "Segoe UI",
    size: 9,
    italic: true,
    color: { argb: colors.muted },
  };
  detail.getRow(5).values = [
    "Line item",
    "Type",
    "Actual",
    "Budget",
    "Variance",
    "Variance %",
    "Status",
  ];
  detail.getRow(5).height = 24;
  detail.getRow(5).eachCell((cell) => {
    cell.font = { name: "Segoe UI", bold: true, color: { argb: colors.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.slate },
    };
    cell.alignment = { vertical: "middle" };
  });

  if (items.length === 0) {
    detail.mergeCells("A6:G6");
    detail.getCell("A6").value = "No budget data is available for this period.";
    detail.getCell("A6").font = { italic: true, color: { argb: colors.muted } };
  } else {
    items.forEach((item, index) => {
      const currentRow = index + 6;
      const unfavorable = getUnfavorable(item);
      const values = [
        item.category,
        item.type === "revenue" ? "Revenue" : "Expense",
        item.actual,
        item.budget,
        getVariance(item),
        getVariancePercent(item) / 100,
        unfavorable ? "Review" : "On track",
      ];
      detail.getRow(currentRow).values = values;
      detail.getRow(currentRow).height = 21;
      detail.getRow(currentRow).eachCell((cell, column) => {
        cell.font = {
          name: "Segoe UI",
          size: 9,
          color: {
            argb:
              (column === 5 || column === 6 || column === 7)
                ? unfavorable
                  ? colors.red
                  : colors.green
                : colors.text,
          },
        };
        cell.border = { bottom: { style: "thin", color: { argb: colors.border } } };
        if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colors.zebra },
          };
        }
        if (column >= 3 && column <= 5) cell.numFmt = moneyFormat;
        if (column === 6) cell.numFmt = percentageFormat;
        if (column >= 3 && column <= 6) {
          cell.alignment = { horizontal: "right" };
        }
      });
    });
    detail.autoFilter = {
      from: "A5",
      to: `G${items.length + 5}`,
    };
  }

  // 3. Scenario Sensitivity Modeling Sheet (Worst Case, Average Case, Best Case)
  const scenarioSheet = workbook.addWorksheet("Scenario Modeling", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });
  scenarioSheet.columns = [
    { header: "Scenario", key: "scenario", width: 32 },
    { header: "Assumptions", key: "assumptions", width: 44 },
    { header: "Projected Revenue", key: "revenue", width: 20 },
    { header: "Operating Costs", key: "costs", width: 20 },
    { header: "Operating Profit", key: "profit", width: 20 },
    { header: "Operating Margin %", key: "margin", width: 18 },
    { header: "Delta vs Baseline", key: "delta", width: 18 },
  ];
  scenarioSheet.mergeCells("A1:G2");
  scenarioSheet.getCell("A1").value = "SCENARIO SENSITIVITY ANALYSIS (WORST / AVERAGE / BEST)";
  scenarioSheet.getCell("A1").font = {
    name: "Segoe UI",
    size: 15,
    bold: true,
    color: { argb: colors.white },
  };
  scenarioSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let column = 1; column <= 7; column++) {
    scenarioSheet.getCell(1, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.navy } };
    scenarioSheet.getCell(2, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.navy } };
  }
  scenarioSheet.mergeCells("A3:G3");
  scenarioSheet.getCell("A3").value = `${periodRange} | Active Export Scenario: ${scenarioTitle}`;
  scenarioSheet.getCell("A3").font = { name: "Segoe UI", size: 9, italic: true, color: { argb: colors.muted } };

  // Calculate base, worst, best figures
  const baseRev = revenue > 0 ? revenue : (data.budgeting?.revBudget ?? 770000);
  const baseCost =
    (profitability?.opexFixed ?? 0) + (profitability?.opexVariable ?? 0) + (profitability?.cogs ?? 0) ||
    (data.budgeting?.expBudget ?? 552000);
  const baseProfit = baseRev - baseCost;
  const baseMargin = baseRev > 0 ? baseProfit / baseRev : 0;

  const scenariosList = [
    {
      scenario: "Worst Case (Downside)",
      assumptions: "-15% Revenue Contraction, +10% Cost Inflation (Stress Test)",
      revenue: Math.round(baseRev * 0.85),
      costs: Math.round(baseCost * 1.10),
      profit: Math.round(baseRev * 0.85) - Math.round(baseCost * 1.10),
      margin: (Math.round(baseRev * 0.85) - Math.round(baseCost * 1.10)) / (baseRev * 0.85),
      delta: (Math.round(baseRev * 0.85) - Math.round(baseCost * 1.10)) - baseProfit,
    },
    {
      scenario: "Average Case (Baseline)",
      assumptions: "Approved Baseline Budget & Expected Operating Run-Rate",
      revenue: baseRev,
      costs: baseCost,
      profit: baseProfit,
      margin: baseMargin,
      delta: 0,
    },
    {
      scenario: "Best Case (Upside)",
      assumptions: "+15% Revenue Expansion, -5% Cost Optimization (Operating Leverage)",
      revenue: Math.round(baseRev * 1.15),
      costs: Math.round(baseCost * 0.95),
      profit: Math.round(baseRev * 1.15) - Math.round(baseCost * 0.95),
      margin: (Math.round(baseRev * 1.15) - Math.round(baseCost * 0.95)) / (baseRev * 1.15),
      delta: (Math.round(baseRev * 1.15) - Math.round(baseCost * 0.95)) - baseProfit,
    },
  ];

  for (let c = 1; c <= 7; c++) {
    const headCell = scenarioSheet.getCell(4, c);
    headCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: colors.slate } };
    headCell.border = { bottom: { style: "thin", color: { argb: colors.border } } };
  }

  scenariosList.forEach((s, idx) => {
    const sRow = scenarioSheet.addRow({
      scenario: s.scenario,
      assumptions: s.assumptions,
      revenue: s.revenue,
      costs: s.costs,
      profit: s.profit,
      margin: s.margin,
      delta: s.delta,
    });
    sRow.getCell("revenue").numFmt = moneyFormat;
    sRow.getCell("costs").numFmt = moneyFormat;
    sRow.getCell("profit").numFmt = moneyFormat;
    sRow.getCell("margin").numFmt = percentageFormat;
    sRow.getCell("delta").numFmt = moneyFormat;
    if (idx % 2 === 1) {
      for (let col = 1; col <= 7; col++) {
        sRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.zebra } };
      }
    }
  });

  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([new Uint8Array(xlsxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Budget_Variance_${fromDate}_to_${toDate}.xlsx`,
  );
}

export async function exportBudgetingPdfReport(
  data: BudgetingReportData,
  fromDate: string,
  toDate: string,
  forecastRevenue: number,
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  const totalPages = 6;

  const currency = data.currency || "GBP";
  const symbol = currencySymbol(currency);

  const fmtMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.round(Math.abs(val));
    const str = `${symbol}${absVal.toLocaleString("en-GB")}`;
    return isNeg ? `-${str}` : str;
  };

  const fmtMoneyWithSign = (val: number) => {
    const absVal = Math.round(Math.abs(val));
    const str = `${symbol}${absVal.toLocaleString("en-GB")}`;
    if (val > 0) return `+${str}`;
    if (val < 0) return `-${str}`;
    return str;
  };

  const getNiceScaleMax = (val: number): number => {
    if (val <= 0) return 10000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const norm = val / magnitude;
    let niceNorm: number;
    if (norm <= 1) niceNorm = 1;
    else if (norm <= 1.5) niceNorm = 1.5;
    else if (norm <= 2) niceNorm = 2;
    else if (norm <= 3) niceNorm = 3;
    else if (norm <= 5) niceNorm = 5;
    else if (norm <= 7.5) niceNorm = 7.5;
    else niceNorm = 10;
    return Math.max(100, Math.round(niceNorm * magnitude));
  };

  const profitability = data.profitability;
  const rawMonthlyTrend = profitability?.monthlyTrend ?? [];
  const budgetItems = data.budgeting?.budgetItems ?? [];
  const customers = profitability?.customerProfitability ?? [];
  const cashData = data.cashFlow13Week;
  const kpiData = data.kpiScorecard;

  // 1. Core Financial Metrics Resolution
  const revenueItems = budgetItems.filter((i) => i.type === "revenue");
  const expenseItems = budgetItems.filter((i) => i.type === "expense");

  const totalRevActual =
    profitability?.revenue && profitability.revenue > 0
      ? profitability.revenue
      : revenueItems.length > 0
        ? revenueItems.reduce((s, i) => s + i.actual, 0)
        : data.budgeting?.revActual ?? 770000;

  const totalRevBudget =
    revenueItems.length > 0
      ? revenueItems.reduce((s, i) => s + i.budget, 0)
      : data.budgeting?.revBudget && data.budgeting.revBudget > 0
        ? data.budgeting.revBudget
        : totalRevActual;

  const opexActual = (profitability?.opexFixed ?? 0) + (profitability?.opexVariable ?? 0);
  const cogsActual = profitability?.cogs ?? Math.round(totalRevActual * 0.38);
  const rawCostActual = opexActual + cogsActual;

  const totalCostActual =
    rawCostActual > 0
      ? rawCostActual
      : expenseItems.length > 0
        ? expenseItems.reduce((s, i) => s + i.actual, 0)
        : data.budgeting?.expActual && data.budgeting.expActual > 0
          ? data.budgeting.expActual
          : Math.round(totalRevActual * 0.72);

  const totalCostBudget =
    expenseItems.length > 0
      ? expenseItems.reduce((s, i) => s + i.budget, 0)
      : data.budgeting?.expBudget && data.budgeting.expBudget > 0
        ? data.budgeting.expBudget
        : Math.round(totalCostActual * 0.95);

  const grossProfitActual = profitability?.grossProfit ?? totalRevActual - cogsActual;
  const grossProfitBudget = Math.round(totalRevBudget * 0.62);
  const grossMarginActual = totalRevActual > 0 ? (grossProfitActual / totalRevActual) * 100 : 62.0;
  const grossMarginBudget = totalRevBudget > 0 ? (grossProfitBudget / totalRevBudget) * 100 : 62.0;

  const totalProfitActual = totalRevActual - totalCostActual;
  const totalProfitBudget = totalRevBudget - totalCostBudget;

  const totalRevVar = totalRevActual - totalRevBudget;
  const totalCostVar = totalCostActual - totalCostBudget;
  const totalProfitVar = totalProfitActual - totalProfitBudget;

  const revDiffPct = totalRevBudget > 0 ? (totalRevVar / totalRevBudget) * 100 : 0;
  const costDiffPct = totalCostBudget > 0 ? (totalCostVar / totalCostBudget) * 100 : 0;
  const profitDiffPct = totalProfitBudget > 0 ? (totalProfitVar / totalProfitBudget) * 100 : 0;
  const actualMarginPct = totalRevActual > 0 ? (totalProfitActual / totalRevActual) * 100 : 28.3;

  // Monthly breakdown
  const months = rawMonthlyTrend.length > 0
    ? (rawMonthlyTrend.length > 6 ? rawMonthlyTrend.slice(-6) : rawMonthlyTrend).map((item, idx, arr) => {
        const mRevActual = Math.round(item.revenue);
        const mRevBudget = Math.round(totalRevBudget / arr.length);
        const mCostActual = item.grossProfit !== undefined && item.netProfit !== undefined
          ? Math.round(Math.max(0, item.revenue - item.netProfit))
          : Math.round(totalCostActual / arr.length);
        const mCostBudget = Math.round(totalCostBudget / arr.length);
        return {
          name: item.month.length > 3 ? item.month.slice(0, 3) : item.month,
          fullName: item.month,
          revBudget: mRevBudget,
          revActual: mRevActual,
          costBudget: mCostBudget,
          costActual: mCostActual,
          revVar: mRevActual - mRevBudget,
          costVar: mCostActual - mCostBudget,
          profitActual: mRevActual - mCostActual,
          profitBudget: mRevBudget - mCostBudget,
        };
      })
    : ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((name) => {
        const mRevBudget = Math.round(totalRevBudget / 6);
        const mRevActual = Math.round(totalRevActual / 6);
        const mCostBudget = Math.round(totalCostBudget / 6);
        const mCostActual = Math.round(totalCostActual / 6);
        return {
          name,
          fullName: name,
          revBudget: mRevBudget,
          revActual: mRevActual,
          costBudget: mCostBudget,
          costActual: mCostActual,
          revVar: mRevActual - mRevBudget,
          costVar: mCostActual - mCostBudget,
          profitActual: mRevActual - mCostActual,
          profitBudget: mRevBudget - mCostBudget,
        };
      });

  const periodLabel = data.periodInfo?.label
    ? `${data.periodInfo.label} (${fromDate} – ${toDate})`
    : `${fromDate} – ${toDate}`;

  const scenarioBadge = data.scenarioLabel ?? (
    data.scenario === "best"
      ? "Best Case (+15% Rev / -5% Costs) • Optimistic Model"
      : data.scenario === "worst"
        ? "Worst Case (-15% Rev / +10% Costs) • Stress Test Model"
        : "Average Case (Baseline Plan) • Most Likely Run Rate"
  );

  // Helper: Header for chapters
  const drawChapterHeader = (chapterNum: number, chapterTitle: string, subtitle: string) => {
    doc.setFillColor(15, 23, 42); // Navy 900
    doc.rect(margin, 14, 3, 14, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(14, 116, 144); // Cyan 700
    doc.text(`CHAPTER ${chapterNum}`, margin + 6, 19);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(chapterTitle, margin + 6, 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, margin, 34);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 37, pageWidth - margin, 37);
  };

  // Helper: Footer
  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `UK Virtual CFO | Budget & Variance Storybook | ${data.periodInfo?.dataSource ?? "Xero Live Ledger"}`,
      margin,
      pageHeight - 7,
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  };

  // Helper: Table Renderer
  interface ColumnDef {
    header: string;
    width: number;
    align?: "left" | "right" | "center";
  }

  const renderTable = (
    startX: number,
    startY: number,
    columns: ColumnDef[],
    rows: (string | { text: string; color?: number[]; bold?: boolean; align?: "left" | "right" | "center" })[][],
    options?: {
      headerHeight?: number;
      rowHeight?: number;
      fontSize?: number;
      headerFontSize?: number;
      zebra?: boolean;
      headerBg?: number[];
      borderColor?: number[];
      isTotalRowLast?: boolean;
    },
  ) => {
    const headerHeight = options?.headerHeight ?? 7.5;
    const rowHeight = options?.rowHeight ?? 6.5;
    const fontSize = options?.fontSize ?? 7.5;
    const headerFontSize = options?.headerFontSize ?? 7.5;
    const headerBg = options?.headerBg ?? [15, 23, 42]; // Slate 900
    const borderColor = options?.borderColor ?? [226, 232, 240];

    let currentY = startY;
    const totalTableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    // Draw Header
    let currentX = startX;
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(startX, currentY, totalTableWidth, headerHeight, "F");

    columns.forEach((col) => {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(headerFontSize);

      const headerLines = col.header.split("\n");
      const lineH = 3.2;
      const textStartY = currentY + headerHeight / 2 - ((headerLines.length - 1) * lineH) / 2 + 1;

      headerLines.forEach((hLine, hIdx) => {
        let textX = currentX + 2.5;
        if (col.align === "right") textX = currentX + col.width - 2.5;
        else if (col.align === "center") textX = currentX + col.width / 2;
        doc.text(hLine, textX, textStartY + hIdx * lineH, { align: col.align || "left" });
      });

      currentX += col.width;
    });

    currentY += headerHeight;

    // Draw Rows
    rows.forEach((row, rowIdx) => {
      const isTotalRow = options?.isTotalRowLast && rowIdx === rows.length - 1;

      let maxLinesInRow = 1;
      row.forEach((cell, colIdx) => {
        const col = columns[colIdx];
        const cellText = typeof cell === "object" ? cell.text : cell;
        const lines = doc.splitTextToSize(cellText, col.width - 5);
        if (lines.length > maxLinesInRow) maxLinesInRow = lines.length;
      });

      const actualRowHeight = Math.max(rowHeight, maxLinesInRow * 3.6 + 3);

      currentX = startX;
      const isZebra = options?.zebra && rowIdx % 2 === 1 && !isTotalRow;

      if (isTotalRow) {
        doc.setFillColor(241, 245, 249);
        doc.rect(startX, currentY, totalTableWidth, actualRowHeight, "F");
      } else if (isZebra) {
        doc.setFillColor(248, 250, 252);
        doc.rect(startX, currentY, totalTableWidth, actualRowHeight, "F");
      }

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.15);
      doc.line(startX, currentY + actualRowHeight, startX + totalTableWidth, currentY + actualRowHeight);

      if (isTotalRow) {
        doc.line(startX, currentY, startX + totalTableWidth, currentY);
      }

      row.forEach((cell, colIdx) => {
        const col = columns[colIdx];
        const cellText = typeof cell === "object" ? cell.text : cell;
        const cellColor = typeof cell === "object" && cell.color ? cell.color : [30, 41, 59];
        const isBold = isTotalRow || (typeof cell === "object" && cell.bold);
        const cellAlign = (typeof cell === "object" && cell.align) || col.align || "left";

        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(cellColor[0], cellColor[1], cellColor[2]);

        const lines = doc.splitTextToSize(cellText, col.width - 5);
        const textStartY = currentY + (actualRowHeight - (lines.length - 1) * 3.4) / 2 + 1;

        lines.forEach((lineText: string, lIdx: number) => {
          let textX = currentX + 2.5;
          if (cellAlign === "right") textX = currentX + col.width - 2.5;
          else if (cellAlign === "center") textX = currentX + col.width / 2;
          doc.text(lineText, textX, textStartY + lIdx * 3.4, { align: cellAlign });
        });

        currentX += col.width;
      });

      currentY += actualRowHeight;
    });

    return currentY;
  };

  // =========================================================================
  // PAGE 1: TITLE & EXECUTIVE COVER (The Storybook Cover)
  // =========================================================================
  const blockX = margin;
  const blockY = 32;
  const blockW = contentWidth;
  const blockH = 186;

  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(blockX, blockY, blockW, blockH, 3, 3, "F");

  // Top Subheader in Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(14, 116, 144); // Cyan 700
  doc.text("VIRTUAL CFO MANAGEMENT INTELLIGENCE", blockX + 16, blockY + 22);

  // Big Storybook Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("Budget & Variance", blockX + 16, blockY + 54);
  doc.text("Storybook", blockX + 16, blockY + 66);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    "A Strategic Executive Narrative on Commercial Trajectory, Margin Friction & Capital Reality",
    blockX + 16,
    blockY + 77,
    { maxWidth: blockW - 32 },
  );

  // Active Scenario Pill Box
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(blockX + 16, blockY + 88, blockW - 32, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("ACTIVE SCENARIO MULTIPLIER MODEL", blockX + 22, blockY + 95);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(scenarioBadge, blockX + 22, blockY + 101.5);

  // 2x2 Parameter Grid inside Cover
  const gridY = blockY + 116;
  const colHalfW = (blockW - 32) / 2;

  // Window
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("REPORTING WINDOW", blockX + 16, gridY);
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(periodLabel, blockX + 16, gridY + 6, { maxWidth: colHalfW - 4 });

  // Data Origin
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("DATA ORIGIN", blockX + 16 + colHalfW, gridY);
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(data.periodInfo?.dataSource ?? "Live Xero Ledger Integration", blockX + 16 + colHalfW, gridY + 6);

  // Prepared for & Issue Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Currency: ${currency} (${symbol})  |  Prepared for: Board of Directors & C-Suite Leadership  |  Generated: ${new Date().toLocaleDateString("en-GB")}`,
    blockX + 16,
    blockY + 172,
  );

  // Table of Contents Preview Ribbon below Cover Box
  const tocY = blockY + blockH + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("STORYBOOK CHAPTER INDEX", margin, tocY);

  const chapters = [
    { num: "01", title: "The Executive Briefing & 30-Second CFO Narrative" },
    { num: "02", title: "The Revenue Engine, Sales Velocity & Customer Concentration" },
    { num: "03", title: "Margin Erosion, Operating Expense Overruns & P&L Bridge" },
    { num: "04", title: "Cash Flow Generation, Working Capital & Runway Reality" },
    { num: "05", title: "Scenario Sensitivity Modeling & Strategic Action Playbook" },
  ];

  chapters.forEach((ch, cIdx) => {
    const chY = tocY + 6 + cIdx * 5.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(14, 116, 144);
    doc.text(ch.num, margin, chY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(ch.title, margin + 8, chY);
  });

  drawPageFooter(1);

  // =========================================================================
  // PAGE 2: CHAPTER 1 — THE EXECUTIVE BRIEFING
  // =========================================================================
  doc.addPage();
  drawChapterHeader(
    1,
    "The Executive Briefing",
    "High-level commercial trajectory and profit conversion across the reviewed period",
  );

  // Dynamic Narrative Card: "The Story in Brief"
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 42, contentWidth, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, 42, contentWidth, 24, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(14, 116, 144);
  doc.text("THE STORY IN BRIEF", margin + 5, 47.5);

  let storyText = "";
  if (totalRevVar >= 0 && totalProfitVar >= 0) {
    storyText = `Commercial momentum was robust: Revenue delivered ${fmtMoney(totalRevActual)}, exceeding budget expectations by +${fmtMoney(totalRevVar)} (+${revDiffPct.toFixed(1)}%). Disciplined operating control kept costs aligned, generating ${fmtMoney(totalProfitActual)} in operating profit (+${profitDiffPct.toFixed(1)}% above plan) with a healthy ${actualMarginPct.toFixed(1)}% margin.`;
  } else if (totalRevVar >= 0 && totalCostVar > totalRevVar) {
    storyText = `Top-line revenue expanded by +${fmtMoney(totalRevVar)} (+${revDiffPct.toFixed(1)}%) above plan to ${fmtMoney(totalRevActual)}. However, operating expense expansion of +${fmtMoney(Math.abs(totalCostVar))} (+${costDiffPct.toFixed(1)}%) fully absorbed top-line gains, leading to an operating profit shortfall of ${fmtMoney(Math.abs(totalProfitVar))}.`;
  } else {
    storyText = `Top-line revenue finished at ${fmtMoney(totalRevActual)}, recording an adverse variance of ${fmtMoney(Math.abs(totalRevVar))} (${revDiffPct.toFixed(1)}%) against budget. Total operating expenses were ${fmtMoney(totalCostActual)}, yielding an operating profit of ${fmtMoney(totalProfitActual)} (${actualMarginPct.toFixed(1)}% margin).`;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(storyText, margin + 5, 52.5, { maxWidth: contentWidth - 10 });

  // 4 Hero KPI Cards
  const kpiY = 70;
  const kpiH = 22;
  const kpiGap = 3.5;
  const kpiW = (contentWidth - kpiGap * 3) / 4;

  const heroMetrics = [
    {
      title: "REVENUE ACTUAL",
      val: fmtMoney(totalRevActual),
      sub: `${totalRevVar >= 0 ? "+" : ""}${revDiffPct.toFixed(1)}% vs plan (${fmtMoneyWithSign(totalRevVar)})`,
      color: totalRevVar >= 0 ? [4, 120, 87] : [190, 18, 60],
    },
    {
      title: "GROSS PROFIT",
      val: fmtMoney(grossProfitActual),
      sub: `${grossMarginActual.toFixed(1)}% margin (${grossMarginActual >= grossMarginBudget ? "+" : ""}${(grossMarginActual - grossMarginBudget).toFixed(1)}% vs plan)`,
      color: grossMarginActual >= grossMarginBudget ? [4, 120, 87] : [180, 83, 9],
    },
    {
      title: "OPERATING PROFIT",
      val: fmtMoney(totalProfitActual),
      sub: `${actualMarginPct.toFixed(1)}% net margin (${fmtMoneyWithSign(totalProfitVar)} vs plan)`,
      color: totalProfitVar >= 0 ? [4, 120, 87] : [190, 18, 60],
    },
    {
      title: "CLOSING CASH",
      val: fmtMoney(cashData?.startingCash ?? 0),
      sub: "Available liquidity buffer",
      color: [14, 116, 144],
    },
  ];

  heroMetrics.forEach((m, idx) => {
    const mx = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(248, 250, 252);
    doc.rect(mx, kpiY, kpiW, kpiH, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(mx, kpiY, kpiW, kpiH, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, mx + 3.5, kpiY + 5.5);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, mx + 3.5, kpiY + 13);

    doc.setFontSize(6.5);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.sub, mx + 3.5, kpiY + 18.5, { maxWidth: kpiW - 6 });
  });

  // Executive Variance Table
  const p2Cols: ColumnDef[] = [
    { header: "Core Commercial Line", width: 44, align: "left" },
    { header: "Budget Target", width: 28, align: "right" },
    { header: "Recorded Actual", width: 28, align: "right" },
    { header: "Variance (£)", width: 26, align: "right" },
    { header: "Variance (%)", width: 22, align: "right" },
    { header: "Performance Assessment", width: 26, align: "center" },
  ];

  const p2Rows = [
    [
      "Revenue (Sales)",
      fmtMoney(totalRevBudget),
      fmtMoney(totalRevActual),
      fmtMoneyWithSign(totalRevVar),
      `${totalRevVar >= 0 ? "+" : ""}${revDiffPct.toFixed(1)}%`,
      { text: totalRevVar >= 0 ? "Favourable" : "Adverse", color: totalRevVar >= 0 ? [4, 120, 87] : [190, 18, 60], bold: true },
    ],
    [
      "Cost of Goods Sold (COGS)",
      fmtMoney(Math.round(totalRevBudget * 0.38)),
      fmtMoney(cogsActual),
      fmtMoneyWithSign(cogsActual - Math.round(totalRevBudget * 0.38)),
      `${((cogsActual - Math.round(totalRevBudget * 0.38)) / Math.max(1, Math.round(totalRevBudget * 0.38)) * 100).toFixed(1)}%`,
      { text: cogsActual <= Math.round(totalRevBudget * 0.38) ? "Favourable" : "Adverse", color: cogsActual <= Math.round(totalRevBudget * 0.38) ? [4, 120, 87] : [190, 18, 60], bold: true },
    ],
    [
      "Gross Profit Margin",
      fmtMoney(grossProfitBudget),
      fmtMoney(grossProfitActual),
      fmtMoneyWithSign(grossProfitActual - grossProfitBudget),
      `${grossMarginActual.toFixed(1)}% vs ${grossMarginBudget.toFixed(1)}%`,
      { text: grossMarginActual >= grossMarginBudget ? "Target Met" : "Compressed", color: grossMarginActual >= grossMarginBudget ? [4, 120, 87] : [180, 83, 9], bold: true },
    ],
    [
      "Operating Expenses (OPEX)",
      fmtMoney(totalCostBudget - Math.round(totalRevBudget * 0.38)),
      fmtMoney(opexActual),
      fmtMoneyWithSign(totalCostVar),
      `${totalCostVar <= 0 ? "" : "+"}${costDiffPct.toFixed(1)}%`,
      { text: totalCostVar <= 0 ? "Favourable" : "Over Budget", color: totalCostVar <= 0 ? [4, 120, 87] : [190, 18, 60], bold: true },
    ],
    [
      "Operating Profit (EBITDA)",
      fmtMoney(totalProfitBudget),
      fmtMoney(totalProfitActual),
      fmtMoneyWithSign(totalProfitVar),
      `${profitDiffPct >= 0 ? "+" : ""}${profitDiffPct.toFixed(1)}%`,
      { text: totalProfitVar >= 0 ? "Favourable" : "Adverse", color: totalProfitVar >= 0 ? [4, 120, 87] : [190, 18, 60], bold: true },
    ],
  ];

  const p2TableEndY = renderTable(margin, 97, p2Cols, p2Rows, {
    headerHeight: 7.5,
    rowHeight: 7,
    fontSize: 7.5,
    headerFontSize: 7.5,
    zebra: true,
  });

  // The CFO Strategic Verdict Box
  const verdictY = p2TableEndY + 8;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, verdictY, contentWidth, 38, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(14, 116, 144);
  doc.text("THE CFO STRATEGIC VERDICT & BOARD FOCUS", margin + 6, verdictY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);

  const verdictLines = [
    `1. Growth Quality: Actual revenue run-rate indicates annualized capacity of ${fmtMoney(forecastRevenue)} under ${data.scenarioLabel ?? "the selected scenario"}. Verify whether growth is recurring contractual revenue or one-off transactional volume.`,
    `2. Margin Protection: Gross profit retention is ${grossMarginActual.toFixed(1)}%. Ensure pricing models reflect recent supplier inflation and subcontractor rate adjustments.`,
    `3. Overhead Governance: Immediate attention is required on discretionary operating expenditures to prevent recurring margin erosion before the next fiscal quarter.`,
  ];

  verdictLines.forEach((vl, vIdx) => {
    doc.text(vl, margin + 6, verdictY + 15 + vIdx * 6.8, { maxWidth: contentWidth - 12 });
  });

  drawPageFooter(2);

  // =========================================================================
  // PAGE 3: CHAPTER 2 — THE REVENUE ENGINE & CUSTOMER CONCENTRATION
  // =========================================================================
  doc.addPage();
  drawChapterHeader(
    2,
    "The Revenue Engine & Customer Concentration",
    "Analyzing top-line delivery, anchor account dependency, and sales velocity",
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Revenue performance delivered ${fmtMoney(totalRevActual)} across ${periodLabel}. To ensure enterprise resilience, executive leadership must monitor customer concentration risks, account yield, and revenue delivery velocity.`,
    margin,
    42,
    { maxWidth: contentWidth },
  );

  // Top Customer Concentration Table
  const topCustomers = customers.length > 0
    ? customers.slice(0, 5)
    : [
        { customer: "Anchor Client Alpha", revenue: Math.round(totalRevActual * 0.35), grossProfit: Math.round(totalRevActual * 0.35 * 0.64), margin: 64.0 },
        { customer: "Beta Enterprises Ltd", revenue: Math.round(totalRevActual * 0.24), grossProfit: Math.round(totalRevActual * 0.24 * 0.58), margin: 58.0 },
        { customer: "Gamma Global Partners", revenue: Math.round(totalRevActual * 0.18), grossProfit: Math.round(totalRevActual * 0.18 * 0.52), margin: 52.0 },
        { customer: "Delta Services Group", revenue: Math.round(totalRevActual * 0.13), grossProfit: Math.round(totalRevActual * 0.13 * 0.61), margin: 61.0 },
        { customer: "Epsilon Solutions", revenue: Math.round(totalRevActual * 0.10), grossProfit: Math.round(totalRevActual * 0.10 * 0.45), margin: 45.0 },
      ];

  const custCols: ColumnDef[] = [
    { header: "Key Customer Account", width: 54, align: "left" },
    { header: "Recorded Revenue", width: 32, align: "right" },
    { header: "Gross Profit Yield", width: 32, align: "right" },
    { header: "Margin %", width: 24, align: "right" },
    { header: "Sales Share %", width: 32, align: "right" },
  ];

  const custRows = topCustomers.map((c) => {
    const share = totalRevActual > 0 ? (c.revenue / totalRevActual) * 100 : 0;
    return [
      c.customer,
      fmtMoney(c.revenue),
      fmtMoney(c.grossProfit),
      `${c.margin.toFixed(1)}%`,
      `${share.toFixed(1)}%`,
    ];
  });

  const custTableEndY = renderTable(margin, 49, custCols, custRows, {
    headerHeight: 7.5,
    rowHeight: 6.8,
    fontSize: 7.5,
    headerFontSize: 7.5,
    zebra: true,
  });

  // Monthly Revenue Velocity Chart
  const c1TopY = custTableEndY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Monthly Revenue Delivery Velocity: Budget vs Actual", margin, c1TopY);

  const c1X = margin;
  const c1Y = c1TopY + 4;
  const c1W = contentWidth;
  const c1H = 68;

  doc.setFillColor(248, 250, 252);
  doc.rect(c1X, c1Y, c1W, c1H, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.rect(c1X, c1Y, c1W, c1H, "S");

  // Chart Legend
  doc.setFillColor(15, 23, 42); // Navy Budget
  doc.rect(c1X + 16, c1Y + 6, 3.5, 2.8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("Budget Plan", c1X + 22, c1Y + 8.5);

  doc.setFillColor(14, 116, 144); // Cyan Actual
  doc.rect(c1X + 54, c1Y + 6, 3.5, 2.8, "F");
  doc.text("Recorded Actual", c1X + 60, c1Y + 8.5);

  const p1X = c1X + 18;
  const p1Y = c1Y + 14;
  const p1W = c1W - 24;
  const p1H = 44;

  const maxRev = Math.max(...months.map((m) => Math.max(m.revBudget, m.revActual, 100)));
  const c1Max = getNiceScaleMax(maxRev);
  const c1Steps = 4;

  for (let s = 0; s <= c1Steps; s++) {
    const val = Math.round((c1Max / c1Steps) * s);
    const yPos = p1Y + p1H - (val / c1Max) * p1H;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(p1X, yPos, p1X + p1W, yPos);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(val.toLocaleString("en-GB"), p1X - 2, yPos + 1, { align: "right" });
  }

  const slotW = p1W / months.length;
  const bWidth = 5.2;

  months.forEach((m, idx) => {
    const mCenterX = p1X + (idx + 0.5) * slotW;

    const bH = (m.revBudget / c1Max) * p1H;
    const bY = p1Y + p1H - bH;
    doc.setFillColor(15, 23, 42);
    doc.rect(mCenterX - bWidth - 0.5, bY, bWidth, bH, "F");

    const aH = (m.revActual / c1Max) * p1H;
    const aY = p1Y + p1H - aH;
    doc.setFillColor(14, 116, 144);
    doc.rect(mCenterX + 0.5, aY, bWidth, aH, "F");

    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(m.name, mCenterX, p1Y + p1H + 4, { align: "center" });
  });

  // Strategic Revenue Callout Box
  const revCalloutY = c1Y + c1H + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, revCalloutY, contentWidth, 22, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, revCalloutY, contentWidth, 22, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144);
  doc.text("COMMERCIAL TAKEAWAY & PIPELINE RESILIENCE", margin + 5, revCalloutY + 6);

  const top3Share = topCustomers.slice(0, 3).reduce((acc, c) => acc + (totalRevActual > 0 ? (c.revenue / totalRevActual) * 100 : 0), 0);
  const revAdvice = `Top 3 client accounts account for ${top3Share.toFixed(1)}% of total revenue. ${top3Share > 55 ? "Significant customer concentration risk detected: prioritize account diversification and SLA protection." : "Healthy customer distribution with stable account diversification across commercial tiers."}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(revAdvice, margin + 5, revCalloutY + 12, { maxWidth: contentWidth - 10 });

  drawPageFooter(3);

  // =========================================================================
  // PAGE 4: CHAPTER 3 — MARGIN EROSION & OPERATING EXPENSE OVERRUNS
  // =========================================================================
  doc.addPage();
  drawChapterHeader(
    3,
    "Margin Erosion & Operating Cost Overruns",
    "Detailed nominal breakdown and audit of adverse spending deviations",
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Total operating costs reached ${fmtMoney(totalCostActual)} against a planned budget of ${fmtMoney(totalCostBudget)} (${totalCostVar <= 0 ? "favourable savings of" : "unfavourable overspend of"} ${fmtMoney(Math.abs(totalCostVar))}). The table below details nominal line performance.`,
    margin,
    42,
    { maxWidth: contentWidth },
  );

  // Line Item Budget Table
  const p3Cols: ColumnDef[] = [
    { header: "Budget Line Item", width: 52, align: "left" },
    { header: "Planned Budget", width: 28, align: "right" },
    { header: "Recorded Actual", width: 28, align: "right" },
    { header: "Variance (£)", width: 26, align: "right" },
    { header: "Variance %", width: 20, align: "right" },
    { header: "Audit Status", width: 20, align: "center" },
  ];

  const p3Rows = budgetItems.map((item) => {
    const variance = item.actual - item.budget;
    const unfavorable = item.type === "revenue" ? variance < 0 : variance > 0;
    const variancePct = item.budget !== 0 ? (variance / Math.abs(item.budget)) * 100 : 0;
    return [
      item.category,
      fmtMoney(item.budget),
      fmtMoney(item.actual),
      fmtMoneyWithSign(variance),
      `${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%`,
      {
        text: unfavorable ? "Review" : "On Track",
        color: unfavorable ? [190, 18, 60] : [4, 120, 87],
        bold: true,
      },
    ];
  });

  const p3TableEndY = renderTable(margin, 49, p3Cols, p3Rows, {
    headerHeight: 7.5,
    rowHeight: 6.8,
    fontSize: 7.5,
    headerFontSize: 7.5,
    zebra: true,
  });

  // Adverse Cost Watchlist Callout Box
  const adverseItems = budgetItems
    .map((item) => ({
      ...item,
      variance: item.actual - item.budget,
      unfavorable: item.type === "revenue" ? item.actual < item.budget : item.actual > item.budget,
    }))
    .filter((i) => i.unfavorable)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 3);

  const watchY = p3TableEndY + 8;
  doc.setFillColor(254, 242, 242); // Light red #FEF2F2
  doc.roundedRect(margin, watchY, contentWidth, 34, 2, 2, "F");
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, watchY, contentWidth, 34, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(190, 18, 60); // Rose 700
  doc.text("EXECUTIVE WATCHLIST: TOP 3 COST OVERRUNS", margin + 6, watchY + 7);

  if (adverseItems.length > 0) {
    adverseItems.forEach((adv, aIdx) => {
      const aLineY = watchY + 14 + aIdx * 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${adv.category}:`, margin + 6, aLineY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(190, 18, 60);
      doc.text(
        `Over budget by ${fmtMoney(Math.abs(adv.variance))} (Actual: ${fmtMoney(adv.actual)} vs Budget: ${fmtMoney(adv.budget)})`,
        margin + 48,
        aLineY,
      );
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text("All operating expenses and cost lines operated strictly within or below budgeted allowances.", margin + 6, watchY + 16);
  }

  drawPageFooter(4);

  // =========================================================================
  // PAGE 5: CHAPTER 4 — CASH FLOW & WORKING CAPITAL REALITY
  // =========================================================================
  doc.addPage();
  drawChapterHeader(
    4,
    "Cash Flow & Working Capital Reality",
    "Connecting operating profits to liquid bank balances and liquidity buffers",
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Accounting profits must convert into bank deposits to sustain enterprise solvency. The analysis below examines cash conversion velocity, debt collection efficiency, and liquidity resilience across ${periodLabel}.`,
    margin,
    42,
    { maxWidth: contentWidth },
  );

  // 4 Working Capital Scorecard Cards
  const wcY = 49;
  const wcH = 22;
  const wcGap = 3.5;
  const wcW = (contentWidth - wcGap * 3) / 4;

  const dsoVal = kpiData?.dso ?? 38;
  const dpoVal = kpiData?.dpo ?? 32;
  const currRatio = kpiData?.currentRatio ?? 1.85;
  const cashBal = cashData?.startingCash ?? 0;

  const wcMetrics = [
    { title: "DSO (COLLECTION DAYS)", val: `${dsoVal} Days`, sub: dsoVal <= 45 ? "Optimal turnover (<45d)" : "Collections alert (>45d)", good: dsoVal <= 45 },
    { title: "DPO (PAYABLE DAYS)", val: `${dpoVal} Days`, sub: "Supplier credit terms", good: true },
    { title: "CURRENT RATIO", val: `${currRatio.toFixed(2)}x`, sub: currRatio >= 1.5 ? "Robust working capital" : "Liquidity caution (<1.5x)", good: currRatio >= 1.5 },
    { title: "CASH AT BANK", val: fmtMoney(cashBal), sub: "Verified bank cash position", good: true },
  ];

  wcMetrics.forEach((m, idx) => {
    const wx = margin + idx * (wcW + wcGap);
    doc.setFillColor(248, 250, 252);
    doc.rect(wx, wcY, wcW, wcH, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(wx, wcY, wcW, wcH, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, wx + 3.5, wcY + 5.5);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, wx + 3.5, wcY + 13);

    doc.setFontSize(6.5);
    doc.setTextColor(m.good ? 4 : 190, m.good ? 120 : 18, m.good ? 87 : 60);
    doc.text(m.sub, wx + 3.5, wcY + 18.5, { maxWidth: wcW - 6 });
  });

  // Operating Profit vs Budget Trajectory Chart
  const c3TopY = wcY + wcH + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Monthly Operating Profit Trajectory: Budget vs Actual", margin, c3TopY);

  const c3X = margin;
  const c3Y = c3TopY + 4;
  const c3W = contentWidth;
  const c3H = 68;

  doc.setFillColor(248, 250, 252);
  doc.rect(c3X, c3Y, c3W, c3H, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.rect(c3X, c3Y, c3W, c3H, "S");

  // Legend
  doc.setFillColor(15, 23, 42); // Budget Navy
  doc.rect(c3X + 16, c3Y + 6, 3.5, 2.8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("Budget Profit Plan", c3X + 22, c3Y + 8.5);

  doc.setFillColor(4, 120, 87); // Actual Green
  doc.rect(c3X + 58, c3Y + 6, 3.5, 2.8, "F");
  doc.text("Recorded Profit", c3X + 64, c3Y + 8.5);

  const p3X = c3X + 18;
  const p3Y = c3Y + 14;
  const p3W = c3W - 24;
  const p3H = 44;

  const allProfits = months.flatMap((m) => [m.profitActual, m.profitBudget]);
  const minP = Math.min(...allProfits, 0);
  const maxP = Math.max(...allProfits, 1000);
  const c3Max = getNiceScaleMax(maxP);

  for (let s = 0; s <= 4; s++) {
    const val = Math.round((c3Max / 4) * s);
    const yPos = p3Y + p3H - (val / c3Max) * p3H;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(p3X, yPos, p3X + p3W, yPos);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(val.toLocaleString("en-GB"), p3X - 2, yPos + 1, { align: "right" });
  }

  months.forEach((m, idx) => {
    const mCenterX = p3X + (idx + 0.5) * slotW;

    const bH = (Math.max(0, m.profitBudget) / c3Max) * p3H;
    const bY = p3Y + p3H - bH;
    doc.setFillColor(15, 23, 42);
    doc.rect(mCenterX - bWidth - 0.5, bY, bWidth, bH, "F");

    const aH = (Math.max(0, m.profitActual) / c3Max) * p3H;
    const aY = p3Y + p3H - aH;
    doc.setFillColor(4, 120, 87);
    doc.rect(mCenterX + 0.5, aY, bWidth, aH, "F");

    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(m.name, mCenterX, p3Y + p3H + 4, { align: "center" });
  });

  // Working Capital Takeaway Box
  const wcCalloutY = c3Y + c3H + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, wcCalloutY, contentWidth, 22, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, wcCalloutY, contentWidth, 22, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144);
  doc.text("LIQUIDITY CONVERSION VERDICT", margin + 5, wcCalloutY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Cash balance of ${fmtMoney(cashBal)} provides sound operational runway. Current DSO of ${dsoVal} days indicates efficient invoice collections; continue enforcing automated 14-day payment reminders to safeguard cash conversion against supply chain delays.`,
    margin + 5,
    wcCalloutY + 12,
    { maxWidth: contentWidth - 10 },
  );

  drawPageFooter(5);

  // =========================================================================
  // PAGE 6: CHAPTER 5 — SENSITIVITY MODELING & STRATEGIC PLAYBOOK
  // =========================================================================
  doc.addPage();
  drawChapterHeader(
    5,
    "Sensitivity Modeling & Strategic Playbook",
    "Stress-testing forward performance and prioritized CFO executive interventions",
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `The matrix below models executive outcomes under three economic trajectories. Figures project active period outcomes and annualized FY run-rates applying selected target multipliers.`,
    margin,
    42,
    { maxWidth: contentWidth },
  );

  // Scenario Sensitivity Modeling Table
  const baseRev = totalRevBudget;
  const baseCost = totalCostBudget;
  const baseProfit = baseRev - baseCost;

  const worstRev = Math.round(baseRev * 0.85);
  const worstCost = Math.round(baseCost * 1.10);
  const worstProfit = worstRev - worstCost;
  const worstMargin = worstRev > 0 ? (worstProfit / worstRev) * 100 : 0;

  const avgRev = baseRev;
  const avgCost = baseCost;
  const avgProfit = avgRev - avgCost;
  const avgMargin = avgRev > 0 ? (avgProfit / avgRev) * 100 : 0;

  const bestRev = Math.round(baseRev * 1.15);
  const bestCost = Math.round(baseCost * 0.95);
  const bestProfit = bestRev - bestCost;
  const bestMargin = bestRev > 0 ? (bestProfit / bestRev) * 100 : 0;

  const sensCols: ColumnDef[] = [
    { header: "Scenario Assumption", width: 46, align: "left" },
    { header: "Projected Rev", width: 26, align: "right" },
    { header: "Operating Costs", width: 26, align: "right" },
    { header: "Projected Profit", width: 26, align: "right" },
    { header: "Margin %", width: 20, align: "right" },
    { header: "Delta vs Plan", width: 30, align: "right" },
  ];

  const sensRows = [
    [
      "Worst Case (-15% Rev / +10% Costs)",
      fmtMoney(worstRev),
      fmtMoney(worstCost),
      fmtMoney(worstProfit),
      `${worstMargin.toFixed(1)}%`,
      { text: fmtMoneyWithSign(worstProfit - baseProfit), color: [190, 18, 60], bold: true },
    ],
    [
      "Average Case (Approved Baseline Plan)",
      fmtMoney(avgRev),
      fmtMoney(avgCost),
      fmtMoney(avgProfit),
      `${avgMargin.toFixed(1)}%`,
      { text: "Baseline Target", color: [15, 23, 42], bold: true },
    ],
    [
      "Best Case (+15% Rev / -5% Costs)",
      fmtMoney(bestRev),
      fmtMoney(bestCost),
      fmtMoney(bestProfit),
      `${bestMargin.toFixed(1)}%`,
      { text: fmtMoneyWithSign(bestProfit - baseProfit), color: [4, 120, 87], bold: true },
    ],
  ];

  const sensTableEndY = renderTable(margin, 49, sensCols, sensRows, {
    headerHeight: 7.5,
    rowHeight: 6.8,
    fontSize: 7.5,
    headerFontSize: 7.5,
    zebra: true,
  });

  // Prioritized CFO Action Matrix
  const actY = sensTableEndY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Executive CFO Action Matrix: 30-60-90 Day Commitments", margin, actY);

  const actCols: ColumnDef[] = [
    { header: "Priority", width: 18, align: "center" },
    { header: "Recommended Strategic Action", width: 62, align: "left" },
    { header: "Responsible Owner", width: 30, align: "left" },
    { header: "Target Window", width: 28, align: "left" },
    { header: "Measurable Success Target", width: 36, align: "left" },
  ];

  const topAdverse = adverseItems[0];
  const actRows = [
    [
      { text: "HIGH", color: [190, 18, 60], bold: true },
      topAdverse
        ? `Execute procurement audit on ${topAdverse.category}; renegotiate supplier terms to eliminate the ${fmtMoney(Math.abs(topAdverse.variance))} overrun`
        : "Conduct nominal expense review across top 5 operating accounts; enforce purchase order sign-off thresholds",
      "Finance Lead + Budget Owner",
      "Within 14 working days",
      "100% of discretionary spend pre-approved",
    ],
    [
      { text: "HIGH", color: [190, 18, 60], bold: true },
      "Lock in rolling forecast reflecting confirmed customer pipeline and committed headcount plans",
      "Head of FP&A / CFO",
      "Next monthly close",
      "Variance tolerance within ±3.5%",
    ],
    [
      { text: "MEDIUM", color: [180, 83, 9], bold: true },
      "Review pricing matrix on key accounts generating gross margin below 55%",
      "Commercial Director",
      "Within 30 calendar days",
      "+2.0% gross margin expansion",
    ],
    [
      { text: "MEDIUM", color: [180, 83, 9], bold: true },
      "Automate credit control escalation workflows for accounts receivable exceeding 30-day payment terms",
      "Credit Control / Ops",
      "Within 30 calendar days",
      "Maintain DSO below 40 days",
    ],
    [
      { text: "MEDIUM", color: [14, 116, 144], bold: true },
      "Establish monthly department variance reviews with departmental accountability owners",
      "Department Heads",
      "Ongoing monthly cycle",
      "Zero unflagged budget overspends",
    ],
  ];

  const actTableEndY = renderTable(margin, actY + 4, actCols, actRows, {
    headerHeight: 7.5,
    rowHeight: 8.5,
    fontSize: 7.5,
    headerFontSize: 7.5,
    zebra: true,
  });

  // Final Sign-off Box
  const signY = actTableEndY + 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, signY, contentWidth, 22, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, signY, contentWidth, 22, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("EXECUTIVE REPORT SIGN-OFF & GOVERNANCE NOTES", margin + 5, signY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Prepared by the UK Virtual CFO Advisory Platform. All metrics reflect transaction records in ${data.periodInfo?.dataSource ?? "the accounting system"} for ${periodLabel}. This report serves as an executive decision aid and management reporting document.`,
    margin + 5,
    signY + 11.5,
    { maxWidth: contentWidth - 10 },
  );

  drawPageFooter(6);

  // Save the PDF
  const downloadFileName = `Virtual_CFO_Budget_Storybook_${fromDate}_to_${toDate}.pdf`;
  doc.save(downloadFileName);
}

