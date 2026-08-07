import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchXeroResource, fetchXeroReport, refreshXeroToken } from '@/lib/xero';
import { getTenantIdFromSession } from '@/lib/auth';
 
// GET retrieves Xero connection status and dynamic record counts for a tenant
export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 });
  }
 
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
        lastSyncedAt: credentials.last_synced_at || null,
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
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
 
  try {
    let body = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => null);
    }
 
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
    const counts: Record<string, number> = { contacts: 0, invoices: 0, payments: 0, accounts: 0, bankTransactions: 0, prepayments: 0, overpayments: 0, items: 0 };
 
    // Execute live fetches from Xero APIs in parallel and write cache
    try {
      const contacts = await fetchXeroResource(accessToken, xeroTenantId, 'Contacts');
      await db.saveCachedRecords(tenantId, 'contacts', contacts || []);
      // Cache raw contacts payload as report for dashboard metrics (Balances, IsCustomer, IsSupplier)
      await db.saveReport(tenantId, 'Contacts', contacts || []);
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

    // Sync Items for Inventory Dashboard
    try {
      const items = await fetchXeroResource(accessToken, xeroTenantId, 'Items');
      await db.saveInventoryItems(tenantId, items || []);
      counts.items = items?.length || 0;
    } catch(e) {
      console.error('Failed to sync Xero Items:', e);
    }

    // Sync detailed Invoice Line Items for inventory sales history (page=1,2 contains line items)
    try {
      const invoicesWithLinesPage1 = await fetchXeroResource(accessToken, xeroTenantId, 'Invoices', 'page=1');
      const invoicesWithLinesPage2 = await fetchXeroResource(accessToken, xeroTenantId, 'Invoices', 'page=2').catch(() => []);
      const allInvoicesWithLines = [...(invoicesWithLinesPage1 || []), ...(invoicesWithLinesPage2 || [])];

      const sales: any[] = [];
      const parseXeroDate = (dateStr: string) => {
        const match = dateStr.match(/\/Date\((\d+)/);
        return match ? new Date(parseInt(match[1])) : new Date(dateStr);
      };

      for (const inv of allInvoicesWithLines) {
        if (inv.Status === 'PAID' || inv.Status === 'AUTHORISED') {
          const soldAt = inv.Date ? parseXeroDate(inv.Date) : null;
          if (Array.isArray(inv.LineItems)) {
            for (const line of inv.LineItems) {
              const itemId = line.Item?.ItemID || line.ItemID;
              if (itemId) {
                sales.push({
                  item_id: itemId,
                  invoice_id: inv.InvoiceID,
                  quantity_sold: parseFloat(line.Quantity) || 0,
                  sold_at: soldAt ? soldAt.toISOString() : null
                });
              }
            }
          }
        }
      }
      await db.saveSalesHistory(tenantId, sales);
    } catch(e) {
      console.error('Failed to sync Invoice Line Items for inventory:', e);
    }

    // ── Cash Flow Sources ─────────────────────────────────────────
    // BankTransactions: Contains RECEIVE/SPEND money transactions.
    // Used by the Cash In engine to capture non-invoice cash receipts.
    try {
      const bankTxns = await fetchXeroResource(accessToken, xeroTenantId, 'BankTransactions');
      // Store as report (JSON blob) — avoids creating a new DB table
      await db.saveReport(tenantId, 'BankTransactions', bankTxns || []);
      counts.bankTransactions = bankTxns?.length || 0;
    } catch(e) {
      console.error('Failed to sync BankTransactions:', e);
    }

    // Prepayments: Customer advance payments before invoice issuance.
    // Only RECEIVE-PREPAYMENT type contributes to Cash In.
    try {
      const prepayments = await fetchXeroResource(accessToken, xeroTenantId, 'Prepayments');
      await db.saveReport(tenantId, 'Prepayments', prepayments || []);
      counts.prepayments = prepayments?.length || 0;
    } catch(e) {
      console.error('Failed to sync Prepayments:', e);
    }

    // Overpayments: Customer payments exceeding invoice amount.
    // Only RECEIVE-OVERPAYMENT type contributes to Cash In.
    try {
      const overpayments = await fetchXeroResource(accessToken, xeroTenantId, 'Overpayments');
      await db.saveReport(tenantId, 'Overpayments', overpayments || []);
      counts.overpayments = overpayments?.length || 0;
    } catch(e) {
      console.error('Failed to sync Overpayments:', e);
    }

    try {
      const organisations = await fetchXeroResource(accessToken, xeroTenantId, 'Organisations');
      if (organisations && organisations.length > 0) {
        await db.saveReport(tenantId, 'Organisation', organisations[0]);
      }
    } catch(e) {
      console.error('Failed to sync Organisation details:', e);
    }
 
    try {
      const plReport = await fetchXeroReport(accessToken, xeroTenantId, 'ProfitAndLoss');
      if (plReport) {
        await db.saveReport(tenantId, 'ProfitAndLoss', plReport);
      }
    } catch(e){
      console.error('Failed to sync ProfitAndLoss report:', e);
    }
 
    // Save last sync time in credentials database
    await db.saveCredentials(tenantId, 'xero', {
      last_synced_at: new Date().toISOString()
    });
 
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
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
 
  try {
    await db.deleteCredentials(tenantId, 'xero');
    await db.clearCachedRecords(tenantId);
    return NextResponse.json({ success: true, message: 'Xero integration cleared.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Disconnect failed' }, { status: 500 });
  }
}
