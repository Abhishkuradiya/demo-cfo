import { db } from './db';

export interface InventorySummary {
  inventory_value: number;
  inventory_items: number;
  low_stock_items: number;
  dead_stock_items: number;
  last_synced: string;
}

export interface LowStockItem {
  itemId: string;
  name: string;
  code: string;
  currentQty: number;
  minimumQty: number;
}

export interface DeadStockItem {
  itemId: string;
  name: string;
  code: string;
  quantity: number;
  lastSold: string;
  daysUnsold: number;
}

export const XeroInventoryService = {
  /**
   * Calculates overall inventory value
   */
  calculateInventoryValue: (items: any[]) => {
    const trackedItems = items.filter(item => item.IsTrackedAsInventory === true);
    let totalValue = 0;
    let totalItems = 0;

    for (const item of trackedItems) {
      if (item.QuantityOnHand === undefined || item.QuantityOnHand === null) continue;
      const qty = parseFloat(item.QuantityOnHand) || 0;
      const unitPrice = parseFloat(item.PurchaseDetails?.UnitPrice) || 0;
      totalValue += qty * unitPrice;
      totalItems++;
    }

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalItems
    };
  },

  /**
   * Evaluates low stock items against database thresholds
   */
  calculateLowStock: async (tenantId: number, items: any[]): Promise<LowStockItem[]> => {
    const trackedItems = items.filter(item => item.IsTrackedAsInventory === true);
    const thresholds = await db.getThresholds(tenantId);
    const thresholdMap = new Map(thresholds.map(t => [t.item_id, parseFloat(t.minimum_stock)]));

    const lowStockList: LowStockItem[] = [];
    for (const item of trackedItems) {
      if (item.QuantityOnHand === undefined || item.QuantityOnHand === null) continue;
      const currentQty = parseFloat(item.QuantityOnHand) || 0;
      const minStock = thresholdMap.has(item.ItemID) ? thresholdMap.get(item.ItemID)! : 0;

      // If stock is below or equal to the minimum threshold, classify as Low Stock
      if (currentQty <= minStock) {
        lowStockList.push({
          itemId: item.ItemID,
          name: item.Name || 'Unnamed Item',
          code: item.Code,
          currentQty,
          minimumQty: minStock
        });
      }
    }

    return lowStockList;
  },

  /**
   * Identifies dead stock items unsold for more than N days
   */
  calculateDeadStock: async (tenantId: number, items: any[], deadStockDays = 90): Promise<DeadStockItem[]> => {
    const trackedItems = items.filter(item => item.IsTrackedAsInventory === true);
    const sales = await db.getSalesHistory(tenantId);
    const now = new Date();

    // Map item last sold date
    const lastSoldMap = new Map<string, Date>();
    for (const s of sales) {
      if (s.sold_at) {
        const d = new Date(s.sold_at);
        const prev = lastSoldMap.get(s.item_id);
        if (!prev || d > prev) {
          lastSoldMap.set(s.item_id, d);
        }
      }
    }

    const deadStockList: DeadStockItem[] = [];
    for (const item of trackedItems) {
      if (item.QuantityOnHand === undefined || item.QuantityOnHand === null) continue;
      const qty = parseFloat(item.QuantityOnHand) || 0;

      // Rule: QuantityOnHand > 0 AND unsold for N days
      if (qty > 0) {
        const lastSoldDate = lastSoldMap.get(item.ItemID);
        let daysUnsold = 999; // Default if never sold
        let lastSoldStr = 'Never Sold';

        if (lastSoldDate) {
          const diffTime = now.getTime() - lastSoldDate.getTime();
          daysUnsold = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          lastSoldStr = lastSoldDate.toISOString().split('T')[0];
        }

        if (daysUnsold >= deadStockDays) {
          deadStockList.push({
            itemId: item.ItemID,
            name: item.Name || 'Unnamed Item',
            code: item.Code,
            quantity: qty,
            lastSold: lastSoldStr,
            daysUnsold
          });
        }
      }
    }

    // Sort by longest unsold first
    deadStockList.sort((a, b) => b.daysUnsold - a.daysUnsold);
    return deadStockList;
  },

  /**
   * Aggregates inventory dashboard summary checking cache
   */
  getDashboard: async (tenantId: number, deadStockDays = 90): Promise<InventorySummary> => {
    const cacheKey = `InventoryDashboard_${deadStockDays}`;
    const cached = await db.getInventoryCache(tenantId, cacheKey);
    
    if (cached) {
      return cached;
    }

    const items = await db.getInventoryItems(tenantId);
    const { totalValue, totalItems } = XeroInventoryService.calculateInventoryValue(items);
    const lowStock = await XeroInventoryService.calculateLowStock(tenantId, items);
    const deadStock = await XeroInventoryService.calculateDeadStock(tenantId, items, deadStockDays);

    const credentials = await db.getCredentials(tenantId, 'xero');
    const lastSynced = credentials?.last_synced_at 
      ? new Date(credentials.last_synced_at).toISOString().replace('T', ' ').substring(0, 16)
      : new Date().toISOString().replace('T', ' ').substring(0, 16);

    const summary: InventorySummary = {
      inventory_value: totalValue,
      inventory_items: totalItems,
      low_stock_items: lowStock.length,
      dead_stock_items: deadStock.length,
      last_synced: lastSynced
    };

    // Cache results for 10 minutes (600 seconds)
    await db.saveInventoryCache(tenantId, cacheKey, summary, 600);

    return summary;
  }
};
