import { db, parseXeroDate } from './db';
import { getXeroAccessToken } from './xero';

export interface GeneralLedgerSummary {
  total_transactions: number;
  this_month: number;
  last_entry: string;
}

export const XeroGeneralLedgerService = {
  /**
   * Fetch system journals using the offset-based pagination.
   */
  fetchXeroJournals: async (accessToken: string, xeroTenantId: string, offset = 0, retriesLeft = 3): Promise<any[]> => {
    const url = `https://api.xero.com/api.xro/2.0/Journals?offset=${offset}`;
    
    // Throttle to naturally pace concurrent requests
    await new Promise(resolve => setTimeout(resolve, 150));

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': xeroTenantId,
        'Accept': 'application/json'
      }
    });

    if (res.status === 429) {
      throw new Error(`Xero Journals API Rate Limit (429) Exceeded`);
    }

    if (!res.ok) {
      const text = await res.text();
      // Gracefully handle 403 (Advanced tier journals restriction) or 401 (scope not authorized yet)
      if (res.status === 403 || res.status === 401) {
        console.warn(`Journals endpoint is restricted/unauthorized (${res.status}). Skipping journals sync.`);
        return [];
      }
      throw new Error(`Xero Journals API error (Status ${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.Journals || [];
  },

  /**
   * Fetch manual journals using page-based pagination.
   */
  fetchXeroManualJournals: async (accessToken: string, xeroTenantId: string, page = 1): Promise<any[]> => {
    const url = `https://api.xero.com/api.xro/2.0/ManualJournals?page=${page}`;
    
    // Throttle to naturally pace concurrent requests
    await new Promise(resolve => setTimeout(resolve, 150));

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': xeroTenantId,
        'Accept': 'application/json'
      }
    });

    if (res.status === 429) {
      throw new Error(`Xero Manual Journals API Rate Limit (429) Exceeded`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Xero Manual Journals API error (Status ${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.ManualJournals || [];
  },

  /**
   * Synchronizes general ledger journals and manual journals.
   */
  syncGeneralLedger: async (tenantId: number): Promise<void> => {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) return;

    const { accessToken, xeroTenantId } = tokenInfo;

    // 1. Fetch Manual Journals (all pages)
    const allManual: any[] = [];
    let page = 1;
    let manualHasMore = true;
    while (manualHasMore) {
      try {
        const batch = await XeroGeneralLedgerService.fetchXeroManualJournals(accessToken, xeroTenantId, page);
        allManual.push(...batch);
        if (batch.length < 100) {
          manualHasMore = false;
        } else {
          page++;
        }
      } catch (e) {
        console.error(`Error syncing manual journals page ${page}:`, e);
        manualHasMore = false;
      }
    }
    await db.saveReport(tenantId, 'ManualJournals', allManual);

    // 2. Fetch System Journals (offset pagination up to 10 pages / 1000 journals for rate limits)
    const allSystem: any[] = [];
    let offset = 0;
    let systemHasMore = true;
    let calls = 0;
    while (systemHasMore && calls < 10) {
      try {
        const batch = await XeroGeneralLedgerService.fetchXeroJournals(accessToken, xeroTenantId, offset);
        if (batch.length === 0) {
          systemHasMore = false;
        } else {
          allSystem.push(...batch);
          const maxNum = Math.max(...batch.map(j => j.JournalNumber || 0));
          if (maxNum > offset) {
            offset = maxNum;
          } else {
            systemHasMore = false;
          }
          if (batch.length < 100) {
            systemHasMore = false;
          }
        }
        calls++;
      } catch (e) {
        console.error(`Error syncing system journals offset ${offset}:`, e);
        systemHasMore = false;
      }
    }
    await db.saveReport(tenantId, 'Journals', allSystem);
  },

  /**
   * Get General Ledger summary.
   * Leverages 10 minutes cache (600 seconds).
   */
  getGeneralLedger: async (tenantId: number, forceSync = false): Promise<GeneralLedgerSummary> => {
    const cacheKey = 'GeneralLedgerDashboardSummary';

    if (!forceSync) {
      const cached = await db.getGlCache(tenantId, cacheKey);
      if (cached) {
        return cached;
      }
    }

    const tokenInfo = await getXeroAccessToken(tenantId);
    let manualJournals = await db.getReport(tenantId, 'ManualJournals') || [];
    let systemJournals = await db.getReport(tenantId, 'Journals') || [];

    // Trigger sync if empty or forceSync
    if (forceSync || (tokenInfo && manualJournals.length === 0 && systemJournals.length === 0)) {
      try {
        await XeroGeneralLedgerService.syncGeneralLedger(tenantId);
        manualJournals = await db.getReport(tenantId, 'ManualJournals') || [];
        systemJournals = await db.getReport(tenantId, 'Journals') || [];
      } catch (e) {
        console.error('Failed to sync general ledger records:', e);
      }
    }

    // Combine journals and track dates
    const allEntries: { date: Date; raw: any }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Process system journals
    for (const j of systemJournals) {
      const d = j.CreatedDateUTC ? parseXeroDate(j.CreatedDateUTC) : (j.JournalDate ? parseXeroDate(j.JournalDate) : null);
      if (d) {
        allEntries.push({ date: d, raw: j });
      }
    }

    // Process manual journals
    for (const mj of manualJournals) {
      // Manual journals typically have 'Date' or 'UpdatedDateUTC'
      const d = mj.Date ? parseXeroDate(mj.Date) : (mj.UpdatedDateUTC ? parseXeroDate(mj.UpdatedDateUTC) : null);
      if (d) {
        allEntries.push({ date: d, raw: mj });
      }
    }

    // Calculate metrics
    const totalTransactions = allEntries.length;
    let thisMonthCount = 0;
    let latestDate: Date | null = null;

    for (const entry of allEntries) {
      // Check if entry belongs to the current calendar month and year
      if (entry.date.getFullYear() === currentYear && entry.date.getMonth() === currentMonth) {
        thisMonthCount++;
      }
      if (!latestDate || entry.date > latestDate) {
        latestDate = entry.date;
      }
    }

    let lastEntryStr = 'No transactions';
    if (latestDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      lastEntryStr = `${latestDate.getFullYear()}-${pad(latestDate.getMonth() + 1)}-${pad(latestDate.getDate())} ${pad(latestDate.getHours())}:${pad(latestDate.getMinutes())}`;
    }

    const summary: GeneralLedgerSummary = {
      total_transactions: totalTransactions,
      this_month: thisMonthCount,
      last_entry: lastEntryStr
    };

    // Cache summary for 10 minutes (600 seconds)
    await db.saveGlCache(tenantId, cacheKey, summary, 600);

    return summary;
  }
};
