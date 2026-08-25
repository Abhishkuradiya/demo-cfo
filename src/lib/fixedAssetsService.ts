import { db } from './db';
import { getXeroAccessToken } from './xero';

export interface FixedAssetsSummary {
  total_assets: number;
  accumulated_depreciation: number;
  net_book_value: number;
  asset_count: number;
  last_synced: string;
}

export const XeroFixedAssetsService = {
  /**
   * Helper to fetch fixed assets from the Xero Fixed Assets API (which uses a different base URL).
   */
  fetchXeroAssets: async (accessToken: string, xeroTenantId: string, status: 'DRAFT' | 'REGISTERED' | 'DISPOSED', page = 1, pageSize = 200): Promise<any[]> => {
    const url = `https://api.xero.com/assets.xro/1.0/Assets?status=${status}&page=${page}&pageSize=${pageSize}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': xeroTenantId,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Xero Assets API error: ${errText}`);
    }

    const data = await res.json();
    return data.items || (Array.isArray(data) ? data : []);
  },

  /**
   * Synchronizes fixed assets from Xero and saves them to local database.
   * Ignore archived, disposed or deleted assets.
   * According to Xero API docs: DRAFT and REGISTERED are the active statuses.
   * DISPOSED assets are ignored.
   */
  syncFixedAssets: async (tenantId: number): Promise<void> => {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      throw new Error('Xero integration not connected');
    }

    const { accessToken, xeroTenantId } = tokenInfo;
    const activeStatuses: ('DRAFT' | 'REGISTERED')[] = ['DRAFT', 'REGISTERED'];
    const pageSize = 200;
    const allMappedAssets: any[] = [];

    for (const status of activeStatuses) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const assets = await XeroFixedAssetsService.fetchXeroAssets(accessToken, xeroTenantId, status, page, pageSize);
        
        for (const asset of assets) {
          const purchasePrice = asset.purchasePrice !== undefined && asset.purchasePrice !== null ? parseFloat(asset.purchasePrice) : 0;
          const accumDeprec = asset.bookDepreciationDetail?.currentAccumDepreciationAmount !== undefined && asset.bookDepreciationDetail?.currentAccumDepreciationAmount !== null
            ? parseFloat(asset.bookDepreciationDetail.currentAccumDepreciationAmount)
            : 0;
          const bookValue = asset.accountingBookValue !== undefined && asset.accountingBookValue !== null
            ? parseFloat(asset.accountingBookValue)
            : (purchasePrice - accumDeprec);

          allMappedAssets.push({
            external_id: asset.assetId,
            name: asset.assetName || 'Unnamed Asset',
            asset_number: asset.assetNumber || null,
            status: asset.assetStatus,
            purchase_date: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString() : null,
            purchase_price: purchasePrice,
            accumulated_depreciation: accumDeprec,
            book_value: bookValue,
            raw_data: asset
          });
        }

        if (assets.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Save mapping directly to db
    await db.saveFixedAssets(tenantId, allMappedAssets);

    // Save sync timestamp in tenant credentials
    await db.saveCredentials(tenantId, 'xero', {
      last_synced_at: new Date().toISOString()
    });
  },

  /**
   * Computes and returns the Fixed Assets Dashboard summary.
   * Leverages 10 minutes cache (600 seconds).
   */
  getDashboard: async (tenantId: number, forceSync = false): Promise<FixedAssetsSummary> => {
    const cacheKey = 'FixedAssetsDashboardSummary';
    
    if (!forceSync) {
      const cached = await db.getFixedAssetsCache(tenantId, cacheKey);
      if (cached) {
        return cached;
      }
    }

    // If cache missed or sync forced, verify sync
    if (forceSync) {
      await XeroFixedAssetsService.syncFixedAssets(tenantId);
    } else {
      // If we have no records in DB, trigger sync initially
      const existing = await db.getFixedAssets(tenantId);
      if (existing.length === 0) {
        try {
          await XeroFixedAssetsService.syncFixedAssets(tenantId);
        } catch (e) {
          console.error('Initial sync failed for fixed assets:', e);
        }
      }
    }

    // Fetch from database
    const assets = await db.getFixedAssets(tenantId);

    // Filter to double check we ignore archived, disposed or deleted assets
    // Since only DRAFT and REGISTERED were synced, this matches.
    const activeAssets = assets.filter(
      a => a.status === 'DRAFT' || a.status === 'REGISTERED'
    );

    let totalAssetsSum = 0;
    let accumDeprecSum = 0;
    let netBookValueSum = 0;

    for (const a of activeAssets) {
      totalAssetsSum += a.purchase_price;
      accumDeprecSum += a.accumulated_depreciation;
      netBookValueSum += a.book_value;
    }

    const credentials = await db.getCredentials(tenantId, 'xero');
    const lastSynced = credentials?.last_synced_at
      ? new Date(credentials.last_synced_at).toISOString().replace('T', ' ').substring(0, 16)
      : new Date().toISOString().replace('T', ' ').substring(0, 16);

    const summary: FixedAssetsSummary = {
      total_assets: parseFloat(totalAssetsSum.toFixed(2)),
      accumulated_depreciation: parseFloat(accumDeprecSum.toFixed(2)),
      net_book_value: parseFloat(netBookValueSum.toFixed(2)),
      asset_count: activeAssets.length,
      last_synced: lastSynced
    };

    // Cache summary for 10 minutes (600 seconds)
    await db.saveFixedAssetsCache(tenantId, cacheKey, summary, 600);

    return summary;
  }
};
