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
    if (!accounts || !Array.isArray(accounts)) return [];
 
    // Filter only BANK type accounts as per target architecture
    const bankAccounts = accounts.filter(acc => acc.Type === 'BANK');
 
    return bankAccounts.map(acc => {
      const normalizedName = acc.Name.toLowerCase().trim();
      
      // Find matching balance from Balance Sheet
      const match = balanceSheetAccounts.find(bsAcc => {
        const bsName = bsAcc.name.toLowerCase().trim();
        return bsName === normalizedName || bsName.includes(normalizedName) || normalizedName.includes(bsName);
      });
 
      return {
        accountId: acc.AccountID,
        accountName: acc.Name,
        accountCode: acc.Code || "",
        currency: acc.CurrencyCode || "USD",
        balance: match ? match.balance : 0, // default to 0 to prevent displaying dash placeholder
        status: acc.Status || "ACTIVE",
        type: acc.Type
      };
    });
  }
}
