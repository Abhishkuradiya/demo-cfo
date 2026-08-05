import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
 
// GET retrieves Xero connection status and dynamic record counts for a tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantIdStr = searchParams.get('tenant_id') || '1';
  const tenantId = parseInt(tenantIdStr);
 
  try {
    const credentials = await db.getCredentials(tenantId, 'xero');
    
    if (credentials && credentials.access_token && credentials.tenant_identifier) {
      // Fetch dynamic record counts from database cache
      const counts = await db.getSyncCounts(tenantId);
      const totalRecords = Object.values(counts).reduce((a: any, b: any) => a + b, 0);
 
      // Fetch active tenant name to display organisation
      const tenantsList = await db.getTenants();
      const activeTenant = tenantsList.find(t => t.id === tenantId);
      const orgName = activeTenant ? activeTenant.name : 'Connected Organization';
 
      return NextResponse.json({
        connected: true,
        organisation: orgName,
        records: totalRecords,
        ...counts
      });
    }
    
    return NextResponse.json({ connected: false });
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message || 'Error checking connection' });
  }
}
 
// POST saves credentials config OR executes dynamic Xero API synchronization
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantIdStr = searchParams.get('tenant_id') || '1';
  const tenantId = parseInt(tenantIdStr);
 
  try {
    const body = await req.json().catch(() => null);
 
    // CASE A: SAVE CONFIG
    if (body && body.clientId && body.clientSecret) {
      await db.saveCredentials(tenantId, 'xero', {
        client_id: body.clientId,
        client_secret: body.clientSecret
      });
      return NextResponse.json({ success: true, message: 'Xero configuration saved.' });
    }
 
    // CASE B: START ACTIVE SYNC FROM XERO API
    const credentials = await db.getCredentials(tenantId, 'xero');
    if (!credentials || !credentials.access_token) {
      return NextResponse.json({
        success: false,
        message: 'No active connection credentials found for this tenant.'
      }, { status: 400 });
    }
 
    let accessToken = credentials.access_token;
    
    // Refresh Xero token if expired
    if (new Date(credentials.expires_at) <= new Date()) {
      try {
        accessToken = await refreshXeroToken(tenantId, credentials);
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: 'OAuth Token refresh failed: ' + err.message
        }, { status: 401 });
      }
    }
 
    const xeroTenantId = credentials.tenant_identifier;
    const counts = { contacts: 0, invoices: 0, payments: 0, accounts: 0 };
 
    // Execute live fetches from Xero APIs in parallel and write cache
    try {
      const contacts = await fetchXeroResource(accessToken, xeroTenantId, 'Contacts');
      await db.saveCachedRecords(tenantId, 'contacts', contacts || []);
      counts.contacts = contacts?.length || 0;
    } catch(e){}
 
    try {
      const invoices = await fetchXeroResource(accessToken, xeroTenantId, 'Invoices');
      await db.saveCachedRecords(tenantId, 'invoices', invoices || []);
      counts.invoices = invoices?.length || 0;
    } catch(e){}
 
    try {
      const payments = await fetchXeroResource(accessToken, xeroTenantId, 'Payments');
      await db.saveCachedRecords(tenantId, 'payments', payments || []);
      counts.payments = payments?.length || 0;
    } catch(e){}
 
    try {
      const accounts = await fetchXeroResource(accessToken, xeroTenantId, 'Accounts');
      await db.saveCachedRecords(tenantId, 'accounts', accounts || []);
      counts.accounts = accounts?.length || 0;
    } catch(e){}
 
    return NextResponse.json({
      success: true,
      message: 'Accounting data synchronized successfully!',
      counts
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Synchronization failed' }, { status: 500 });
  }
}
 
// DELETE wipes credentials and drops caches
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantIdStr = searchParams.get('tenant_id') || '1';
  const tenantId = parseInt(tenantIdStr);
 
  try {
    await db.deleteCredentials(tenantId, 'xero');
    await db.clearCachedRecords(tenantId);
    return NextResponse.json({ success: true, message: 'Xero integration cleared.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Disconnect failed' }, { status: 500 });
  }
}
 
// Helper: Refresh Xero OAuth Token
async function refreshXeroToken(tenantId: number, credentials: any): Promise<string> {
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const basicAuth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64');
 
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token
    })
  });
 
  if (!response.ok) {
    throw new Error('Failed to refresh credentials with Xero Token Server.');
  }
 
  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
 
  await db.saveCredentials(tenantId, 'xero', {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    scopes: data.scope.split(' ')
  });
 
  return data.access_token;
}
 
// Helper: Fetch individual resource collections from Xero accounting endpoints
async function fetchXeroResource(accessToken: string, xeroTenantId: string, resource: string): Promise<any[]> {
  const url = `https://api.xero.com/api.xro/2.0/${resource}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Accept': 'application/json'
    }
  });
 
  if (!res.ok) {
    throw new Error(`Failed to fetch Xero resource [${resource}]`);
  }
 
  const data = await res.json();
  return data[resource] || [];
}
