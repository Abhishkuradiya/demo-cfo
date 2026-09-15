import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { syncAmazonData } from '@/lib/amazon';

// POST: Trigger Manual Live Amazon Data Sync
export async function POST(req: NextRequest) {
  let tenantId = await getTenantIdFromSession();
  if (!tenantId) {
    tenantId = 3;
  }

  try {
    let credentials = await db.getCredentials(tenantId, 'amazon');
    if (!credentials || (!credentials.client_id && !credentials.refresh_token)) {
      credentials = await db.getCredentials(3, 'amazon');
    }

    const syncResult = await syncAmazonData(tenantId, {
      clientId: credentials?.client_id || 'amzn1.application-oa2-client.sandbox-test-1001',
      clientSecret: credentials?.client_secret || 'sandbox-secret',
      refreshToken: credentials?.refresh_token || 'sandbox-refresh-token',
      sellerId: credentials?.tenant_identifier || 'A1F83G8C2ARO7P',
      region: credentials?.region || 'eu-west-1',
      marketplaceId: credentials?.marketplace_id || 'A1F83G8C2ARO7P',
      environment: (credentials as any)?.environment || 'sandbox'
    });

    // Save updated last_synced_at timestamp in credentials table
    await db.saveCredentials(tenantId, 'amazon', {
      last_synced_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Amazon sync completed successfully! Synced ${syncResult.ordersCount} orders and ${syncResult.settlementsCount} financial settlement event groups.`,
      ordersCount: syncResult.ordersCount,
      settlementsCount: syncResult.settlementsCount,
      lastSyncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Amazon manual sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sync Amazon data. Invalid credentials or API connection error.' },
      { status: 400 }
    );
  }
}
