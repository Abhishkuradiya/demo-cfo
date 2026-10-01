import { NextRequest, NextResponse } from 'next/server';
import { db, parseXeroDate } from '@/lib/db';
import { getXeroAccessToken, fetchXeroResource, fetchXeroReport } from '@/lib/xero';
import { ProfitAndLossService } from '@/lib/services/ProfitAndLossService';
import { BalanceSheetService } from '@/lib/services/BalanceSheetService';
import { BalanceSheetParser } from '@/lib/services/BalanceSheetParser';
import { BankAccountMergeService } from '@/lib/services/BankAccountMergeService';
import { getTenantIdFromSession } from '@/lib/auth';
import { XeroInventoryService } from '@/lib/inventoryService';
import { XeroFixedAssetsService } from '@/lib/fixedAssetsService';
import { XeroBudgetService } from '@/lib/budgetService';
import { XeroTaxService } from '@/lib/taxService';
import { XeroGeneralLedgerService } from '@/lib/generalLedgerService';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const view = (searchParams.get('view') || 'monthly').toLowerCase();

  try {
    // 1. Check Xero connection status
    const tokenInfo = await getXeroAccessToken(tenantId);
    const isConnected = !!tokenInfo;
    const accessToken = tokenInfo?.accessToken || '';
    const xeroTenantId = tokenInfo?.xeroTenantId || '';

    // 2. Fetch cached invoices
    let cachedInvoices = await db.getInvoices(tenantId);

    // 3. If no invoices in warehouse, fetch from Xero API and cache them
    if (cachedInvoices.length === 0 && isConnected) {
      try {
        const invoices = await fetchXeroResource(
          accessToken,
          xeroTenantId,
          'Invoices',
          'where=(Type=="ACCREC" OR Type=="ACCPAY") AND (Status=="PAID" OR Status=="AUTHORISED")'
        );
        await db.saveCachedRecords(tenantId, 'invoices', invoices || []);
        // Re-read from cache to get normalized format
        cachedInvoices = await db.getInvoices(tenantId);
      } catch (err: any) {
        console.error('Failed to sync invoices from Xero API on first load:', err.message);
      }
    }

    // 4. Determine date parameters
    const fromDateParam = searchParams.get('from_date') || searchParams.get('fromDate');
    const toDateParam = searchParams.get('to_date') || searchParams.get('toDate');

    let startDate: Date;
    let endDate: Date;

    if (fromDateParam && toDateParam) {
      startDate = new Date(fromDateParam);
      endDate = new Date(toDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Find latest invoice date in the database to see if we should fallback
      let latestInvoiceDate: Date | null = null;
      for (const inv of cachedInvoices) {
        if (inv.Type !== 'ACCREC' || (inv.Status !== 'AUTHORISED' && inv.Status !== 'PAID')) continue;
        const invDate = parseXeroDate(inv.Date);
        if (invDate && (!latestInvoiceDate || invDate > latestInvoiceDate)) {
          latestInvoiceDate = invDate;
        }
      }

      if (latestInvoiceDate) {
        // Last 6 months ending in the latest invoice date's month
        const endYear = latestInvoiceDate.getFullYear();
        const endMonth = latestInvoiceDate.getMonth();
        endDate = new Date(endYear, endMonth + 1, 0, 23, 59, 59, 999);
        startDate = new Date(endYear, endMonth - 5, 1, 0, 0, 0, 0);
      } else {
        // Fallback to last 6 months from today
        const now = new Date();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      }
    }

    // Dynamic Comparison Period (preceding period of equal duration)
    const durationMs = endDate.getTime() - startDate.getTime();
    const compEndDate = new Date(startDate.getTime() - 1);
    const compStartDate = new Date(compEndDate.getTime() - durationMs);

    // Dynamic Today & Yesterday (relative to endDate if past period selected)
    const referenceDate = (fromDateParam && toDateParam) ? endDate : new Date();
    const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999);

    const yesterday = new Date(referenceDate);
    yesterday.setDate(referenceDate.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

    let revenueToday = 0;
    let revenueYesterday = 0;
    let invoiceRevenueMTD = 0;
    let invoiceRevenueLastMonth = 0;

    // Track unique currencies
    const currencies = new Set<string>();
    const currencyFrequency: Record<string, number> = {};

    for (const inv of cachedInvoices) {
      if (inv.Type !== 'ACCREC' || (inv.Status !== 'AUTHORISED' && inv.Status !== 'PAID')) continue;
      const invDate = parseXeroDate(inv.Date);
      if (!invDate) continue;

      const total = inv.Total || 0;
      const currency = inv.CurrencyCode;
      if (currency) {
        currencies.add(currency);
        currencyFrequency[currency] = (currencyFrequency[currency] || 0) + 1;
      }

      // Selected period invoices total
      if (invDate >= startDate && invDate <= endDate) {
        invoiceRevenueMTD += total;
      }

      // Comparison period invoices total
      if (invDate >= compStartDate && invDate <= compEndDate) {
        invoiceRevenueLastMonth += total;
      }

      // Today
      if (invDate >= startOfToday && invDate <= endOfToday) {
        revenueToday += total;
      }

      // Yesterday
      if (invDate >= startOfYesterday && invDate <= endOfYesterday) {
        revenueYesterday += total;
      }
    }

    // Determine currency string
    let finalCurrency = "";
    if (currencies.size === 1) {
      finalCurrency = Array.from(currencies)[0];
    } else if (currencies.size > 1) {
      let maxFreq = 0;
      for (const [curr, freq] of Object.entries(currencyFrequency)) {
        if (freq > maxFreq) {
          maxFreq = freq;
          finalCurrency = curr;
        }
      }
    }

    // Generate trend labels and data dynamically from cached invoices based on timeframe view parameter
    const getMonthsInRange = (start: Date, end: Date) => {
      const months = [];
      const curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curr <= endMonth) {
        months.push({
          year: curr.getFullYear(),
          month: curr.getMonth(),
          label: curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        });
        curr.setMonth(curr.getMonth() + 1);
      }
      return months;
    };

    const chartLabels: string[] = [];
    const chartRevenue: number[] = [];

    if (view === 'daily') {
      const curr = new Date(startDate);
      while (curr <= endDate) {
        chartLabels.push(curr.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }));
        let daySum = 0;
        for (const inv of cachedInvoices) {
          if (inv.Type !== 'ACCREC' || (inv.Status !== 'AUTHORISED' && inv.Status !== 'PAID')) continue;
          const d = parseXeroDate(inv.Date);
          if (d && d.getFullYear() === curr.getFullYear() && d.getMonth() === curr.getMonth() && d.getDate() === curr.getDate()) {
            daySum += inv.Total || 0;
          }
        }
        chartRevenue.push(parseFloat(daySum.toFixed(2)));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (view === 'weekly') {
      const curr = new Date(startDate);
      while (curr <= endDate) {
        const weekEnd = new Date(curr);
        weekEnd.setDate(curr.getDate() + 6);
        if (weekEnd > endDate) {
          weekEnd.setTime(endDate.getTime());
        }

        const label = `${curr.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}`;
        chartLabels.push(label);

        let weekSum = 0;
        for (const inv of cachedInvoices) {
          if (inv.Type !== 'ACCREC' || (inv.Status !== 'AUTHORISED' && inv.Status !== 'PAID')) continue;
          const d = parseXeroDate(inv.Date);
          if (d && d >= curr && d <= weekEnd) {
            weekSum += inv.Total || 0;
          }
        }
        chartRevenue.push(parseFloat(weekSum.toFixed(2)));
        curr.setDate(curr.getDate() + 7);
      }
    } else {
      // Monthly view (default)
      const monthsRange = getMonthsInRange(startDate, endDate);
      for (const m of monthsRange) {
        chartLabels.push(m.label);
        let mSum = 0;
        for (const inv of cachedInvoices) {
          if (inv.Type !== 'ACCREC' || (inv.Status !== 'AUTHORISED' && inv.Status !== 'PAID')) continue;
          const d = parseXeroDate(inv.Date);
          if (d && d.getFullYear() === m.year && d.getMonth() === m.month) {
            mSum += inv.Total || 0;
          }
        }
        chartRevenue.push(parseFloat(mSum.toFixed(2)));
      }
    }

    // 5. Fetch and parse active Profit & Loss report using new Service layer
    const pad = (n: number) => String(n).padStart(2, '0');
    const fromDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-01`;
    const toDateStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
    const queryParams = `fromDate=${fromDateStr}&toDate=${toDateStr}`;

    const reportCacheKey = `ProfitAndLoss_${fromDateStr}_${toDateStr}`;
    let plReport = await db.getReport(tenantId, reportCacheKey);

    if (!plReport && isConnected) {
      try {
        plReport = await fetchXeroReport(accessToken, xeroTenantId, 'ProfitAndLoss', queryParams);
        if (plReport) {
          await db.saveReport(tenantId, reportCacheKey, plReport);
        }
      } catch (err: any) {
        console.error('Failed to sync ProfitAndLoss report on dashboard route load:', err.message);
      }
    }

    const plSummary = ProfitAndLossService.parseReport(plReport);

    // 6. Fetch and parse comparison Profit & Loss report (for preceding period of equal duration)
    const compFromStr = `${compStartDate.getFullYear()}-${pad(compStartDate.getMonth() + 1)}-01`;
    const compToStr = `${compEndDate.getFullYear()}-${pad(compEndDate.getMonth() + 1)}-${pad(compEndDate.getDate())}`;

    const compReportCacheKey = `ProfitAndLoss_${compFromStr}_${compToStr}`;
    let compPlReport = await db.getReport(tenantId, compReportCacheKey);

    if (!compPlReport && isConnected) {
      try {
        compPlReport = await fetchXeroReport(accessToken, xeroTenantId, 'ProfitAndLoss', `fromDate=${compFromStr}&toDate=${compToStr}`);
        if (compPlReport) {
          await db.saveReport(tenantId, compReportCacheKey, compPlReport);
        }
      } catch (err: any) {
        console.error('Failed to sync comparison ProfitAndLoss report:', err.message);
      }
    }

    const compPlSummary = ProfitAndLossService.parseReport(compPlReport);

    // 6b. Fetch and parse Year-To-Date (YTD) Profit & Loss report
    const ytdStartDateStr = `${endDate.getFullYear()}-01-01`;
    const ytdReportCacheKey = `ProfitAndLoss_YTD_${ytdStartDateStr}_${toDateStr}`;
    let ytdPlReport = await db.getReport(tenantId, ytdReportCacheKey);
    if (!ytdPlReport && isConnected) {
      try {
        ytdPlReport = await fetchXeroReport(accessToken, xeroTenantId, 'ProfitAndLoss', `fromDate=${ytdStartDateStr}&toDate=${toDateStr}`);
        if (ytdPlReport) {
          await db.saveReport(tenantId, ytdReportCacheKey, ytdPlReport);
        }
      } catch (err: any) {
        console.error('Failed to sync YTD ProfitAndLoss report:', err.message);
      }
    }
    const ytdPlSummary = ProfitAndLossService.parseReport(ytdPlReport);

    // 7. Calculate growth percent dynamically based on Accounting Revenue (P&L report)
    const revenueMTD = plSummary.revenue;
    const revenueLastMonth = compPlSummary.revenue;
    let growthPercent = 0;
    if (revenueLastMonth > 0) {
      growthPercent = parseFloat((((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1));
    }
    if (isNaN(growthPercent)) growthPercent = 0;

    let invoiceGrowthPercent = 0;
    if (invoiceRevenueLastMonth > 0) {
      invoiceGrowthPercent = parseFloat((((invoiceRevenueMTD - invoiceRevenueLastMonth) / invoiceRevenueLastMonth) * 100).toFixed(1));
    }
    if (isNaN(invoiceGrowthPercent)) invoiceGrowthPercent = 0;

    // Net Profit Growth Percent
    const netProfit = plSummary.netProfit;
    const netProfitLastMonth = compPlSummary.netProfit;
    let netProfitGrowthPercent = 0;
    if (netProfitLastMonth !== 0) {
      netProfitGrowthPercent = parseFloat((((netProfit - netProfitLastMonth) / Math.abs(netProfitLastMonth)) * 100).toFixed(1));
    }
    if (isNaN(netProfitGrowthPercent)) netProfitGrowthPercent = 0;

    // 8. Fetch Balance Sheet report
    const bsCacheKey = `BalanceSheet_${toDateStr}`;
    let bsReport = await db.getReport(tenantId, bsCacheKey);
    if (!bsReport && isConnected) {
      try {
        bsReport = await fetchXeroReport(accessToken, xeroTenantId, 'BalanceSheet', `date=${toDateStr}`);
        if (bsReport) {
          await db.saveReport(tenantId, bsCacheKey, bsReport);
        }
      } catch (err: any) {
        console.error('Failed to sync BalanceSheet report:', err.message);
      }
    }

    const totalCash = bsReport ? (BalanceSheetParser.findTotalCash(bsReport.Rows) || 0) : 0;
    const currentAssets = bsReport ? (BalanceSheetParser.findCurrentAssets(bsReport.Rows) || 0) : 0;
    const balanceSheetAccounts = bsReport ? BalanceSheetParser.findBankAccounts(bsReport.Rows) : [];

    // Parse assets, liabilities and equity directly from Balance Sheet report rows
    const totalAssets = bsReport ? (BalanceSheetParser.findTotalAssets(bsReport.Rows) || currentAssets) : 0;
    const totalLiabilities = bsReport ? (BalanceSheetParser.findTotalLiabilities(bsReport.Rows) || 0) : 0;
    const totalEquity = bsReport ? (BalanceSheetParser.findTotalEquity(bsReport.Rows) || (totalAssets - totalLiabilities)) : 0;

    // 8b. Fetch Comparison Balance Sheet report for cash growth calculation
    const compBsCacheKey = `BalanceSheet_${compToStr}`;
    let compBsReport = await db.getReport(tenantId, compBsCacheKey);
    if (!compBsReport && isConnected) {
      try {
        compBsReport = await fetchXeroReport(accessToken, xeroTenantId, 'BalanceSheet', `date=${compToStr}`);
        if (compBsReport) {
          await db.saveReport(tenantId, compBsCacheKey, compBsReport);
        }
      } catch (err: any) {
        console.error('Failed to sync comparison BalanceSheet report:', err.message);
      }
    }
    const compTotalCash = compBsReport ? (BalanceSheetParser.findTotalCash(compBsReport.Rows) || 0) : 0;
    let cashGrowthPercent = 0;
    if (compTotalCash > 0) {
      cashGrowthPercent = parseFloat((((totalCash - compTotalCash) / compTotalCash) * 100).toFixed(1));
    }
    if (isNaN(cashGrowthPercent)) cashGrowthPercent = 0;

    // 8c. Fetch Trial Balance report
    const tbCacheKey = `TrialBalance_${toDateStr}`;
    let tbReport = await db.getReport(tenantId, tbCacheKey);
    if (!tbReport && isConnected) {
      try {
        tbReport = await fetchXeroReport(accessToken, xeroTenantId, 'TrialBalance', `date=${toDateStr}`);
        if (tbReport) {
          await db.saveReport(tenantId, tbCacheKey, tbReport);
        }
      } catch (err: any) {
        console.error('Failed to sync TrialBalance report:', err.message);
      }
    }
    const { debit: tbDebit, credit: tbCredit } = BalanceSheetParser.findTrialBalanceTotals(tbReport?.Rows || []);

    // 9. Fetch Accounts metadata
    let rawAccounts = await db.getReport(tenantId, 'Accounts_metadata');
    if (!rawAccounts && isConnected) {
      try {
        rawAccounts = await fetchXeroResource(accessToken, xeroTenantId, 'Accounts');
        if (rawAccounts && rawAccounts.length > 0) {
          await db.saveReport(tenantId, 'Accounts_metadata', rawAccounts);
        }
      } catch (err: any) {
        console.error('Failed to sync Accounts list:', err.message);
      }
    }

    let mergedBankAccounts = BankAccountMergeService.mergeAccounts(rawAccounts || [], balanceSheetAccounts);
    if (mergedBankAccounts.length === 0 && balanceSheetAccounts.length > 0) {
      mergedBankAccounts = balanceSheetAccounts.map((a, i) => ({
        accountId: `BS-${i}`,
        accountName: a.name,
        accountCode: 'BANK',
        currency: 'GBP',
        balance: a.balance,
        status: 'ACTIVE',
        type: 'BANK'
      }));
    }

    mergedBankAccounts = mergedBankAccounts.map((acc) => ({
      ...acc,
      balance: parseFloat((acc.balance || 0).toFixed(2))
    }));

    const computedNetTotalCash = mergedBankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const finalTotalCash = parseFloat(computedNetTotalCash.toFixed(2));
    const bankAccounts = mergedBankAccounts;

    // 9b. Fetch and parse Contacts to calculate customers, suppliers, and total outstanding balances
    let rawContacts = await db.getReport(tenantId, 'Contacts');
    if (!rawContacts && isConnected) {
      try {
        rawContacts = await fetchXeroResource(accessToken, xeroTenantId, 'Contacts');
        if (rawContacts && rawContacts.length > 0) {
          await db.saveReport(tenantId, 'Contacts', rawContacts);
        }
      } catch (err: any) {
        console.error('Failed to sync Contacts for dashboard:', err.message);
      }
    }

    let customersCount = 0;
    let suppliersCount = 0;
    let contactsOutstanding = 0;

    if (Array.isArray(rawContacts)) {
      for (const c of rawContacts) {
        const isCustomer = c.IsCustomer === true;
        const isSupplier = c.IsSupplier === true;

        if (isCustomer) customersCount++;
        if (isSupplier) suppliersCount++;

        // AccountsReceivable & AccountsPayable Outstanding
        const arOutstanding = parseFloat(c.Balances?.AccountsReceivable?.Outstanding) || 0;
        const apOutstanding = parseFloat(c.Balances?.AccountsPayable?.Outstanding) || 0;
        contactsOutstanding += arOutstanding + apOutstanding;
      }
    }

    // 10. Calculate dynamic Accounts Receivable & Accounts Payable (PAID/Completed payments) for selected date range
    let accountsReceivable = 0;
    let accountsPayable = 0;
    for (const inv of cachedInvoices) {
      const invDate = parseXeroDate(inv.Date);
      if (invDate && invDate >= startDate && invDate <= endDate) {
        const paidAmount = inv.AmountPaid || 0;
        if (inv.Type === 'ACCREC') {
          accountsReceivable += paidAmount;
        } else if (inv.Type === 'ACCPAY') {
          accountsPayable += paidAmount;
        }
      }
    }

    // 11. Calculate dynamic Accounts Receivable & Accounts Payable (PAID/Completed payments) for comparison date range
    let compAccountsReceivable = 0;
    let compAccountsPayable = 0;
    for (const inv of cachedInvoices) {
      const invDate = parseXeroDate(inv.Date);
      if (invDate && invDate >= compStartDate && invDate <= compEndDate) {
        const paidAmount = inv.AmountPaid || 0;
        if (inv.Type === 'ACCREC') {
          compAccountsReceivable += paidAmount;
        } else if (inv.Type === 'ACCPAY') {
          compAccountsPayable += paidAmount;
        }
      }
    }

    let arGrowthPercent = 0;
    if (compAccountsReceivable > 0) {
      arGrowthPercent = parseFloat((((accountsReceivable - compAccountsReceivable) / compAccountsReceivable) * 100).toFixed(1));
    }
    if (isNaN(arGrowthPercent)) arGrowthPercent = 0;

    let apGrowthPercent = 0;
    if (compAccountsPayable > 0) {
      apGrowthPercent = parseFloat((((accountsPayable - compAccountsPayable) / compAccountsPayable) * 100).toFixed(1));
    }
    if (isNaN(apGrowthPercent)) apGrowthPercent = 0;

    // 12. Calculate monthly trend data sets for sparklines
    const monthsRange = getMonthsInRange(startDate, endDate);
    const chartCash: number[] = [];
    const chartAR: number[] = [];
    const chartAP: number[] = [];

    for (const m of monthsRange) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const lastDayOfMonth = new Date(m.year, m.month + 1, 0).getDate();
      const mDateStr = `${m.year}-${pad(m.month + 1)}-${pad(lastDayOfMonth)}`;
      const mEnd = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999);

      // A. Cash trend point (Balance Sheet)
      const mBsCacheKey = `BalanceSheet_${mDateStr}`;
      let mBsReport = await db.getReport(tenantId, mBsCacheKey);
      if (!mBsReport && isConnected) {
        try {
          mBsReport = await fetchXeroReport(accessToken, xeroTenantId, 'BalanceSheet', `date=${mDateStr}`);
          if (mBsReport) {
            await db.saveReport(tenantId, mBsCacheKey, mBsReport);
          }
        } catch (err) {
          console.error(`Failed to fetch cash trend BalanceSheet for ${mDateStr}`);
        }
      }
      const mCash = mBsReport ? (BalanceSheetParser.findTotalCash(mBsReport.Rows) || 0) : 0;
      chartCash.push(parseFloat(mCash.toFixed(2)));

      // B. Accounts Receivable & Accounts Payable trend points (Invoices)
      let mAR = 0;
      let mAP = 0;
      for (const inv of cachedInvoices) {
        const invDate = parseXeroDate(inv.Date);
        if (invDate && invDate <= mEnd && inv.Status === 'AUTHORISED') {
          if (inv.Type === 'ACCREC') {
            mAR += inv.AmountDue || 0;
          } else if (inv.Type === 'ACCPAY') {
            mAP += inv.AmountDue || 0;
          }
        }
      }
      chartAR.push(parseFloat(mAR.toFixed(2)));
      chartAP.push(parseFloat(mAP.toFixed(2)));
    }

    // 13. Calculate dynamic Top Overdue Invoices
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueList: any[] = [];

    for (const inv of cachedInvoices) {
      if (inv.Type === 'ACCREC' && inv.Status === 'AUTHORISED' && (inv.AmountDue || 0) > 0) {
        const dueDate = inv.DueDate ? parseXeroDate(inv.DueDate) : null;
        if (dueDate && dueDate < today) {
          const diffTime = today.getTime() - dueDate.getTime();
          const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          overdueList.push({
            name: inv.ContactName || 'Unknown Customer',
            id: inv.InvoiceNumber || inv.InvoiceID || '',
            due: dueDate.toISOString(),
            amount: inv.AmountDue || 0,
            days: daysOverdue
          });
        }
      }
    }

    // Sort by most overdue first (highest days), then take top 5
    overdueList.sort((a, b) => b.days - a.days);
    const topOverdueInvoices = overdueList.slice(0, 5);

    // 13b. Fetch & Calculate Credit Notes summary
    let cachedCreditNotes = await db.getReport(tenantId, 'CreditNotes');
    if (!cachedCreditNotes && isConnected) {
      try {
        const rawCN = await fetchXeroResource(accessToken, xeroTenantId, 'CreditNotes');
        if (rawCN && Array.isArray(rawCN)) {
          cachedCreditNotes = rawCN;
          await db.saveReport(tenantId, 'CreditNotes', cachedCreditNotes);
        }
      } catch (err: any) {
        console.error('Failed to sync CreditNotes for dashboard:', err.message);
      }
    }

    let creditNotesCount = 0;
    let creditNotesTotal = 0;
    if (Array.isArray(cachedCreditNotes)) {
      for (const cnItem of cachedCreditNotes) {
        if (cnItem.Status !== 'DELETED' && cnItem.Status !== 'VOIDED') {
          const cnDate = parseXeroDate(cnItem.Date);
          if (cnDate && cnDate >= startDate && cnDate <= endDate) {
            creditNotesCount++;
            creditNotesTotal += (cnItem.Total || cnItem.RemainingCredit || 0);
          }
        }
      }
    }

    // Fetch cached organisation details
    let organisation = await db.getReport(tenantId, 'Organisation');
    if (!organisation && isConnected) {
      try {
        const organisations = await fetchXeroResource(accessToken, xeroTenantId, 'Organisations');
        if (organisations && organisations.length > 0) {
          organisation = organisations[0];
          await db.saveReport(tenantId, 'Organisation', organisation);
        }
      } catch (err: any) {
        console.error('Failed to sync Organisation details in dashboard route:', err.message);
      }
    }

    // 14. Calculate Invoice and Bill Status Summary counts
    let invoiceDraft = 0;
    let invoiceSubmitted = 0;
    let invoiceAuthorised = 0;
    let invoicePaid = 0;

    let billDraft = 0;
    let billSubmitted = 0;
    let billAuthorised = 0;
    let billPaid = 0;

    for (const inv of cachedInvoices) {
      const status = inv.Status;

      if (inv.Type === 'ACCREC') {
        if (status === 'DRAFT') {
          invoiceDraft++;
        } else if (status === 'SUBMITTED') {
          invoiceSubmitted++;
        } else if (status === 'AUTHORISED') {
          invoiceAuthorised++;
        } else if (status === 'PAID') {
          invoicePaid++;
        }
      } else if (inv.Type === 'ACCPAY') {
        if (status === 'DRAFT') {
          billDraft++;
        } else if (status === 'SUBMITTED') {
          billSubmitted++;
        } else if (status === 'AUTHORISED') {
          billAuthorised++;
        } else if (status === 'PAID') {
          billPaid++;
        }
      }
    }

    const credentials = await db.getCredentials(tenantId, 'xero');
    const lastSync = credentials?.last_synced_at || null;

    // 15. Fetch inventory summary (using service)
    let inventoryValue = 0;
    let inventoryLowStock = 0;
    let inventoryDeadStock = 0;
    if (isConnected) {
      try {
        const invSummary = await XeroInventoryService.getDashboard(tenantId);
        inventoryValue = invSummary.inventory_value;
        inventoryLowStock = invSummary.low_stock_items;
        inventoryDeadStock = invSummary.dead_stock_items;
      } catch (e) {
        console.error('Failed to parse inventory for dashboard summary:', e);
      }
    }

    // 16. Fetch fixed assets summary (using service)
    let fixedAssetsTotal = 0;
    let fixedAssetsAccumDeprec = 0;
    let fixedAssetsNetBook = 0;
    if (isConnected) {
      try {
        const faSummary = await XeroFixedAssetsService.getDashboard(tenantId);
        fixedAssetsTotal = faSummary.total_assets;
        fixedAssetsAccumDeprec = faSummary.accumulated_depreciation;
        fixedAssetsNetBook = faSummary.net_book_value;
      } catch (e) {
        console.error('Failed to parse fixed assets for dashboard summary:', e);
      }
    }

    // 17. Fetch budget vs actual summary (using service)
    let budgetYtd = 0;
    let budgetActual = 0;
    let budgetVariance = 0;
    if (isConnected) {
      try {
        const budgetSummary = await XeroBudgetService.getBudgetVsActual(tenantId, startDate, endDate);
        budgetYtd = budgetSummary.budget_ytd;
        budgetActual = budgetSummary.actual_ytd;
        budgetVariance = budgetSummary.variance;
      } catch (e) {
        console.error('Failed to parse budget for dashboard summary:', e);
      }
    }

    // 18. Fetch tax summary (using service)
    let taxCollected = 0;
    let taxPaid = 0;
    let taxPayable = 0;
    if (isConnected) {
      try {
        const taxSummary = await XeroTaxService.getTaxSummary(tenantId, startDate, endDate);
        taxCollected = taxSummary.tax_collected;
        taxPaid = taxSummary.tax_paid;
        taxPayable = taxSummary.tax_payable;
      } catch (e) {
        console.error('Failed to parse tax for dashboard summary:', e);
      }
    }

    // 19. Fetch general ledger summary (using service)
    let glTransactions = 0;
    let glThisMonth = 0;
    let glLastEntry = 'No transactions';
    if (isConnected) {
      try {
        const glSummary = await XeroGeneralLedgerService.getGeneralLedger(tenantId);
        glTransactions = glSummary.total_transactions;
        glThisMonth = glSummary.this_month;
        glLastEntry = glSummary.last_entry;
      } catch (e) {
        console.error('Failed to parse general ledger for dashboard summary:', e);
      }
    }

    return NextResponse.json({
      connected: isConnected,
      inventoryValue,
      inventoryLowStock,
      inventoryDeadStock,
      fixedAssetsTotal,
      fixedAssetsAccumDeprec,
      fixedAssetsNetBook,
      budgetYtd,
      budgetActual,
      budgetVariance,
      taxCollected,
      taxPaid,
      taxPayable,
      glTransactions,
      glThisMonth,
      glLastEntry,
      organisation,
      lastSync,
      invoiceStatusSummary: {
        draft: invoiceDraft,
        submitted: invoiceSubmitted,
        authorised: invoiceAuthorised,
        paid: invoicePaid
      },
      billStatusSummary: {
        draft: billDraft,
        submitted: billSubmitted,
        authorised: billAuthorised,
        paid: billPaid
      },
      revenueMTD,
      revenueToday,
      revenueYesterday,
      growthPercent,
      currency: finalCurrency,
      startDate: fromDateStr,
      endDate: toDateStr,
      chartLabels,
      chartRevenue,
      netProfit,
      cogs: plSummary.cogs,
      grossProfit: plSummary.grossProfit,
      expenses: plSummary.operatingExpenses,
      plRevenue: plSummary.revenue,
      creditNotesCount,
      creditNotesTotal,
      ytdRevenue: ytdPlSummary.revenue,
      ytdExpenses: ytdPlSummary.operatingExpenses,
      ytdNetProfit: ytdPlSummary.netProfit,
      invoiceRevenueMTD,
      invoiceGrowthPercent,
      netProfitGrowthPercent,
      totalCash: finalTotalCash,
      currentAssets,
      totalAssets,
      totalLiabilities,
      totalEquity,
      tbDebit,
      tbCredit,
      bankAccounts,
      accountsReceivable,
      accountsPayable,
      customersCount,
      suppliersCount,
      contactsOutstanding,
      cashGrowthPercent,
      arGrowthPercent,
      apGrowthPercent,
      chartCash,
      chartAR,
      chartAP,
      overdueInvoices: topOverdueInvoices,
      rawBalanceSheet: bsReport
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: err.message,
      revenueMTD: 0,
      revenueToday: 0,
      revenueYesterday: 0,
      growthPercent: 0,
      currency: "",
      netProfit: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: 0,
      plRevenue: 0
    }, { status: 500 });
  }
}
