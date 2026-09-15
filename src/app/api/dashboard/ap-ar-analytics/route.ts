import { NextRequest, NextResponse } from 'next/server';
import { db, parseXeroDate } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';
import { getXeroAccessToken, fetchXeroResource } from '@/lib/xero';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const asOnDateStr = searchParams.get('as_on_date') || new Date().toISOString().split('T')[0];
  const fromDateStr = searchParams.get('from_date');
  const toDateStr = searchParams.get('to_date');
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const projectionDaysParam = parseInt(searchParams.get('projection_days') || '28', 10);
  const projectionDays = [7, 14, 21, 28, 30].includes(projectionDaysParam) ? projectionDaysParam : 28;
  const weekFilter = (searchParams.get('week') || 'ALL').toUpperCase(); // ALL, WEEK1, WEEK2, WEEK3, WEEK4

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

    // 2. Fetch Invoices & Credit Notes (Xero API with Status=="AUTHORISED" first, then DB reports fallback)
    let rawInvoicesList: any[] = [];
    if (isConnected) {
      try {
        const xeroAuthorisedInvoices = await fetchXeroResource(
          tokenInfo.accessToken,
          tokenInfo.xeroTenantId,
          'Invoices',
          'where=Status=="AUTHORISED"'
        );
        
        let xeroAuthorisedCreditNotes: any[] = [];
        try {
          xeroAuthorisedCreditNotes = await fetchXeroResource(
            tokenInfo.accessToken,
            tokenInfo.xeroTenantId,
            'CreditNotes',
            'where=Status=="AUTHORISED"'
          );
        } catch (e) {
          console.error('Failed to fetch CreditNotes resource:', e);
        }

        const combined = [
          ...(Array.isArray(xeroAuthorisedInvoices) ? xeroAuthorisedInvoices : []),
          ...(Array.isArray(xeroAuthorisedCreditNotes) ? xeroAuthorisedCreditNotes : [])
        ];
        if (combined.length > 0) {
          rawInvoicesList = combined;
        }
      } catch (err: any) {
        console.error('Failed to fetch Xero AUTHORISED invoices:', err.message);
      }
    }

    if (rawInvoicesList.length === 0) {
      const reportInvoices = await db.getReport(tenantId, 'Invoices');
      const reportCreditNotes = await db.getReport(tenantId, 'CreditNotes');
      const combined = [
        ...(Array.isArray(reportInvoices) ? reportInvoices : []),
        ...(Array.isArray(reportCreditNotes) ? reportCreditNotes : [])
      ];
      if (combined.length > 0) {
        rawInvoicesList = combined;
      }
    }

    const asOnDate = new Date(asOnDateStr);
    asOnDate.setHours(23, 59, 59, 999);

    const fromDate = fromDateStr ? new Date(fromDateStr) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);

    const toDate = toDateStr ? new Date(toDateStr) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Filter out DELETED, VOIDED, DRAFT, PAID, and items outside range
    const validInvoices = rawInvoicesList.filter((inv: any) => {
      const st = (inv.Status || inv.status || '').toUpperCase();
      if (st === 'PAID' || st === 'DELETED' || st === 'VOIDED' || st === 'DRAFT') return false;

      const invDate = parseXeroDate(inv.Date || inv.invoice_date);
      const invDueDate = parseXeroDate(inv.DueDate || inv.due_date || inv.Date || inv.invoice_date);

      if (!fromDateStr && !toDateStr) {
        if (invDate && invDate.getTime() > asOnDate.getTime()) {
          return false;
        }
      }

      if (fromDate && invDueDate && invDueDate.getTime() < fromDate.getTime()) {
        return false;
      }
      if (toDate && invDueDate && invDueDate.getTime() > toDate.getTime()) {
        return false;
      }

      return true;
    });

    // Map & process all invoices/bills with exact status & 4-Week categorization
    const processedInvoices = validInvoices.map((inv: any) => {
      const st = (inv.Status || inv.status || 'AUTHORISED').toUpperCase();
      const t = (inv.Type || inv.type || 'ACCREC').toUpperCase();
      const isAR = t === 'ACCREC' || t === 'ACCRECCRED';
      const isCreditNote = t === 'ACCRECCRED' || t === 'ACCPAYCRED' || t === 'CREDITNOTE';
      
      const invDate = parseXeroDate(inv.Date || inv.invoice_date);
      const invDueDate = parseXeroDate(inv.DueDate || inv.due_date || inv.Date || inv.invoice_date);
      const total = parseFloat(inv.Total || inv.total || 0);

      let amountPaid = 0;
      if (inv.AmountPaid !== undefined && inv.AmountPaid !== null) {
        amountPaid = parseFloat(inv.AmountPaid);
      } else if (inv.amount_paid !== undefined && inv.amount_paid !== null) {
        amountPaid = parseFloat(inv.amount_paid);
      } else if (st === 'PAID') {
        amountPaid = total;
      }

      let rawAmountDue = 0;
      if (st === 'PAID' || (amountPaid >= total && total > 0)) {
        rawAmountDue = 0;
      } else if (inv.AmountDue !== undefined && inv.AmountDue !== null) {
        rawAmountDue = parseFloat(inv.AmountDue);
      } else if (inv.amount_due !== undefined && inv.amount_due !== null) {
        rawAmountDue = parseFloat(inv.amount_due);
      } else {
        rawAmountDue = Math.max(0, total - amountPaid);
      }

      const amountDue = isCreditNote ? -Math.abs(rawAmountDue) : rawAmountDue;

      let displayStatus = st;
      if (isCreditNote) displayStatus = 'CREDIT NOTE';
      else if (st === 'AUTHORISED') displayStatus = 'AWAITING PAYMENT';
      else if (st === 'SUBMITTED') displayStatus = 'AWAITING APPROVAL';

      let daysOverdue = 0;
      let daysUntilDue = 0;
      let weekBucket: 'WEEK1' | 'WEEK2' | 'WEEK3' | 'WEEK4' = 'WEEK1';

      if (invDueDate) {
        const diffMs = asOnDate.getTime() - invDueDate.getTime();
        daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        daysUntilDue = -daysOverdue;

        if (daysUntilDue <= 7) {
          weekBucket = 'WEEK1'; // Overdue or due in Week 1 (Days 1-7)
        } else if (daysUntilDue <= 14) {
          weekBucket = 'WEEK2'; // Due in Week 2 (Days 8-14)
        } else if (daysUntilDue <= 21) {
          weekBucket = 'WEEK3'; // Due in Week 3 (Days 15-21)
        } else {
          weekBucket = 'WEEK4'; // Due in Week 4 (Days 22-28+)
        }
      }

      return {
        id: inv.InvoiceID || inv.external_id || inv.id || inv.InvoiceNumber || inv.invoice_number,
        invoiceNumber: inv.InvoiceNumber || inv.invoice_number || (isCreditNote ? 'CN-CREDIT' : '—'),
        contactName: inv.Contact?.Name || inv.ContactName || inv.contact_name || 'Unknown Contact',
        contactId: inv.Contact?.ContactID || inv.contact_id || '',
        status: displayStatus,
        rawStatus: st,
        type: t,
        category: isAR ? 'AR' : 'AP',
        date: invDate ? invDate.toISOString() : null,
        dueDate: invDueDate ? invDueDate.toISOString() : null,
        total: isCreditNote ? -Math.abs(total) : total,
        amountDue,
        amountPaid,
        daysOverdue,
        daysUntilDue,
        weekBucket,
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

    // STRICT FILTER: Exclude PAID, VOIDED, DELETED, DRAFT, and items where amountDue is 0 or amountPaid >= total
    const activeDueInvoices = processedInvoices.filter(inv => 
      Math.abs(inv.amountDue) > 0.001 && 
      inv.rawStatus !== 'PAID' && 
      inv.rawStatus !== 'VOIDED' && 
      inv.rawStatus !== 'DELETED' && 
      inv.rawStatus !== 'DRAFT' &&
      (Math.abs(inv.total) > 0 ? inv.amountPaid < Math.abs(inv.total) : true)
    );

    const activeAR = activeDueInvoices.filter(inv => inv.category === 'AR');
    const activeAP = activeDueInvoices.filter(inv => inv.category === 'AP');

    // Summary Aggregations
    const totalReceivables = activeAR.reduce((acc, inv) => acc + inv.amountDue, 0);
    const totalPayables = activeAP.reduce((acc, inv) => acc + inv.amountDue, 0);
    const netWorkingPosition = totalReceivables - totalPayables;

    // 4-WEEK CASH FLOW FORECAST CALCULATIONS (Week 1, Week 2, Week 3, Week 4)
    const week1AR = activeAR.filter(inv => inv.weekBucket === 'WEEK1');
    const week1AP = activeAP.filter(inv => inv.weekBucket === 'WEEK1');
    const week1CashIn = week1AR.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);
    const week1CashOut = week1AP.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);

    const week2AR = activeAR.filter(inv => inv.weekBucket === 'WEEK2');
    const week2AP = activeAP.filter(inv => inv.weekBucket === 'WEEK2');
    const week2CashIn = week2AR.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);
    const week2CashOut = week2AP.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);

    const week3AR = activeAR.filter(inv => inv.weekBucket === 'WEEK3');
    const week3AP = activeAP.filter(inv => inv.weekBucket === 'WEEK3');
    const week3CashIn = week3AR.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);
    const week3CashOut = week3AP.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);

    const week4AR = activeAR.filter(inv => inv.weekBucket === 'WEEK4');
    const week4AP = activeAP.filter(inv => inv.weekBucket === 'WEEK4');
    const week4CashIn = week4AR.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);
    const week4CashOut = week4AP.reduce((acc, inv) => acc + Math.max(0, inv.amountDue), 0);

    const weeksSummary = {
      week1: {
        key: 'WEEK1',
        label: 'Week 1 (Days 1-7 + Overdue)',
        cashIn: week1CashIn,
        cashOut: week1CashOut,
        netFlow: week1CashIn - week1CashOut,
        arCount: week1AR.length,
        apCount: week1AP.length
      },
      week2: {
        key: 'WEEK2',
        label: 'Week 2 (Days 8-14)',
        cashIn: week2CashIn,
        cashOut: week2CashOut,
        netFlow: week2CashIn - week2CashOut,
        arCount: week2AR.length,
        apCount: week2AP.length
      },
      week3: {
        key: 'WEEK3',
        label: 'Week 3 (Days 15-21)',
        cashIn: week3CashIn,
        cashOut: week3CashOut,
        netFlow: week3CashIn - week3CashOut,
        arCount: week3AR.length,
        apCount: week3AP.length
      },
      week4: {
        key: 'WEEK4',
        label: 'Week 4 (Days 22-28+)',
        cashIn: week4CashIn,
        cashOut: week4CashOut,
        netFlow: week4CashIn - week4CashOut,
        arCount: week4AR.length,
        apCount: week4AP.length
      }
    };

    // Filter activeDueInvoices based on weekFilter if specified
    let filteredDueInvoices = activeDueInvoices;
    if (weekFilter === 'WEEK1') {
      filteredDueInvoices = activeDueInvoices.filter(inv => inv.weekBucket === 'WEEK1');
    } else if (weekFilter === 'WEEK2') {
      filteredDueInvoices = activeDueInvoices.filter(inv => inv.weekBucket === 'WEEK2');
    } else if (weekFilter === 'WEEK3') {
      filteredDueInvoices = activeDueInvoices.filter(inv => inv.weekBucket === 'WEEK3');
    } else if (weekFilter === 'WEEK4') {
      filteredDueInvoices = activeDueInvoices.filter(inv => inv.weekBucket === 'WEEK4');
    }

    // Determine Timeline Range for the Chart based on user's Date Range (From / To)
    let forecastStartDate: Date;
    let forecastEndDate: Date;

    if (fromDate && toDate) {
      forecastStartDate = new Date(fromDate);
      forecastEndDate = new Date(toDate);
    } else if (fromDate) {
      forecastStartDate = new Date(fromDate);
      forecastEndDate = new Date(fromDate);
      forecastEndDate.setDate(forecastEndDate.getDate() + (projectionDays - 1));
    } else if (toDate) {
      forecastEndDate = new Date(toDate);
      forecastStartDate = new Date(toDate);
      forecastStartDate.setDate(forecastStartDate.getDate() - (projectionDays - 1));
    } else {
      // Default: Start from 7 days before asOnDate up to projectionDays (28/30 days total)
      forecastStartDate = new Date(asOnDate);
      forecastStartDate.setDate(forecastStartDate.getDate() - 7);
      forecastEndDate = new Date(asOnDate);
      forecastEndDate.setDate(forecastEndDate.getDate() + (projectionDays - 7));
    }

    forecastStartDate.setHours(0, 0, 0, 0);
    forecastEndDate.setHours(23, 59, 59, 999);

    const dailyForecast: {
      date: string;
      label: string;
      cashIn: number;
      cashOut: number;
      netFlow: number;
      cumulative: number;
      arCount: number;
      apCount: number;
    }[] = [];

    let currentCumulative = 0;
    const currDay = new Date(forecastStartDate);
    const maxDays = Math.max(1, Math.min(60, Math.ceil((forecastEndDate.getTime() - forecastStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1));

    for (let dayIndex = 0; dayIndex < maxDays; dayIndex++) {
      const dStr = currDay.toISOString().split('T')[0];
      const dLabel = currDay.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayEnd = new Date(currDay);
      dayEnd.setHours(23, 59, 59, 999);

      let dayCashIn = 0;
      let dayARCount = 0;
      let dayCashOut = 0;
      let dayAPCount = 0;

      activeAR.forEach(inv => {
        if (!inv.dueDate) return;
        const invDStr = inv.dueDate.split('T')[0];
        const invD = new Date(inv.dueDate);

        if (dayIndex === 0 && !fromDate) {
          if (invD.getTime() <= dayEnd.getTime()) {
            dayCashIn += Math.max(0, inv.amountDue);
            dayARCount++;
          }
        } else if (invDStr === dStr) {
          dayCashIn += Math.max(0, inv.amountDue);
          dayARCount++;
        }
      });

      activeAP.forEach(inv => {
        if (!inv.dueDate) return;
        const invDStr = inv.dueDate.split('T')[0];
        const invD = new Date(inv.dueDate);

        if (dayIndex === 0 && !fromDate) {
          if (invD.getTime() <= dayEnd.getTime()) {
            dayCashOut += Math.max(0, inv.amountDue);
            dayAPCount++;
          }
        } else if (invDStr === dStr) {
          dayCashOut += Math.max(0, inv.amountDue);
          dayAPCount++;
        }
      });

      const netFlow = dayCashIn - dayCashOut;
      currentCumulative += netFlow;

      dailyForecast.push({
        date: dStr,
        label: dLabel,
        cashIn: dayCashIn,
        cashOut: dayCashOut,
        netFlow,
        cumulative: currentCumulative,
        arCount: dayARCount,
        apCount: dayAPCount
      });

      currDay.setDate(currDay.getDate() + 1);
    }

    // Contact Ledger Aggregation (Grouping by Contact Name based on filteredDueInvoices)
    const contactMap = new Map<string, {
      contactName: string;
      contactId: string;
      totalReceivable: number;
      totalPayable: number;
      netBalance: number;
      arCount: number;
      apCount: number;
      totalDueCount: number;
      overdueCount: number;
      contactType: 'CUSTOMER' | 'VENDOR' | 'BOTH';
      dueInvoices: any[];
    }>();

    filteredDueInvoices.forEach(inv => {
      const name = inv.contactName;
      if (!contactMap.has(name)) {
        contactMap.set(name, {
          contactName: name,
          contactId: inv.contactId || '',
          totalReceivable: 0,
          totalPayable: 0,
          netBalance: 0,
          arCount: 0,
          apCount: 0,
          totalDueCount: 0,
          overdueCount: 0,
          contactType: inv.category === 'AR' ? 'CUSTOMER' : 'VENDOR',
          dueInvoices: []
        });
      }

      const c = contactMap.get(name)!;
      c.dueInvoices.push(inv);
      c.totalDueCount++;

      if (inv.daysOverdue > 0 && inv.amountDue > 0) {
        c.overdueCount++;
      }

      if (inv.category === 'AR') {
        c.totalReceivable += inv.amountDue;
        c.arCount++;
      } else {
        c.totalPayable += inv.amountDue;
        c.apCount++;
      }

      if (c.totalReceivable > 0 && c.totalPayable > 0) {
        c.contactType = 'BOTH';
      } else if (c.totalReceivable > 0) {
        c.contactType = 'CUSTOMER';
      } else {
        c.contactType = 'VENDOR';
      }

      c.netBalance = c.totalReceivable - c.totalPayable;
    });

    let contactList = Array.from(contactMap.values());

    if (search) {
      contactList = contactList.filter(c =>
        c.contactName.toLowerCase().includes(search) ||
        c.dueInvoices.some(inv => inv.invoiceNumber.toLowerCase().includes(search) || inv.reference.toLowerCase().includes(search))
      );
    }

    contactList.sort((a, b) => {
      const aMax = Math.max(a.totalReceivable, a.totalPayable);
      const bMax = Math.max(b.totalReceivable, b.totalPayable);
      return bMax - aMax;
    });

    return NextResponse.json({
      asOnDate: asOnDateStr,
      meta: {
        currency,
        projectionDays,
        weekFilter,
        totalActiveDueInvoices: activeDueInvoices.length,
        filteredInvoicesCount: filteredDueInvoices.length,
        totalActiveAR: activeAR.length,
        totalActiveAP: activeAP.length,
        totalContactsCount: contactList.length
      },
      summary: {
        totalReceivables,
        totalPayables,
        netWorkingPosition,
        week1CashIn,
        week1CashOut,
        week1NetCashFlow: week1CashIn - week1CashOut,
        overdueARCount: activeAR.filter(i => i.daysOverdue > 0).length,
        overdueAPCount: activeAP.filter(i => i.daysOverdue > 0).length
      },
      weeks: weeksSummary,
      forecast: dailyForecast,
      contacts: contactList,
      invoices: filteredDueInvoices,
      allDueReceivables: activeAR.sort((a, b) => b.amountDue - a.amountDue),
      allDuePayables: activeAP.sort((a, b) => b.amountDue - a.amountDue)
    });
  } catch (err: any) {
    console.error('AP & AR Analytics API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
