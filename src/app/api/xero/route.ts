import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchXeroResource, fetchXeroReport, refreshXeroToken } from '@/lib/xero';
import { getTenantIdFromSession } from '@/lib/auth';
import { XeroFixedAssetsService } from '@/lib/fixedAssetsService';
import { XeroGeneralLedgerService } from '@/lib/generalLedgerService';
import { TaxSyncService } from '@/lib/services/TaxSyncService';
 
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
 
      // Fetch all connected organisations from Xero
      let connections: any[] = [];
      try {
        let accessToken = credentials.access_token;
        if (new Date(credentials.expires_at) <= new Date()) {
          accessToken = await refreshXeroToken(tenantId, credentials);
        }
        
        const connectionsRes = await fetch('https://api.xero.com/connections', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        if (connectionsRes.ok) {
          const allConns = await connectionsRes.json();
          connections = allConns
            .filter((c: any) => c.tenantType === 'ORGANISATION')
            .map((c: any) => ({
              xeroTenantId: c.tenantId,
              name: c.tenantName
            }));
        }
      } catch (err) {
        console.error('Failed to fetch Xero connections for switcher:', err);
      }

      if (connections.length === 0) {
        connections = [{ xeroTenantId: credentials.tenant_identifier, name: orgName }];
      }

      return NextResponse.json({
        connected: true,
        organisation: orgName,
        records: totalRecords,
        lastSyncedAt: credentials.last_synced_at || null,
        connections,
        activeXeroTenantId: credentials.tenant_identifier,
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

    // CASE C: SWITCH ACTIVE ORGANISATION
    if (body && body.switchXeroTenantId && body.organisationName) {
      const newXeroTenantId = body.switchXeroTenantId;
      const orgName = body.organisationName;

      // 1. Save new active Xero tenant ID in credentials (which clears cache automatically if changed)
      await db.saveCredentials(tenantId, 'xero', {
        tenant_identifier: newXeroTenantId
      });

      // 2. Update the local tenant company name to match the switched organisation
      await db.updateTenantName(tenantId, orgName);

      // 3. Force clean cache database records for this tenant
      await db.clearCachedRecords(tenantId);

      return NextResponse.json({
        success: true,
        message: `Successfully switched to organisation: ${orgName}. Database cache has been cleared, sync required.`
      });
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

    // Verify token validity by calling Xero Organisations API first
    try {
      await fetchXeroResource(accessToken, xeroTenantId, 'Organisations');
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('TokenExpired')) {
        console.log('[Sync] Cached token is expired or invalid on Xero API. Attempting forced refresh...');
        try {
          accessToken = await refreshXeroToken(tenantId, credentials);
          console.log('[Sync] Force token refresh succeeded.');
        } catch (refreshErr: any) {
          console.error('[Sync] Force token refresh failed:', refreshErr.message);
          return NextResponse.json({
            success: false,
            message: 'Xero session expired or unauthorized. Please disconnect and reconnect your Xero account in Data Sources.'
          }, { status: 401 });
        }
      } else {
        console.error('[Sync] Connection check error:', err.message);
      }
    }

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

    // Sync Fixed Assets
    try {
      await XeroFixedAssetsService.syncFixedAssets(tenantId);
      // Clear fixed assets dashboard summary cache to force reload
      await db.saveFixedAssetsCache(tenantId, 'FixedAssetsDashboardSummary', null, 0);
    } catch (e) {
      console.error('Failed to sync Fixed Assets:', e);
    }

    // Sync General Ledger
    try {
      await XeroGeneralLedgerService.syncGeneralLedger(tenantId);
      // Clear general ledger dashboard cache
      await db.saveGlCache(tenantId, 'GeneralLedgerDashboardSummary', null, 0);
    } catch (e) {
      console.error('Failed to sync General Ledger:', e);
    }

    // Sync detailed Invoice Line Items for inventory sales history and tax calculations (fully paginated)
    try {
      const allInvoicesWithLines: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 100) { // Limit to 100 pages max to prevent infinite loop
        try {
          // Pause 250ms to stay within Xero's 5 requests/sec rate limits
          await new Promise(resolve => setTimeout(resolve, 250));
          const pageData = await fetchXeroResource(
            accessToken, 
            xeroTenantId, 
            'Invoices', 
            `page=${page}&where=Status=="PAID" OR Status=="AUTHORISED" OR Status=="DRAFT"`
          );
          if (pageData && pageData.length > 0) {
            allInvoicesWithLines.push(...pageData);
            if (pageData.length < 100) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } catch (err) {
          console.error(`Error fetching Invoice page ${page}:`, err);
          hasMore = false;
        }
      }

      // Overwrite raw caches and reports with detailed line-item invoices
      if (allInvoicesWithLines.length > 0) {
        await db.saveCachedRecords(tenantId, 'invoices', allInvoicesWithLines);
        await db.saveReport(tenantId, 'Invoices', allInvoicesWithLines);
        counts.invoices = allInvoicesWithLines.length;
      }

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

    // Sync CreditNotes for tax adjustments
    try {
      const allCreditNotes: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 10) {
        try {
          // Pause 250ms to stay within Xero's 5 requests/sec rate limits
          await new Promise(resolve => setTimeout(resolve, 250));
          const pageData = await fetchXeroResource(accessToken, xeroTenantId, 'CreditNotes', `page=${page}`);
          if (pageData && pageData.length > 0) {
            allCreditNotes.push(...pageData);
            if (pageData.length < 100) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } catch (err) {
          console.error(`Error fetching CreditNotes page ${page}:`, err);
          hasMore = false;
        }
      }
      await db.saveReport(tenantId, 'CreditNotes', allCreditNotes);
    } catch (e) {
      console.error('Failed to sync CreditNotes:', e);
    }

    // Sync TaxRates master data
    try {
      const taxRates = await fetchXeroResource(accessToken, xeroTenantId, 'TaxRates');
      await db.saveReport(tenantId, 'TaxRates', taxRates || []);
    } catch (e) {
      console.error('Failed to sync TaxRates:', e);
    }

    // Trigger normalization/sync of tax transactions
    try {
      await TaxSyncService.syncTaxTransactions(tenantId);
    } catch (e) {
      console.error('Failed to process TaxSyncService:', e);
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
 
    // Clear derived dashboard page caches so that fresh sync data is calculated and displayed
    try {
      await db.clearDerivedCaches(tenantId);
    } catch (e) {
      console.error('Failed to clear derived caches on sync:', e);
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
