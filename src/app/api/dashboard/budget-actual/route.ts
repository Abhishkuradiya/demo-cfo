import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromSession } from '@/lib/auth';
import { XeroBudgetService } from '@/lib/budgetService';
import { getXeroAccessToken } from '@/lib/xero';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromDateParam = searchParams.get('from_date');
  const toDateParam = searchParams.get('to_date');
  const forceSync = searchParams.get('force_sync') === 'true';

  let startDate: Date;
  let endDate: Date;

  if (fromDateParam && toDateParam) {
    startDate = new Date(fromDateParam);
    endDate = new Date(toDateParam);
  } else {
    // Default to Apr 1, 2026 - Aug 31, 2026 to match reference mockup numbers
    startDate = new Date(2026, 3, 1); // 01 Apr 2026
    endDate = new Date(2026, 7, 31);   // 31 Aug 2026
  }

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false });
    }
    const summary = await XeroBudgetService.getBudgetVsActual(tenantId, startDate, endDate, forceSync);
    const org = await db.getReport(tenantId, 'Organisation');
    const currency = org?.BaseCurrency || 'USD';
    return NextResponse.json({ ...summary, connected: true, meta: { currency } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch budget vs actual data' }, { status: 500 });
  }
}
