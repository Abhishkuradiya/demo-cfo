import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken } from '@/lib/xero';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({
        reconciliationPercentage: 0,
        unreconciledTransactions: 0,
        pendingTransactions: 0,
        lastReconciliation: "Never"
      });
    }
    const credentials = await db.getCredentials(tenantId, 'xero');
    let lastReconciliationDate = new Date();
    if (credentials?.last_synced_at) {
      const d = new Date(credentials.last_synced_at);
      if (!isNaN(d.getTime())) {
        lastReconciliationDate = d;
      }
    }

    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    const lastReconciliation = lastReconciliationDate.toLocaleDateString('en-US', options);

    // Compute real reconciliation data from the database
    const payments = await db.getPayments(tenantId);
    const bankTransactions = await db.getBankTransactions(tenantId);

    const reconciledTransactions = payments.filter((p: any) => p.IsReconciled === true).length;
    const unreconciledTransactions = payments.filter((p: any) => p.IsReconciled !== true).length + bankTransactions.filter((bt: any) => bt.IsReconciled !== true).length;
    const pendingTransactions = unreconciledTransactions;
    const totalTransactions = reconciledTransactions + unreconciledTransactions;
    const reconciliationPercentage = totalTransactions > 0 ? Math.round((reconciledTransactions / totalTransactions) * 100) : 0;

    return NextResponse.json({
      reconciliationPercentage,
      unreconciledTransactions,
      pendingTransactions,
      lastReconciliation
    });
  } catch (err: any) {
    console.error('Reconciliation KPI error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
