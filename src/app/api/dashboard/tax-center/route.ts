import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromSession } from '@/lib/auth';
import { XeroTaxService } from '@/lib/taxService';
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
  const taxType = searchParams.get('tax_type') || undefined;
  const status = searchParams.get('status') || undefined;

  let startDate: Date;
  let endDate: Date;

  if (fromDateParam && toDateParam) {
    startDate = new Date(fromDateParam);
    endDate = new Date(toDateParam);
  } else {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
  }

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false }, {
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      });
    }
    const filters = (taxType || status) ? { taxType, status } : undefined;
    const summary = await XeroTaxService.getTaxSummary(tenantId, startDate, endDate, forceSync, filters);
    const org = await db.getReport(tenantId, 'Organisation');
    const currency = org?.BaseCurrency || 'USD';
    return NextResponse.json(
      { ...summary, connected: true, meta: { currency } },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch tax summary data' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      }
    );
  }
}
