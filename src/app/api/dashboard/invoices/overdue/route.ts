import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromSession } from '@/lib/auth';
import { Pool } from 'pg';

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'virtual_cfo',
});

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const customer = searchParams.get('customer') || '';
  const statusFilter = searchParams.get('status') || '';
  const overdueBucket = searchParams.get('overdue_bucket') || '';
  const showFullyPaid = searchParams.get('show_fully_paid') === 'true';
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  try {
    const queryStr = `
      SELECT 
        id,
        invoice_number, 
        contact_name, 
        invoice_date, 
        due_date, 
        total, 
        amount_due, 
        amount_paid, 
        status, 
        type, 
        currency,
        CASE 
          WHEN due_date IS NOT NULL THEN (CURRENT_DATE - due_date::date)
          ELSE 0
        END as overdue_days
      FROM invoices
      WHERE tenant_id = $1 AND type = 'ACCREC'
    `;

    const result = await pgPool.query(queryStr, [tenantId]);
    let allInvoices: any[] = result.rows;

    // Filter by Date Range if provided
    if (fromDate || toDate) {
      allInvoices = allInvoices.filter((inv: any) => {
        if (!inv.invoice_date) return false;
        const invDateStr = new Date(inv.invoice_date).toISOString().slice(0, 10);
        if (fromDate && invDateStr < fromDate) return false;
        if (toDate && invDateStr > toDate) return false;
        return true;
      });
    }

    const overdueInvoices = allInvoices.filter((inv: any) => {
      const isUnpaid = (inv.status === 'AUTHORISED' || inv.status === 'SUBMITTED') && parseFloat(inv.amount_due) > 0;
      const isOverdue = parseInt(inv.overdue_days || '0', 10) > 0;
      return isUnpaid && isOverdue;
    });

    const totalOverdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount_due || 0), 0);
    const totalOverdueCount = overdueInvoices.length;
    const totalAccrecCount = allInvoices.length;
    const overduePercentage = totalAccrecCount > 0 ? (totalOverdueCount / totalAccrecCount) * 100 : 0;

    const avgOverdueDays = totalOverdueCount > 0
      ? Math.round(overdueInvoices.reduce((sum: number, inv: any) => sum + parseInt(inv.overdue_days || 0, 10), 0) / totalOverdueCount)
      : 0;

    const sortedByOverdue = [...overdueInvoices].sort((a: any, b: any) => parseInt(b.overdue_days || 0, 10) - parseInt(a.overdue_days || 0, 10));
    const oldestInvoice = sortedByOverdue[0] || null;

    const uniqueCustomers = Array.from(new Set(overdueInvoices.map((inv: any) => inv.contact_name).filter(Boolean)));

    const agingBuckets = {
      b0_30: { amount: 0, count: 0 },
      b31_60: { amount: 0, count: 0 },
      b61_90: { amount: 0, count: 0 },
      b91_180: { amount: 0, count: 0 },
      b181_plus: { amount: 0, count: 0 },
    };

    overdueInvoices.forEach((inv: any) => {
      const dueAmt = parseFloat(inv.amount_due || 0);
      const days = parseInt(inv.overdue_days || 0, 10);
      if (days <= 30) {
        agingBuckets.b0_30.amount += dueAmt;
        agingBuckets.b0_30.count += 1;
      } else if (days <= 60) {
        agingBuckets.b31_60.amount += dueAmt;
        agingBuckets.b31_60.count += 1;
      } else if (days <= 90) {
        agingBuckets.b61_90.amount += dueAmt;
        agingBuckets.b61_90.count += 1;
      } else if (days <= 180) {
        agingBuckets.b91_180.amount += dueAmt;
        agingBuckets.b91_180.count += 1;
      } else {
        agingBuckets.b181_plus.amount += dueAmt;
        agingBuckets.b181_plus.count += 1;
      }
    });

    const customerTotals: Record<string, number> = {};
    overdueInvoices.forEach((inv: any) => {
      const cName = inv.contact_name || 'Unknown Customer';
      customerTotals[cName] = (customerTotals[cName] || 0) + parseFloat(inv.amount_due || 0);
    });

    const topCustomers = Object.entries(customerTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    let filteredTable = showFullyPaid ? allInvoices : overdueInvoices;

    if (search.trim()) {
      const q = search.toLowerCase();
      filteredTable = filteredTable.filter((inv: any) =>
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.contact_name || '').toLowerCase().includes(q)
      );
    }

    if (customer) {
      filteredTable = filteredTable.filter((inv: any) => (inv.contact_name || '').toLowerCase() === customer.toLowerCase());
    }

    if (statusFilter) {
      filteredTable = filteredTable.filter((inv: any) => (inv.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (overdueBucket) {
      filteredTable = filteredTable.filter((inv: any) => {
        const d = parseInt(inv.overdue_days || 0, 10);
        if (overdueBucket === '0_30') return d <= 30;
        if (overdueBucket === '31_60') return d > 30 && d <= 60;
        if (overdueBucket === '61_90') return d > 60 && d <= 90;
        if (overdueBucket === '91_180') return d > 90 && d <= 180;
        if (overdueBucket === '181_plus') return d > 180;
        return true;
      });
    }

    filteredTable.sort((a: any, b: any) => parseInt(b.overdue_days || 0, 10) - parseInt(a.overdue_days || 0, 10));

    const totalFilteredCount = filteredTable.length;
    const startIndex = (page - 1) * limit;
    const paginatedInvoices = filteredTable.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      summary: {
        totalOverdueAmount,
        totalOverdueCount,
        avgOverdueDays,
        oldestInvoice: oldestInvoice ? {
          invoiceNumber: oldestInvoice.invoice_number,
          overdueDays: parseInt(oldestInvoice.overdue_days || 0, 10),
          customerName: oldestInvoice.contact_name
        } : null,
        uniqueCustomersCount: uniqueCustomers.length,
        overduePercentage
      },
      agingBuckets,
      topCustomers,
      customersList: uniqueCustomers,
      pagination: {
        page,
        limit,
        totalRecords: totalFilteredCount,
        totalPages: Math.ceil(totalFilteredCount / limit) || 1
      },
      invoices: paginatedInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerName: inv.contact_name || 'N/A',
        issueDate: inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : 'N/A',
        dueDate: inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : 'N/A',
        totalAmount: parseFloat(inv.total || 0),
        amountPaid: parseFloat(inv.amount_paid || 0),
        amountDue: parseFloat(inv.amount_due || 0),
        overdueDays: parseInt(inv.overdue_days || 0, 10) > 0 ? parseInt(inv.overdue_days, 10) : 0,
        status: parseInt(inv.overdue_days || 0, 10) > 0 && parseFloat(inv.amount_due || 0) > 0 ? 'OVERDUE' : (inv.status || 'PAID'),
        currency: inv.currency || 'GBP'
      }))
    });
  } catch (err: any) {
    console.error('Overdue Invoices API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
