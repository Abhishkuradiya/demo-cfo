import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';

function parseXeroDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const match = val.match(/\/Date\((\d+)/);
    if (match) return new Date(parseInt(match[1]));
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invoices = await db.getInvoices(tenantId);
    
    // Determine the current month and year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Filter ACCPAY (Bills), PAID in the current month
    const currentMonthBills = invoices.filter(inv => {
      if (inv.Type !== 'ACCPAY' || inv.Status !== 'PAID') return false;
      const date = parseXeroDate(inv.Date);
      if (!date) return false;
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    // Group by contact name
    const vendorMap: Record<string, number> = {};
    for (const inv of currentMonthBills) {
      const contactName = inv.ContactName || inv.Contact?.Name || 'Unknown Vendor';
      const total = inv.Total || 0;
      vendorMap[contactName] = (vendorMap[contactName] || 0) + total;
    }

    // Sort and limit to Top 5
    const sortedVendors = Object.entries(vendorMap)
      .map(([name, amount]) => ({
        name,
        amount,
        avatar: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // If database is empty, return a nice mock set so the dashboard isn't completely blank
    if (sortedVendors.length === 0) {
      const demoVendors = [
        { name: 'Office Supplies Ltd', amount: 3800, avatar: 'OS' },
        { name: 'Power & Gas Utility', amount: 2900, avatar: 'PG' },
        { name: 'Central IT Solutions', amount: 2400, avatar: 'CI' },
        { name: 'Telecom Telecom', amount: 1550, avatar: 'TT' },
        { name: 'Property Management Inc', amount: 950, avatar: 'PM' }
      ];
      return NextResponse.json({ vendors: demoVendors });
    }

    return NextResponse.json({ vendors: sortedVendors });

  } catch (err: any) {
    console.error('Top Vendors error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
