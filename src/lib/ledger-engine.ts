import { db } from '@/lib/db';

export interface LedgerTransaction {
  id: string;
  date: string;
  source: string;
  description: string;
  reference: string;
  currency: string;
  debit: number;
  credit: number;
  amount: number;
  runningBalance: number;
  lineItems?: any[];
}

export interface AccountLedgerResult {
  accountName: string;
  accountCode: string;
  fromDate: string;
  toDate: string;
  totalValue: number;
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  transactions: LedgerTransaction[];
}

/**
 * Pure Accounting Reconstruction Engine (PostgreSQL Database Engine)
 * Strictly filters DB invoices by Account Code and Accounting Type (Receivables for Sales 4xx, Payables for Expenses 5xx/6xx).
 */
export async function getAccountTransactionsLedger(
  tenantId: number,
  accountName: string,
  fromDateStr: string,
  toDateStr: string,
  targetValue: number = 0
): Promise<AccountLedgerResult> {
  const accLower = accountName.toLowerCase();

  const startTs = new Date(fromDateStr + 'T00:00:00.000Z').getTime();
  const endTs = new Date(toDateStr + 'T23:59:59.999Z').getTime();

  try {
    const dbInvoices = await db.getInvoices(tenantId);
    const dbAccounts = await db.getAccounts(tenantId);
    
    // 1. Resolve Target Account Code
    let targetAccCode = '400';
    if (accLower.includes('groupon')) targetAccCode = '414';
    else if (accLower.includes('ebay')) targetAccCode = '411';
    else if (accLower.includes('amazon')) targetAccCode = '412';
    else {
      const matchedAccount = (dbAccounts || []).find(a => 
        (a.Name || '').toLowerCase() === accLower || 
        (a.Code || '') === accountName
      );
      if (matchedAccount) {
        targetAccCode = matchedAccount.Code || matchedAccount.code || '400';
      }
    }

    const isSalesAccount = targetAccCode.startsWith('4') || accLower.includes('sales') || accLower.includes('income');
    const accKeyword = accLower.replace(/sales|income|expenses|account|fees/gi, '').trim() || accLower;

    if (dbInvoices && dbInvoices.length > 0) {
      const transactions: LedgerTransaction[] = [];
      let runningBal = 0;
      let totDebit = 0;
      let totCredit = 0;

      // Filter invoices strictly in date range
      const inRangeInvoices = dbInvoices.filter(inv => {
        const isACCREC = inv.Type === 'ACCREC' || inv.type === 'ACCREC';
        
        // Accounting Rule: Sales 4xx accounts ONLY accept Receivable Invoices (ACCREC) or Sales Payouts!
        if (isSalesAccount && !isACCREC) {
          return false; // Exclude Payable Commission Bills (ACCPAY) from Sales accounts!
        }

        const rawDate = inv.Date || inv.invoice_date || inv.DueDate;
        const dTime = rawDate ? new Date(rawDate).getTime() : 0;
        return !isNaN(dTime) ? (dTime >= startTs && dTime <= endTs) : true;
      });

      // Sort invoices chronologically
      inRangeInvoices.sort((a, b) => {
        const dA = new Date(a.Date || a.invoice_date || a.DueDate || 0).getTime();
        const dB = new Date(b.Date || b.invoice_date || b.DueDate || 0).getTime();
        return dA - dB;
      });

      inRangeInvoices.forEach((inv, i) => {
        const isACCREC = inv.Type === 'ACCREC' || inv.type === 'ACCREC';
        const lineItems = inv.LineItems || inv.line_items || [];

        const rawDate = inv.Date || inv.invoice_date || inv.DueDate;
        const dObj = rawDate ? new Date(rawDate) : new Date();
        const formattedDate = isNaN(dObj.getTime()) 
          ? fromDateStr 
          : dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        if (lineItems.length > 0) {
          lineItems.forEach((line: any, idx: number) => {
            const lineAccCode = (line.AccountCode || line.account_code || '').toString();
            const lineDesc = line.Description || line.ItemCode || `${inv.ContactName || accountName}`;
            
            // STRICT ACCOUNT MATCHING
            const matchesLine = 
              lineAccCode === targetAccCode || 
              (targetAccCode === '414' && (lineAccCode === '414' || lineDesc.toLowerCase().includes('groupon'))) ||
              (targetAccCode === '411' && (lineAccCode === '411' || lineDesc.toLowerCase().includes('ebay'))) ||
              (targetAccCode === '412' && (lineAccCode === '412' || lineDesc.toLowerCase().includes('amazon')));

            if (matchesLine) {
              const lineAmt = Math.abs(parseFloat(line.LineAmount || line.UnitAmount || 0));
              const isDeduction = lineAmt < 0 || lineDesc.toLowerCase().includes('deduction') || lineDesc.toLowerCase().includes('held') || lineDesc.toLowerCase().includes('fee');

              const debit = isDeduction ? lineAmt : (isACCREC ? 0 : lineAmt);
              const credit = isDeduction ? 0 : (isACCREC ? lineAmt : 0);

              if (debit > 0) {
                totDebit += debit;
                runningBal -= debit;
              } else {
                totCredit += credit;
                runningBal += credit;
              }

              transactions.push({
                id: `pg-line-${inv.InvoiceID || i}-${idx + 1}`,
                date: formattedDate,
                source: isACCREC ? 'Receivable Invoice' : 'Payable Invoice',
                description: lineDesc.startsWith(inv.ContactName || '') ? lineDesc : `${inv.ContactName || accountName} - ${lineDesc}`,
                reference: inv.InvoiceNumber || inv.Reference || `INV-${i + 1}`,
                currency: inv.CurrencyCode || 'GBP',
                debit: Math.round(debit * 100) / 100,
                credit: Math.round(credit * 100) / 100,
                amount: Math.round((credit || debit) * 100) / 100,
                runningBalance: Math.round(runningBal * 100) / 100,
                lineItems: lineItems
              });
            }
          });
        } else {
          // Whole invoice level matching
          const cName = (inv.ContactName || inv.Contact?.Name || '').toLowerCase();
          const invNo = (inv.InvoiceNumber || '').toLowerCase();
          const ref = (inv.Reference || '').toLowerCase();

          const matchesInvoice = cName.includes(accKeyword) || invNo.includes(accKeyword) || ref.includes(accKeyword);

          if (matchesInvoice) {
            const amt = parseFloat(inv.Total || inv.total || 0);
            const debit = isACCREC ? 0 : amt;
            const credit = isACCREC ? amt : 0;

            if (debit > 0) {
              totDebit += debit;
              runningBal -= debit;
            } else {
              totCredit += credit;
              runningBal += credit;
            }

            transactions.push({
              id: `pg-inv-${inv.InvoiceID || i + 1}`,
              date: formattedDate,
              source: isACCREC ? 'Receivable Invoice' : 'Payable Invoice',
              description: `${inv.ContactName || accountName} - ${accountName}`,
              reference: inv.InvoiceNumber || inv.Reference || `INV-${i + 1}`,
              currency: inv.CurrencyCode || 'GBP',
              debit: Math.round(debit * 100) / 100,
              credit: Math.round(credit * 100) / 100,
              amount: Math.round(amt * 100) / 100,
              runningBalance: Math.round(runningBal * 100) / 100,
              lineItems: lineItems
            });
          }
        }
      });

      if (transactions.length > 0) {
        return {
          accountName,
          accountCode: targetAccCode,
          fromDate: fromDateStr,
          toDate: toDateStr,
          totalValue: Math.round(runningBal * 100) / 100,
          totalDebit: Math.round(totDebit * 100) / 100,
          totalCredit: Math.round(totCredit * 100) / 100,
          transactionCount: transactions.length,
          transactions
        };
      }
    }
  } catch (err) {
    console.error("Error reading PostgreSQL invoices in dynamic ledger-engine:", err);
  }

  // Return clean zero result if DB is empty or no matching line items exist for this account
  return {
    accountName,
    accountCode: '400',
    fromDate: fromDateStr,
    toDate: toDateStr,
    totalValue: 0,
    totalDebit: 0,
    totalCredit: 0,
    transactionCount: 0,
    transactions: []
  };
}
