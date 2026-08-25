import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getXeroAccessToken, fetchXeroResource } from '@/lib/xero';
import { getTenantIdFromSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({
        enabled: false,
        totalCategories: 0,
        totalOptions: 0,
        categories: []
      });
    }
    let categories: any[] = [];
    let enabled = false;

    // Try live fetch
    if (tokenInfo) {
      try {
        const raw = await fetchXeroResource(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'TrackingCategories');
        if (raw && Array.isArray(raw)) {
          categories = raw;
          enabled = categories.length > 0;
          await db.saveReport(tenantId, 'TrackingCategories', categories);
        }
      } catch (err: any) {
        console.error('Failed to fetch Tracking Categories live:', err.message);
      }
    }

    // Try fallback to cache
    if (categories.length === 0) {
      const cached = await db.getReport(tenantId, 'TrackingCategories');
      if (cached && Array.isArray(cached)) {
        categories = cached;
        enabled = categories.length > 0;
      }
    }

    // Return option names alongside counts
    const formatted = categories.map(cat => ({
      name: cat.Name,
      status: cat.Status || 'ACTIVE',
      optionsCount: cat.Options ? cat.Options.length : 0,
      optionNames: cat.Options
        ? cat.Options.map((opt: any) => opt.Name).filter(Boolean)
        : []
    }));

    const totalOptions = formatted.reduce((sum, cat) => sum + cat.optionsCount, 0);

    return NextResponse.json({
      enabled,
      totalCategories: formatted.length,
      totalOptions,
      categories: formatted
    });

  } catch (err: any) {
    console.error('Tracking Categories KPI error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
