import { NextRequest, NextResponse } from 'next/server';
import { db, parseXeroDate } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroResource } from '@/lib/xero';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const asOnDateStr = searchParams.get('as_on_date') || new Date().toISOString().split('T')[0];
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const vendorFilter = (searchParams.get('vendor') || 'ALL').toLowerCase().trim();

  try {
    const tokenInfo = await getXeroAccessToken(tenantId);
    const isConnected = !!tokenInfo;

    // 1. Fetch Base Currency
    let orgReport = await db.getReport(tenantId, 'Organisation');
    if (!orgReport && isConnected) {
      try {
        const rawOrg = await fetchXeroResource(tokenInfo.accessToken, tokenInfo.xeroTenantId, 'Organisation');
        if (rawOrg && rawOrg.length > 0) {
          orgReport = rawOrg[0];
          await db.saveReport(tenantId, 'Organisation', orgReport);
        }
      } catch (err: any) {
        console.error('Failed to sync Organisation report:', err.message);
      }
    }
    const currency = orgReport?.raw_data?.BaseCurrency || orgReport?.BaseCurrency || orgReport?.CurrencyCode || 'GBP';

    // 2. Fetch Bills from Xero API or Database
    let rawInvoicesList: any[] = [];
    if (isConnected) {
      try {
        const xeroBills = await fetchXeroResource(
          tokenInfo.accessToken,
          tokenInfo.xeroTenantId,
          'Invoices',
          'where=(Type=="ACCPAY")'
        );
        if (Array.isArray(xeroBills) && xeroBills.length > 0) {
          rawInvoicesList = xeroBills;
        }
      } catch (err: any) {
        console.error('Failed to fetch Xero ACCPAY bills:', err.message);
      }
    }

    if (rawInvoicesList.length === 0) {
      const pgInvoices = await db.getInvoices(tenantId);
      if (Array.isArray(pgInvoices) && pgInvoices.length > 0) {
        rawInvoicesList = pgInvoices.filter((inv: any) => {
          const t = (inv.Type || inv.type || '').toUpperCase();
          return t === 'ACCPAY';
        });
      } else {
        const reportInvoices = await db.getReport(tenantId, 'Invoices');
        if (Array.isArray(reportInvoices) && reportInvoices.length > 0) {
          rawInvoicesList = reportInvoices.filter((inv: any) => {
            const t = (inv.Type || inv.type || '').toUpperCase();
            return t === 'ACCPAY';
          });
        }
      }
    }

    const asOnDate = new Date(asOnDateStr);
    asOnDate.setHours(23, 59, 59, 999);

    // Filter strictly to Vendor Bills / Payables (ACCPAY) issued ON or BEFORE asOnDate
    const accpayBills = rawInvoicesList.filter((inv: any) => {
      const t = (inv.Type || inv.type || '').toUpperCase();
      if (t !== 'ACCPAY') return false;

      const invDate = parseXeroDate(inv.Date || inv.invoice_date);
      if (invDate && invDate.getTime() > asOnDate.getTime()) {
        return false; // Exclude bills issued after selected asOnDate
      }
      return true;
    });

    // Map & process bill ageing
    const processedBills = accpayBills.map((inv: any) => {
      const st = (inv.Status || inv.status || 'DRAFT').toUpperCase();
      const invDate = parseXeroDate(inv.Date || inv.invoice_date);
      const invDueDate = parseXeroDate(inv.DueDate || inv.due_date);
      const total = parseFloat(inv.Total || inv.total || 0);
      const amountDue = parseFloat(inv.AmountDue || inv.amount_due || (st === 'PAID' ? 0 : total));
      const amountPaid = parseFloat(inv.AmountPaid || inv.amount_paid || (st === 'PAID' ? total : 0));

      let displayStatus = st;
      if (st === 'AUTHORISED') displayStatus = 'AWAITING PAYMENT';
      else if (st === 'SUBMITTED') displayStatus = 'AWAITING APPROVAL';

      // Ageing calculation relative to asOnDate
      let daysOverdue = 0;
      let ageingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+' = 'current';

      if (invDueDate && amountDue > 0 && st !== 'PAID' && st !== 'DRAFT') {
        const diffMs = asOnDate.getTime() - invDueDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          daysOverdue = diffDays;
          if (diffDays <= 30) ageingBucket = '1-30';
          else if (diffDays <= 60) ageingBucket = '31-60';
          else if (diffDays <= 90) ageingBucket = '61-90';
          else ageingBucket = '90+';
        }
      }

      return {
        id: inv.InvoiceID || inv.external_id || inv.id || inv.InvoiceNumber || inv.invoice_number,
        billNumber: inv.InvoiceNumber || inv.invoice_number || '—',
        vendorName: inv.Contact?.Name || inv.ContactName || inv.contact_name || 'Unknown Vendor',
        vendorId: inv.Contact?.ContactID || inv.contact_id || '',
        status: displayStatus,
        rawStatus: st,
        type: 'ACCPAY',
        date: invDate ? invDate.toISOString() : null,
        dueDate: invDueDate ? invDueDate.toISOString() : null,
        total,
        amountDue,
        amountPaid,
        daysOverdue,
        ageingBucket,
        reference: inv.Reference || inv.reference || '—',
        currency: inv.CurrencyCode || inv.currency || currency,
        lineItems: Array.isArray(inv.LineItems || inv.line_items)
          ? (inv.LineItems || inv.line_items).map((item: any) => ({
              description: item.Description || item.description || 'Line Item',
              quantity: parseFloat(item.Quantity || item.quantity || 1),
              unitAmount: parseFloat(item.UnitAmount || item.unit_amount || 0),
              lineAmount: parseFloat(item.LineAmount || item.line_amount || 0),
              accountCode: item.AccountCode || item.account_code || ''
            }))
          : []
      };
    });

    // Unpaid & Active Payables (for Ageing calculations)
    const activePayables = processedBills.filter(inv => inv.amountDue > 0 && inv.rawStatus !== 'PAID' && inv.rawStatus !== 'VOIDED');

    // KPI Summary Calculations
    let totalPayables = 0;
    let currentNotDue = 0;
    let days1to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;
    let overdueBillsCount = 0;

    activePayables.forEach(inv => {
      totalPayables += inv.amountDue;
      if (inv.daysOverdue <= 0) {
        currentNotDue += inv.amountDue;
      } else {
        overdueBillsCount++;
        if (inv.daysOverdue <= 30) days1to30 += inv.amountDue;
        else if (inv.daysOverdue <= 60) days31to60 += inv.amountDue;
        else if (inv.daysOverdue <= 90) days61to90 += inv.amountDue;
        else days90Plus += inv.amountDue;
      }
    });

    const getPct = (val: number) => totalPayables > 0 ? ((val / totalPayables) * 100).toFixed(2) : '0.00';

    const kpiSummary = {
      totalPayables: { amount: totalPayables, pct: '100.00' },
      currentNotDue: { amount: currentNotDue, pct: getPct(currentNotDue) },
      days1to30: { amount: days1to30, pct: getPct(days1to30) },
      days31to60: { amount: days31to60, pct: getPct(days31to60) },
      days61to90: { amount: days61to90, pct: getPct(days61to90) },
      days90Plus: { amount: days90Plus, pct: getPct(days90Plus) },
      overdueBills: { count: overdueBillsCount, totalOverdue: totalPayables - currentNotDue }
    };

    // Payables Trend (Last 6 Months)
    const monthLabels: string[] = [];
    const trendSeries = {
      current: [0, 0, 0, 0, 0, 0],
      days1to30: [0, 0, 0, 0, 0, 0],
      days31to60: [0, 0, 0, 0, 0, 0],
      days61to90: [0, 0, 0, 0, 0, 0],
      days90Plus: [0, 0, 0, 0, 0, 0]
    };

    for (let i = 5; i >= 0; i--) {
      const d = new Date(asOnDate.getFullYear(), asOnDate.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      const mIdx = 5 - i;
      const targetMonthYear = `${d.getFullYear()}-${d.getMonth()}`;

      processedBills.forEach(inv => {
        if (!inv.date) return;
        const invD = new Date(inv.date);
        if (`${invD.getFullYear()}-${invD.getMonth()}` === targetMonthYear) {
          if (inv.ageingBucket === 'current') trendSeries.current[mIdx] += inv.amountDue;
          else if (inv.ageingBucket === '1-30') trendSeries.days1to30[mIdx] += inv.amountDue;
          else if (inv.ageingBucket === '31-60') trendSeries.days31to60[mIdx] += inv.amountDue;
          else if (inv.ageingBucket === '61-90') trendSeries.days61to90[mIdx] += inv.amountDue;
          else if (inv.ageingBucket === '90+') trendSeries.days90Plus[mIdx] += inv.amountDue;
        }
      });
    }

    // Top Overdue Bills (Sorted by daysOverdue descending)
    const topOverdueBills = activePayables
      .filter(inv => inv.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    // Vendor Aggregation Table
    const vendorMap = new Map<string, {
      vendorName: string;
      totalBills: number;
      totalPayables: number;
      currentNotDue: number;
      days1to30: number;
      days31to60: number;
      days61to90: number;
      days90Plus: number;
      overdueCount: number;
      bills: any[];
    }>();

    activePayables.forEach(inv => {
      const name = inv.vendorName;
      if (!vendorMap.has(name)) {
        vendorMap.set(name, {
          vendorName: name,
          totalBills: 0,
          totalPayables: 0,
          currentNotDue: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          overdueCount: 0,
          bills: []
        });
      }
      const vendor = vendorMap.get(name)!;
      vendor.totalBills++;
      vendor.totalPayables += inv.amountDue;
      vendor.bills.push(inv);

      if (inv.daysOverdue <= 0) {
        vendor.currentNotDue += inv.amountDue;
      } else {
        vendor.overdueCount++;
        if (inv.daysOverdue <= 30) vendor.days1to30 += inv.amountDue;
        else if (inv.daysOverdue <= 60) vendor.days31to60 += inv.amountDue;
        else if (inv.daysOverdue <= 90) vendor.days61to90 += inv.amountDue;
        else vendor.days90Plus += inv.amountDue;
      }
    });

    let vendorSummaryList = Array.from(vendorMap.values()).map(vendor => {
      const totalOverdue = vendor.days1to30 + vendor.days31to60 + vendor.days61to90 + vendor.days90Plus;
      const pctOverdue = vendor.totalPayables > 0 ? parseFloat(((totalOverdue / vendor.totalPayables) * 100).toFixed(2)) : 0;
      return {
        ...vendor,
        pctOverdue
      };
    });

    // Apply Search & Vendor Filters
    if (search) {
      vendorSummaryList = vendorSummaryList.filter(v =>
        v.vendorName.toLowerCase().includes(search) ||
        v.bills.some((b: any) => b.billNumber.toLowerCase().includes(search))
      );
    }
    if (vendorFilter !== 'all' && vendorFilter !== '') {
      vendorSummaryList = vendorSummaryList.filter(v => v.vendorName.toLowerCase().includes(vendorFilter));
    }

    // Sort vendor list by totalPayables descending
    vendorSummaryList.sort((a, b) => b.totalPayables - a.totalPayables);

    // Top 5 Vendors by Total Payables Exposure
    const topOverdueVendors = vendorSummaryList
      .map(v => {
        const overdueAmount = v.days1to30 + v.days31to60 + v.days61to90 + v.days90Plus;
        return {
          vendorName: v.vendorName,
          totalPayables: v.totalPayables,
          overdueAmount,
          overdueCount: v.overdueCount,
          totalBills: v.totalBills,
          pctOverdue: v.pctOverdue
        };
      })
      .slice(0, 5);

    return NextResponse.json({
      asOnDate: asOnDateStr,
      meta: { currency, totalActiveBills: activePayables.length },
      summary: kpiSummary,
      ageingDistribution: [
        { key: 'current', label: 'Current (Not Due)', amount: currentNotDue, pct: getPct(currentNotDue), color: '#2563eb' },
        { key: '1-30', label: '1 - 30 Days', amount: days1to30, pct: getPct(days1to30), color: '#eab308' },
        { key: '31-60', label: '31 - 60 Days', amount: days31to60, pct: getPct(days31to60), color: '#f97316' },
        { key: '61-90', label: '61 - 90 Days', amount: days61to90, pct: getPct(days61to90), color: '#ef4444' },
        { key: '90+', label: '90+ Days', amount: days90Plus, pct: getPct(days90Plus), color: '#991b1b' }
      ],
      trend: {
        labels: monthLabels,
        series: trendSeries
      },
      topOverdueBills,
      topOverdueVendors,
      vendorSummary: vendorSummaryList,
      allPayableBills: activePayables
    });
  } catch (err: any) {
    console.error('Account Payable API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
