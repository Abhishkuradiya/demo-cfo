export interface BalanceSheetAccountDTO {
  name: string;
  balance: number;
}

export class BalanceSheetParser {
  /**
   * Recursively finds a Section by title (case-insensitive).
   */
  static findSection(rows: any[], sectionName: string): any | null {
    if (!rows || !Array.isArray(rows)) return null;
    const target = sectionName.toLowerCase().trim();

    const recurse = (itemList: any[]): any | null => {
      for (const item of itemList) {
        if (!item) continue;
        if (item.RowType === 'Section' && item.Title) {
          const title = item.Title.toLowerCase().trim();
          if (title === target || title.includes(target)) {
            return item;
          }
        }
        if (item.Rows) {
          const found = recurse(item.Rows);
          if (found !== null) return found;
        }
      }
      return null;
    };

    return recurse(rows);
  }

  /**
   * Recursively finds a Row by label in Cells[0].
   */
  static findRow(rows: any[], rowLabel: string): any | null {
    if (!rows || !Array.isArray(rows)) return null;
    const target = rowLabel.toLowerCase().trim();

    const recurse = (itemList: any[]): any | null => {
      for (const item of itemList) {
        if (!item) continue;
        if (item.RowType === 'Row' || item.RowType === 'SummaryRow') {
          if (item.Cells && item.Cells.length > 0) {
            const label = (item.Cells[0].Value || "").toLowerCase().trim();
            if (label === target || label.includes(target)) {
              return item;
            }
          }
        }
        if (item.Rows) {
          const found = recurse(item.Rows);
          if (found !== null) return found;
        }
      }
      return null;
    };

    return recurse(rows);
  }

  /**
   * Recursively finds the value of a Summary row for a section.
   * Searches by section title, then by Summary label, then by row label.
   */
  static findSummary(rows: any[], sectionTitle: string): number | null {
    const section = this.findSection(rows, sectionTitle);
    if (section && section.Summary) {
      return this.extractCellValue(section.Summary);
    }

    // Check all sections whose Summary label matches the target
    // e.g., searching for "total cash at bank and in hand" matches a section
    // where Summary.Cells[0].Value = "Total Cash at bank and in hand"
    const target = sectionTitle.toLowerCase().trim();
    const searchSummaryLabels = (itemList: any[]): number | null => {
      if (!itemList || !Array.isArray(itemList)) return null;
      for (const item of itemList) {
        if (!item) continue;
        if (item.RowType === 'Section' && item.Summary) {
          const label = (item.Summary.Cells?.[0]?.Value || '').toLowerCase().trim();
          if (label === target) {
            return this.extractCellValue(item.Summary);
          }
        }
        if (item.Rows) {
          const found = searchSummaryLabels(item.Rows);
          if (found !== null) return found;
        }
      }
      return null;
    };
    const summaryVal = searchSummaryLabels(rows);
    if (summaryVal !== null) return summaryVal;

    // Alternate fallback check for standard row matches
    const labelRow = this.findRow(rows, sectionTitle);
    if (labelRow) {
      return this.extractCellValue(labelRow);
    }
    return null;
  }

  /**
   * Locates bank accounts recursively from the "Cash and Bank" or "Bank Accounts" sections.
   */
  /**
   * Locates bank accounts recursively from the "Cash and Bank" or "Bank Accounts" sections.
   * Scans all sections in the report and inverts values if they are in Liabilities/Creditors.
   */
  static findBankAccounts(rows: any[]): BalanceSheetAccountDTO[] {
    const accounts: BalanceSheetAccountDTO[] = [];
    if (!rows || !Array.isArray(rows)) return accounts;

    const recurse = (itemList: any[], isInLiabilities = false) => {
      for (const item of itemList) {
        if (!item) continue;

        let currentInLiabilities = isInLiabilities;
        if (item.RowType === 'Section' && item.Title) {
          const title = item.Title.toLowerCase().trim();
          if (
            title.includes('liabilities') || 
            title.includes('creditors') || 
            title.includes('amounts falling due within one year')
          ) {
            currentInLiabilities = true;
          } else if (
            title.includes('assets') || 
            title.includes('bank') || 
            title.includes('cash')
          ) {
            currentInLiabilities = false;
          }
        }

        if (item.RowType === 'Row' && item.Cells && item.Cells.length >= 2) {
          const name = (item.Cells[0].Value || "").trim();
          let balance = this.extractCellValue(item);
          if (name && balance !== null && !name.toLowerCase().includes('total')) {
            const label = name.toLowerCase();
            const bankKeywords = [
              'bank', 'cash', 'paypal', 'tap', 'express', 'amex', 'charge', 
              'platinum', 'stripe', 'sum up', 'starling', 'groupon', 'petty', 
              'savings', 'card', 'gold'
            ];
            const isBank = bankKeywords.some(keyword => label.includes(keyword));
            if (isBank) {
              accounts.push({ name, balance });
            }
          }
        }

        if (item.Rows) {
          recurse(item.Rows, currentInLiabilities);
        }
      }
    };

    recurse(rows);
    return accounts;
  }

  /**
   * Finds the Total Cash sum from Balance Sheet report.
   */
  static findTotalCash(rows: any[]): number | null {
    const accounts = this.findBankAccounts(rows);
    if (accounts.length > 0) {
      // Sum only the positive bank account balances to match Xero's "Total Cash at bank and in hand"
      // which excludes overdrawn bank accounts (which Xero displays under Liabilities)
      return accounts.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0);
    }

    // Try standard summaries
    const targets = [
      'total cash and bank',
      'total cash',
      'total bank accounts',
      'total cash at bank and in hand',
      'total bank balances',
      'cash and bank'
    ];

    for (const label of targets) {
      const val = this.findSummary(rows, label);
      if (val !== null) return val;
    }

    return null;
  }

  /**
   * Finds Total Current Assets from Balance Sheet report.
   */
  static findCurrentAssets(rows: any[]): number | null {
    return this.findSummary(rows, 'total current assets') || this.findSummary(rows, 'current assets');
  }

  /**
   * Finds Total Assets from Balance Sheet report.
   */
  static findTotalAssets(rows: any[]): number | null {
    return this.findSummary(rows, 'total assets') || this.findSummary(rows, 'assets');
  }

  /**
   * Finds Total Liabilities from Balance Sheet report.
   */
  static findTotalLiabilities(rows: any[]): number | null {
    return this.findSummary(rows, 'total liabilities') 
      || this.findSummary(rows, 'liabilities')
      || this.findSummary(rows, 'total creditors: amounts falling due within one year')
      || this.findSummary(rows, 'creditors');
  }

  /**
   * Finds Total Equity from Balance Sheet report.
   */
  static findTotalEquity(rows: any[]): number | null {
    return this.findSummary(rows, 'total equity') 
      || this.findSummary(rows, 'equity') 
      || this.findSummary(rows, 'total capital and reserves')
      || this.findSummary(rows, 'capital and reserves');
  }

  /**
   * Finds Total Current Liabilities from Balance Sheet report.
   */
  static findCurrentLiabilities(rows: any[]): number | null {
    return this.findSummary(rows, 'total current liabilities') 
      || this.findSummary(rows, 'current liabilities')
      || this.findSummary(rows, 'creditors: amounts falling due within one year');
  }

  /**
   * Finds Total Debit and Credit from Trial Balance report.
   */
  static findTrialBalanceTotals(rows: any[]): { debit: number; credit: number } {
    if (!rows || !Array.isArray(rows)) return { debit: 0, credit: 0 };
    
    // Find the row labeled "Total"
    const totalRow = this.findRow(rows, 'total');
    if (totalRow && totalRow.Cells && totalRow.Cells.length >= 3) {
      const debitStr = totalRow.Cells[1]?.Value || '';
      const creditStr = totalRow.Cells[2]?.Value || '';
      
      const debit = parseFloat(debitStr.replace(/,/g, '')) || 0;
      const credit = parseFloat(creditStr.replace(/,/g, '')) || 0;
      return { debit, credit };
    }
    
    return { debit: 0, credit: 0 };
  }

  static extractCellValue(row: any): number | null {
    if (!row || !row.Cells || !Array.isArray(row.Cells) || row.Cells.length < 2) return null;
    const valStr = row.Cells[1].Value;
    if (!valStr) return null;
    const parsed = parseFloat(valStr.replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
}
