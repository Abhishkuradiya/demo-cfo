import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroReport, fetchXeroResource } from '@/lib/xero';
import { ProfitAndLossService } from '@/lib/services/ProfitAndLossService';

export const dynamic = 'force-dynamic';

function parseProfitAndLoss(report: any) {
  const income = { operating: [] as any[], other: [] as any[] };
  const cogs = [] as any[];
  const expenses = { operating: [] as any[], other: [] as any[] };
  let currency = 'USD';

  if (!report || !report.Rows) {
    return { income, cogs, expenses, currency };
  }

  // Parse currency from titles
  if (report.ReportTitles) {
    for (const title of report.ReportTitles) {
      if (title.toLowerCase().includes('currency:')) {
        const match = title.match(/currency:\s*([a-z]{3})/i);
        if (match) currency = match[1].toUpperCase();
      } else if (title.toLowerCase().includes('amounts in')) {
        const match = title.match(/amounts in\s*([a-z]{3})/i);
        if (match) currency = match[1].toUpperCase();
      }
    }
  }

  const getRowValue = (row: any): number => {
    if (!row || !row.Cells || row.Cells.length < 2) return 0;
    const val = row.Cells[1].Value || '0';
    return parseFloat(val.replace(/,/g, '')) || 0;
  };

  const isTotalRow = (row: any): boolean => {
    if (!row || !row.Cells || row.Cells.length === 0) return false;
    const val = (row.Cells[0].Value || '').toLowerCase();
    return val.includes('total') || val.includes('gross profit') || val.includes('net profit');
  };

  const traverse = (rows: any[], parentSection: string = '') => {
    for (const item of rows) {
      if (item.RowType === 'Section' && item.Title) {
        traverse(item.Rows || [], item.Title.toLowerCase());
      } else if (item.RowType === 'Row' && item.Cells && item.Cells.length >= 2) {
        const name = (item.Cells[0].Value || '').trim();
        if (!name || isTotalRow(item)) continue;
        const value = getRowValue(item);

        const section = parentSection;
        if (section.includes('operating income') || section.includes('revenue') || section.includes('income') || section.includes('trading income')) {
          if (section.includes('other income')) {
            income.other.push({ name, value });
          } else {
            income.operating.push({ name, value });
          }
        } else if (section.includes('cost of sales') || section.includes('cogs') || section.includes('cost of goods sold') || section.includes('direct costs')) {
          cogs.push({ name, value });
        } else if (section.includes('expense') || section.includes('depreciation') || section.includes('operating expenses') || section.includes('administrative') || section.includes('overhead') || section.includes('costs')) {
          if (section.includes('other expense') || section.includes('interest expense') || section.includes('tax')) {
            expenses.other.push({ name, value });
          } else {
            expenses.operating.push({ name, value });
          }
        } else {
          // General fallback based on name keywords if section is vague
          const nameLower = name.toLowerCase();
          if (nameLower.includes('sales') || nameLower.includes('revenue') || nameLower.includes('interest income')) {
            income.operating.push({ name, value });
          } else if (nameLower.includes('purchases') || nameLower.includes('cogs') || nameLower.includes('cost of sales')) {
            cogs.push({ name, value });
          } else if (nameLower.includes('expense') || nameLower.includes('rent') || nameLower.includes('salary')) {
            expenses.operating.push({ name, value });
          } else {
            expenses.operating.push({ name, value });
          }
        }
      } else if (item.Rows) {
        traverse(item.Rows, parentSection);
      }
    }
  };

  traverse(report.Rows);

  return { income, cogs, expenses, currency };
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false });
    }

    // Set default dates if not provided (defaulting to the current financial year or last 6 months)
    let start = fromDate;
    let end = toDate;
    if (!start || !end) {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      start = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
      end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else {
      // Ensure date range never exceeds 364 days for Xero API limits
      const dStart = new Date(start);
      const dEnd = new Date(end);
      const diffDays = Math.ceil((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        const clampedStart = new Date(dEnd.getTime() - 364 * 24 * 60 * 60 * 1000);
        const y = clampedStart.getFullYear();
        const m = String(clampedStart.getMonth() + 1).padStart(2, '0');
        const d = String(clampedStart.getDate()).padStart(2, '0');
        start = `${y}-${m}-${d}`;
      }
    }

    const cacheKey = `ProfitAndLoss_${start}_${end}`;
    let report = await db.getReport(tenantId, cacheKey);

    if (!report && tokenInfo) {
      try {
        report = await fetchXeroReport(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'ProfitAndLoss', `fromDate=${start}&toDate=${end}`);
        if (report) {
          await db.saveReport(tenantId, cacheKey, report);
        }
      } catch (e: any) {
        console.error('Failed to fetch Profit & Loss from Xero:', e);
      }
    }

    let org = await db.getReport(tenantId, 'Organisation');
    if (!org && tokenInfo) {
      try {
        const organisations = await fetchXeroResource(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'Organisations');
        if (organisations && organisations.length > 0) {
          org = organisations[0];
          await db.saveReport(tenantId, 'Organisation', org);
        }
      } catch (err: any) {
        console.error('Failed to dynamically sync Organisation details:', err.message);
      }
    }
    const orgCurrency = org?.BaseCurrency || 'USD';

    // If report is completely missing, return clean zero structured layout
    if (!report) {
      return NextResponse.json({
        connected: true,
        summary: { revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0, profitMargin: 0, grossProfitMargin: 0 },
        income: { operating: [], other: [] },
        expenses: { operating: [], other: [] },
        trends: [],
        meta: { currency: orgCurrency, calculatedAt: new Date().toISOString() }
      });
    }

    const parsed = parseProfitAndLoss(report);
    let finalCurrency = parsed.currency;
    const hasExplicitCurrency = report?.ReportTitles?.some((t: string) => 
      t.toLowerCase().includes('currency:') || t.toLowerCase().includes('amounts in')
    );
    if (!hasExplicitCurrency || finalCurrency === 'USD') {
      if (org && org.BaseCurrency) {
        finalCurrency = org.BaseCurrency;
      }
    }

    // Compute sums dynamically
    const operatingIncomeSum = parsed.income.operating.reduce((sum, item) => sum + item.value, 0);
    const otherIncomeSum = parsed.income.other.reduce((sum, item) => sum + item.value, 0);
    const totalIncome = operatingIncomeSum + otherIncomeSum;

    // Direct Cost of Sales (COGS)
    const cogsSum = parsed.cogs.reduce((sum, item) => sum + item.value, 0);

    const grossProfit = operatingIncomeSum - cogsSum;

    const operatingExpensesSum = parsed.expenses.operating.reduce((sum, item) => sum + item.value, 0);
    const otherExpensesSum = parsed.expenses.other.reduce((sum, item) => sum + item.value, 0);
    const totalExpenses = operatingExpensesSum + otherExpensesSum;

    const netProfit = (grossProfit + otherIncomeSum) - totalExpenses;

    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const grossProfitMargin = operatingIncomeSum > 0 ? (grossProfit / operatingIncomeSum) * 100 : 0;

    // Generate monthly trend
    const trends = [];
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // Get list of months in the range
    const monthsList = [];
    const parsedStart = new Date(start);
    const parsedEnd = new Date(end);
    let curr = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), 1);
    const endMonth = new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), 1);
    
    // Safety cap at 12 months to prevent API timeouts/rate-limiting
    while (curr <= endMonth && monthsList.length < 12) {
      monthsList.push({
        year: curr.getFullYear(),
        month: curr.getMonth(),
        label: curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
      curr.setMonth(curr.getMonth() + 1);
    }

    for (const m of monthsList) {
      const mStart = `${m.year}-${pad(m.month + 1)}-01`;
      const lastDay = new Date(m.year, m.month + 1, 0).getDate();
      const mEnd = `${m.year}-${pad(m.month + 1)}-${pad(lastDay)}`;
      const mCacheKey = `ProfitAndLoss_${mStart}_${mEnd}`;
      
      let mReport = await db.getReport(tenantId, mCacheKey);
      if (!mReport && tokenInfo) {
        try {
          mReport = await fetchXeroReport(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'ProfitAndLoss', `fromDate=${mStart}&toDate=${mEnd}`);
          if (mReport) {
            await db.saveReport(tenantId, mCacheKey, mReport);
          }
        } catch (e) {
          console.error(`Failed to fetch P&L for trend month ${mStart}:`, e);
        }
      }
      
      let mRevenue = 0;
      let mExpenses = 0;
      let mNetProfit = 0;
      
      if (mReport) {
        const mSummary = ProfitAndLossService.parseReport(mReport);
        mRevenue = mSummary.revenue;
        mExpenses = mSummary.operatingExpenses + mSummary.otherExpenses;
        mNetProfit = mSummary.netProfit;
      }
      
      trends.push({
        month: m.label,
        revenue: mRevenue,
        expenses: mExpenses,
        netProfit: mNetProfit
      });
    }

    return NextResponse.json({
      connected: true,
      summary: {
        revenue: totalIncome,
        turnover: operatingIncomeSum,
        otherIncome: otherIncomeSum,
        cogs: cogsSum,
        expenses: operatingExpensesSum + otherExpensesSum,
        totalExpenses: cogsSum + operatingExpensesSum + otherExpensesSum,
        grossProfit,
        netProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        grossProfitMargin: Math.round(grossProfitMargin * 10) / 10
      },
      income: parsed.income,
      cogs: parsed.cogs,
      expenses: parsed.expenses,
      trends,
      meta: {
        currency: finalCurrency,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Profit and Loss API handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
