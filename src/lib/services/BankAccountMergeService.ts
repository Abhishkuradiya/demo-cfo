import { BalanceSheetAccountDTO } from './BalanceSheetParser';

export interface EnterpriseBankAccountDTO {
  accountId: string;
  accountName: string;
  accountCode: string;
  currency: string;
  balance: number | null; // null represents "—"
  status: string;
  type: string;
}

export class BankAccountMergeService {
  /**
   * Merges accounts metadata from Accounts API and balance sheet balances.
   */
  static mergeAccounts(
    accounts: any[], 
    balanceSheetAccounts: BalanceSheetAccountDTO[]
  ): EnterpriseBankAccountDTO[] {
    const results: EnterpriseBankAccountDTO[] = [];
    const matchedBsNames = new Set<string>();

    const bankKeywords = [
      'bank', 'cash', 'paypal', 'tap', 'express', 'amex', 'charge', 
      'platinum', 'stripe', 'sum up', 'starling', 'groupon', 'petty', 
      'savings', 'card', 'gold', 'ebay', 'inter company'
    ];

    if (Array.isArray(accounts) && accounts.length > 0) {
      const bankAccounts = accounts.filter(acc => {
        const t = (acc.Type || '').toUpperCase();
        if (t === 'BANK' || t === 'PAYPAL' || t === 'CREDITCARD') return true;
        const nameLower = (acc.Name || '').toLowerCase();
        return bankKeywords.some(k => nameLower.includes(k));
      });

      bankAccounts.forEach(acc => {
        const normalizedName = acc.Name.toLowerCase().trim();
        
        const match = balanceSheetAccounts.find(bsAcc => {
          const bsName = bsAcc.name.toLowerCase().trim();
          return bsName === normalizedName || bsName.includes(normalizedName) || normalizedName.includes(bsName);
        });

        if (match) {
          matchedBsNames.add(match.name.toLowerCase().trim());
        }

        results.push({
          accountId: acc.AccountID || acc.accountId || acc.Name,
          accountName: acc.Name,
          accountCode: acc.Code || "",
          currency: acc.CurrencyCode || "GBP",
          balance: match ? match.balance : 0,
          status: acc.Status || "ACTIVE",
          type: acc.Type || "BANK"
        });
      });
    }

    // Include any Balance Sheet bank accounts that were not in metadata
    if (Array.isArray(balanceSheetAccounts)) {
      balanceSheetAccounts.forEach((bsAcc, idx) => {
        const bsNameNorm = bsAcc.name.toLowerCase().trim();
        if (!matchedBsNames.has(bsNameNorm)) {
          // Check if already in results by exact name
          const exists = results.some(r => r.accountName.toLowerCase().trim() === bsNameNorm);
          if (!exists) {
            results.push({
              accountId: `BS-BANK-${idx + 1}`,
              accountName: bsAcc.name,
              accountCode: "",
              currency: "GBP",
              balance: bsAcc.balance,
              status: "ACTIVE",
              type: "BANK"
            });
          }
        }
      });
    }

    return results;
  }
}
