import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroResource } from '@/lib/xero';
import { XeroInventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

interface InventoryItemDTO {
  code: string;
  name: string;
  group: string;
  location: string;
  qtyOnHand: number;
  qtyAvailable: number;
  qtyReserved: number;
  unitCost: number;
  totalValue: number;
  status: 'In Stock' | 'Low Stock' | 'Dead Stock';
  lastMovement: string;
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const deadDays = parseInt(searchParams.get('dead_stock_days') || '90') || 90;

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    if (!tokenInfo) {
      return NextResponse.json({ connected: false });
    }
    
    const org = await db.getReport(tenantId, 'Organisation');
    const orgCurrency = org?.BaseCurrency || 'USD';

    // Fetch items from DB
    let rawItems = await db.getInventoryItems(tenantId);

    // Auto-hydrate items from Xero if DB is empty
    if ((!rawItems || rawItems.length === 0) && tokenInfo) {
      try {
        console.log(`[AutoSync] Hydrating inventory items from Xero for tenant ${tenantId}...`);
        const xeroItems = await fetchXeroResource(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'Items');
        if (xeroItems && xeroItems.length > 0) {
          await db.saveInventoryItems(tenantId, xeroItems);
          rawItems = await db.getInventoryItems(tenantId);
        }
      } catch (err: any) {
        console.error('[AutoSync] Error auto-hydrating Xero inventory items:', err.message);
      }
    }

    const thresholds = await db.getThresholds(tenantId);
    const thresholdMap = new Map(thresholds.map(t => [t.item_id, parseFloat(t.minimum_stock)]));
    
    const sales = await db.getSalesHistory(tenantId);
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

    // Process DB items or fallback if completely empty
    const itemsToProcess = (rawItems && rawItems.length > 0) ? rawItems : [];

    if (itemsToProcess.length === 0) {
      return NextResponse.json({
        connected: !!tokenInfo,
        summary: {
          inventoryValue: 0,
          realValue: 0,
          lowStockCount: 0,
          deadStockCount: 0,
          totalItems: 0
        },
        items: [],
        meta: {
          currency: orgCurrency,
          calculatedAt: new Date().toISOString()
        }
      });
    }

    const items: InventoryItemDTO[] = [];

    let totalValue = 0;
    let lowStockCount = 0;
    let deadStockCount = 0;

    itemsToProcess.forEach((item: any) => {
      const qtyOnHand = parseFloat(item.QuantityOnHand) || 0;
      const qtyAvailable = (parseFloat(item.QuantityOnHand) || 0) - (parseFloat(item.QuantityAllocated) || 0);
      const qtyReserved = parseFloat(item.QuantityAllocated) || 0;
      const unitCost = parseFloat(item.PurchaseDetails?.UnitPrice) || parseFloat(item.SalesDetails?.UnitPrice) || parseFloat(item.CostOfGoodsSold) || 0;
      
      const totalVal = qtyOnHand * unitCost;
      totalValue += totalVal;

      const itemName = (item.Name || item.Description || item.Code || 'Unnamed Item').trim();
      const text = `${item.Code || ''} ${itemName}`.toLowerCase();

      let group = 'General Products';
      if (text.includes('tab') || text.includes('crm') || text.includes('eye') || text.includes('drop') || text.includes('powder') || text.includes('cream') || text.includes('ointment') || text.includes('suppositor') || text.includes('caps') || text.includes('med') || text.includes('inf')) {
        group = 'Pharmacy & Healthcare';
      } else if (text.includes('cable') || text.includes('mouse') || text.includes('keyboard') || text.includes('monitor') || text.includes('usb') || text.includes('adapter') || text.includes('electronic')) {
        group = 'Electronics & Accessories';
      } else if (text.includes('chair') || text.includes('stand') || text.includes('office') || text.includes('mat') || text.includes('desk')) {
        group = 'Office Supplies';
      } else if (text.includes('tape') || text.includes('pen') || text.includes('ink') || text.includes('battery') || text.includes('consumable')) {
        group = 'Consumables';
      }

      let location = 'Main Warehouse';
      if (group === 'Pharmacy & Healthcare') {
        location = 'Pharmacy Dispensary';
      } else if (group === 'Consumables') {
        location = 'Store Room';
      } else if (group === 'Office Supplies') {
        location = 'Branch Office';
      }

      // Check status
      let status: 'In Stock' | 'Low Stock' | 'Dead Stock' = 'In Stock';
      const minStock = thresholdMap.get(item.ItemID) || 5; // Default threshold is 5
      
      if (qtyOnHand <= minStock && qtyOnHand > 0) {
        status = 'Low Stock';
        lowStockCount++;
      } else {
        // Check for dead stock (no sales in deadDays)
        const lastSoldDate = lastSoldMap.get(item.ItemID);
        let daysUnsold = 999;
        if (lastSoldDate) {
          const diff = new Date().getTime() - lastSoldDate.getTime();
          daysUnsold = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        }
        if (qtyOnHand > 0 && daysUnsold >= deadDays) {
          status = 'Dead Stock';
          deadStockCount++;
        }
      }

      items.push({
        code: item.Code || 'ITEM-UNKNOWN',
        name: itemName,
        group,
        location,
        qtyOnHand,
        qtyAvailable,
        qtyReserved,
        unitCost,
        totalValue: Math.round(totalVal * 100) / 100,
        status,
        lastMovement: lastSoldMap.get(item.ItemID)?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      });
    });

    return NextResponse.json({
      connected: true,
      summary: {
        inventoryValue: Math.round(totalValue * 100) / 100,
        realValue: Math.round(totalValue * 100) / 100,
        lowStockCount,
        deadStockCount,
        totalItems: items.length
      },
      items,
      meta: {
        currency: orgCurrency,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Inventory Details API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
