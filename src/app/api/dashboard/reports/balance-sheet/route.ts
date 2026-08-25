import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroReport, fetchXeroResource } from '@/lib/xero';

export const dynamic = 'force-dynamic';

// Helper to parse Xero Balance Sheet rows into categorized assets, liabilities, and equity
function parseBalanceSheet(report: any) {
  const assets = { current: [] as any[], nonCurrent: [] as any[] };
  const liabilities = { current: [] as any[], nonCurrent: [] as any[] };
  const equity = [] as any[];

  if (!report || !report.Rows) {
    return { assets, liabilities, equity, currency: 'USD' };
  }

  // Parse currency from report titles
  let currency = 'USD';
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
    return val.includes('total') || val.includes('net assets') || val.includes('net current assets');
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
        if (
          section.includes('current asset') ||
          section.includes('cash and bank') ||
          section.includes('bank accounts') ||
          section.includes('receivables') ||
          section.includes('prepayments') ||
          section.includes('inventory')
        ) {
          assets.current.push({ name, value });
        } else if (
          section.includes('fixed asset') ||
          section.includes('non-current asset') ||
          section.includes('property, plant') ||
          section.includes('depreciation') ||
          section.includes('equipment')
        ) {
          assets.nonCurrent.push({ name, value });
        } else if (
          section.includes('current liabilit') ||
          section.includes('payables') ||
          section.includes('tax')
        ) {
          liabilities.current.push({ name, value });
        } else if (
          section.includes('long term') ||
          section.includes('non-current liabilit') ||
          section.includes('loan')
        ) {
          liabilities.nonCurrent.push({ name, value });
        } else if (
          section.includes('equity') ||
          section.includes('capital') ||
          section.includes('reserve') ||
          section.includes('retained earnings')
        ) {
          equity.push({ name, value });
        } else {
          // General fallback based on name keywords if parent section is vague
          const nameLower = name.toLowerCase();
          if (nameLower.includes('cash') || nameLower.includes('bank') || nameLower.includes('receivable')) {
            assets.current.push({ name, value });
          } else if (nameLower.includes('payable') || nameLower.includes('tax') || nameLower.includes('gst')) {
            liabilities.current.push({ name, value });
          } else if (nameLower.includes('equity') || nameLower.includes('retained earnings')) {
            equity.push({ name, value });
          } else {
            assets.current.push({ name, value });
          }
        }
      } else if (item.Rows) {
        traverse(item.Rows, parentSection);
      }
    }
  };

  traverse(report.Rows);

  return { assets, liabilities, equity, currency };
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false });
    }

    // Determine target date (default to today)
    let date = dateStr;
    if (!date) {
      const now = new Date();
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const cacheKey = `BalanceSheet_${date}`;
    let report = await db.getReport(tenantId, cacheKey);

    if (!report && tokenInfo) {
      try {
        report = await fetchXeroReport(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'BalanceSheet', `date=${date}`);
        if (report) {
          await db.saveReport(tenantId, cacheKey, report);
        }
      } catch (e: any) {
        console.error('Failed to fetch Balance Sheet from Xero API:', e);
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

    if (!report) {
      return NextResponse.json({ 
        connected: true,
        summary: { assets: 0, liabilities: 0, equity: 0, isBalanced: true, difference: 0 },
        assets: { current: [], nonCurrent: [] },
        liabilities: { current: [], nonCurrent: [] },
        equity: [],
        meta: { currency: orgCurrency, calculatedAt: new Date().toISOString() }
      });
    }

    const parsed = parseBalanceSheet(report);
    let finalCurrency = parsed.currency;
    const hasExplicitCurrency = report?.ReportTitles?.some((t: string) => 
      t.toLowerCase().includes('currency:') || t.toLowerCase().includes('amounts in')
    );
    if (!hasExplicitCurrency || finalCurrency === 'USD') {
      if (org && org.BaseCurrency) {
        finalCurrency = org.BaseCurrency;
      }
    }

    // Compute totals dynamically to ensure it is perfectly balanced
    const currentAssetsSum = parsed.assets.current.reduce((sum, item) => sum + item.value, 0);
    const nonCurrentAssetsSum = parsed.assets.nonCurrent.reduce((sum, item) => sum + item.value, 0);
    const assetsSum = currentAssetsSum + nonCurrentAssetsSum;

    const currentLiabilitiesSum = parsed.liabilities.current.reduce((sum, item) => sum + item.value, 0);
    const nonCurrentLiabilitiesSum = parsed.liabilities.nonCurrent.reduce((sum, item) => sum + item.value, 0);
    const liabilitiesSum = currentLiabilitiesSum + nonCurrentLiabilitiesSum;

    const equitySum = parsed.equity.reduce((sum, item) => sum + item.value, 0);

    const difference = assetsSum - (liabilitiesSum + equitySum);
    const isBalanced = Math.abs(difference) < 0.05;

    return NextResponse.json({
      connected: true,
      summary: {
        assets: assetsSum,
        liabilities: liabilitiesSum,
        equity: equitySum,
        isBalanced,
        difference: Math.round(difference * 100) / 100
      },
      assets: parsed.assets,
      liabilities: parsed.liabilities,
      equity: parsed.equity,
      meta: {
        currency: finalCurrency,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Balance Sheet report API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
