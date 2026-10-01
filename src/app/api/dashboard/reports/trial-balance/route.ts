import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroReport, fetchXeroResource } from '@/lib/xero';

export const dynamic = 'force-dynamic';

interface TrialBalanceAccount {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  netBalance: number;
}

function parseTrialBalance(report: any) {
  const accounts: TrialBalanceAccount[] = [];
  let currency = 'USD';

  if (!report || !report.Rows) {
    return { accounts, currency };
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

  const getRowValue = (row: any, cellIndex: number): number => {
    if (!row || !row.Cells || row.Cells.length <= cellIndex) return 0;
    const val = row.Cells[cellIndex].Value || '';
    if (val === '-' || !val) return 0;
    return parseFloat(val.replace(/,/g, '')) || 0;
  };

  // Find correct cell indices for Debit and Credit
  let debitIndex = 1;
  let creditIndex = 2;
  
  if (report.Rows && report.Rows.length > 0) {
    const headerRow = report.Rows.find((r: any) => r.RowType === 'Header');
    if (headerRow && headerRow.Cells) {
      const headers = headerRow.Cells.map((c: any) => (c.Value || '').toLowerCase().trim());
      const ytdDebitIdx = headers.indexOf('ytd debit');
      const ytdCreditIdx = headers.indexOf('ytd credit');
      if (ytdDebitIdx !== -1 && ytdCreditIdx !== -1) {
        debitIndex = ytdDebitIdx;
        creditIndex = ytdCreditIdx;
      } else {
        const ytdDebitLike = headers.findIndex((h: string) => h.includes('ytd') && h.includes('debit'));
        const ytdCreditLike = headers.findIndex((h: string) => h.includes('ytd') && h.includes('credit'));
        if (ytdDebitLike !== -1 && ytdCreditLike !== -1) {
          debitIndex = ytdDebitLike;
          creditIndex = ytdCreditLike;
        }
      }
    }
  }

  const classifyType = (code: string, name: string): string => {
    const codeNum = parseInt(code);
    const nameLower = name.toLowerCase();

    if (!isNaN(codeNum)) {
      if (codeNum >= 100 && codeNum < 200) {
        if (codeNum >= 120) return 'Fixed Asset';
        if (code === '111') return 'Bank';
        if (code === '112') return 'Accounts Receivable';
        return 'Other Current Asset';
      }
      if (codeNum >= 200 && codeNum < 300) {
        if (codeNum >= 220) return 'Long Term Liability';
        if (code === '211') return 'Accounts Payable';
        return 'Other Current Liability';
      }
      if (codeNum >= 300 && codeNum < 400) return 'Equity';
      if (codeNum >= 400 && codeNum < 500) return 'Revenue';
      if (codeNum >= 500) return 'Expense';
    }

    // Classify based on keywords in name if code is missing or custom
    if (nameLower.includes('bank') || nameLower.includes('cash')) return 'Bank';
    if (nameLower.includes('receivable') || nameLower.includes('debtors')) return 'Accounts Receivable';
    if (nameLower.includes('payable') || nameLower.includes('creditors')) return 'Accounts Payable';
    if (nameLower.includes('asset')) return 'Fixed Asset';
    if (nameLower.includes('loan') || nameLower.includes('liability')) return 'Long Term Liability';
    if (nameLower.includes('equity') || nameLower.includes('retained')) return 'Equity';
    if (nameLower.includes('revenue') || nameLower.includes('sales') || nameLower.includes('income')) return 'Revenue';
    return 'Expense';
  };

  const traverse = (rows: any[]) => {
    for (const item of rows) {
      if (item.RowType === 'Row' && item.Cells && item.Cells.length >= 3) {
        const firstCell = (item.Cells[0].Value || '').trim();
        if (!firstCell || firstCell.toLowerCase().includes('total')) continue;

        // Split code and name (e.g. "111 - Cash at Bank" or "Cash at Bank (111)")
        let code = '';
        let name = firstCell;
        
        const splitMatch = firstCell.match(/^(\d+)\s*[-:]?\s*(.*)$/);
        const parenMatch = firstCell.match(/^(.*)\s*\((\d+)\)$/);

        if (parenMatch) {
          code = parenMatch[2];
          name = parenMatch[1].trim();
        } else if (splitMatch) {
          code = splitMatch[1];
          name = splitMatch[2].trim();
        }

        const debit = getRowValue(item, debitIndex);
        const credit = getRowValue(item, creditIndex);
        
        // Calculate Net Balance: Debits are positive, Credits are negative
        const type = classifyType(code, name);
        const isCreditType = type.includes('Liability') || type === 'Equity' || type === 'Revenue' || type === 'Accounts Payable';
        const netBalance = isCreditType ? (debit - credit) : (debit - credit);

        accounts.push({
          code,
          name,
          type,
          debit,
          credit,
          netBalance
        });
      }
      if (item.Rows) {
        traverse(item.Rows);
      }
    }
  };

  traverse(report.Rows);

  return { accounts, currency };
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false });
    }

    let targetDate = date;
    if (!targetDate) {
      const today = new Date();
      targetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    const cacheKey = `TrialBalance_${targetDate}`;
    let report = await db.getReport(tenantId, cacheKey);

    if (!report && tokenInfo) {
      try {
        report = await fetchXeroReport(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'TrialBalance', `date=${targetDate}`);
        if (report) {
          await db.saveReport(tenantId, cacheKey, report);
        }
      } catch (e: any) {
        console.error('Failed to fetch Trial Balance from Xero:', e);
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
        connected: !!tokenInfo,
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          difference: 0,
          balanced: true
        },
        accounts: [],
        meta: { currency: orgCurrency, calculatedAt: new Date().toISOString() }
      });
    }

    const parsed = parseTrialBalance(report);
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
    const totalDebit = parsed.accounts.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = parsed.accounts.reduce((sum, item) => sum + item.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const balanced = difference < 0.01;

    return NextResponse.json({
      connected: true,
      summary: {
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        balanced
      },
      accounts: parsed.accounts,
      meta: {
        currency: finalCurrency,
        calculatedAt: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (err: any) {
    console.error('Trial Balance API handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
