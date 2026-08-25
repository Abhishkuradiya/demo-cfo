import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken } from '@/lib/xero';

function getAccountGroup(type: string, cls?: string): 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses' | null {
  const c = (cls || '').toUpperCase();
  if (c === 'ASSET') return 'Assets';
  if (c === 'LIABILITY') return 'Liabilities';
  if (c === 'EQUITY') return 'Equity';
  if (c === 'REVENUE') return 'Revenue';
  if (c === 'EXPENSE') return 'Expenses';

  const t = (type || '').toUpperCase();
  if (['BANK', 'CURRENT', 'FIXED', 'INVENTORY', 'PREPAYMENT', 'ASSET'].includes(t)) {
    return 'Assets';
  }
  if (['CURRLIAB', 'TERMLIAB', 'LIABILITY', 'PAYMENT'].includes(t)) {
    return 'Liabilities';
  }
  if (t === 'EQUITY') {
    return 'Equity';
  }
  if (['REVENUE', 'SALES', 'OTHERINCOME'].includes(t)) {
    return 'Revenue';
  }
  if (['EXPENSE', 'DEPRECIATN', 'DIRECTCOSTS', 'OVERHEADS'].includes(t)) {
    return 'Expenses';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({
        totalAccounts: 0,
        distribution: {
          assets: 0,
          liabilities: 0,
          equity: 0,
          revenue: 0,
          expenses: 0
        }
      });
    }
    const cachedAccounts = await db.getAccounts(tenantId);
    
    // Only ACTIVE accounts
    const activeAccounts = cachedAccounts.filter(acc => acc.Status === 'ACTIVE');

    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let revenue = 0;
    let expenses = 0;

    for (const acc of activeAccounts) {
      const group = getAccountGroup(acc.Type || '', acc.Class || '');
      if (group === 'Assets') assets++;
      else if (group === 'Liabilities') liabilities++;
      else if (group === 'Equity') equity++;
      else if (group === 'Revenue') revenue++;
      else if (group === 'Expenses') expenses++;
    }

    const totalAccounts = activeAccounts.length;

    // If zero accounts are found, return real zeros (no fake data)
    if (totalAccounts === 0) {
      return NextResponse.json({
        totalAccounts: 0,
        distribution: {
          assets: 0,
          liabilities: 0,
          equity: 0,
          revenue: 0,
          expenses: 0
        }
      });
    }

    return NextResponse.json({
      totalAccounts,
      distribution: {
        assets,
        liabilities,
        equity,
        revenue,
        expenses
      }
    });
  } catch (err: any) {
    console.error('Accounts distribution KPI error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
