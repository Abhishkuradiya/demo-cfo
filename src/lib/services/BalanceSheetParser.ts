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
   */
  static findSummary(rows: any[], sectionTitle: string): number | null {
    const section = this.findSection(rows, sectionTitle);
    if (section && section.Summary) {
      return this.extractCellValue(section.Summary);
    }
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
  static findBankAccounts(rows: any[]): BalanceSheetAccountDTO[] {
    const accounts: BalanceSheetAccountDTO[] = [];
    if (!rows || !Array.isArray(rows)) return accounts;

    const bankSections: any[] = [];
    
    // Find all sections relating to cash and bank
    const searchSections = (itemList: any[]) => {
      for (const item of itemList) {
        if (!item) continue;
        if (item.RowType === 'Section' && item.Title) {
          const title = item.Title.toLowerCase().trim();
          if (
            title.includes('bank') || 
            title.includes('cash') || 
            title.includes('cash at bank') || 
            title.includes('bank balances') || 
            title.includes('cash and bank') ||
            title.includes('cash in hand')
          ) {
            bankSections.push(item);
          }
        }
        if (item.Rows) {
          searchSections(item.Rows);
        }
      }
    };

    searchSections(rows);

    // If we found specific bank/cash sections, parse their row contents
    if (bankSections.length > 0) {
      for (const section of bankSections) {
        if (section.Rows && Array.isArray(section.Rows)) {
          for (const item of section.Rows) {
            if (item && item.RowType === 'Row' && item.Cells && item.Cells.length >= 2) {
              const name = (item.Cells[0].Value || "").trim();
              const balance = this.extractCellValue(item);
              if (name && balance !== null && !name.toLowerCase().includes('total')) {
                accounts.push({ name, balance });
              }
            }
          }
        }
      }
    } else {
      // Fallback: search for individual row cells matching asset descriptions
      const recurseRows = (itemList: any[]) => {
        for (const item of itemList) {
          if (!item) continue;
          if (item.RowType === 'Row' && item.Cells && item.Cells.length >= 2) {
            const name = (item.Cells[0].Value || "").trim();
            const label = name.toLowerCase();
            const isCashOrBank = label.includes('bank') || label.includes('cash') || label.includes('petty') || label.includes('savings');
            if (isCashOrBank && !label.includes('total')) {
              const balance = this.extractCellValue(item);
              if (balance !== null) {
                accounts.push({ name, balance });
              }
            }
          }
          if (item.Rows) {
            recurseRows(item.Rows);
          }
        }
      };
      recurseRows(rows);
    }

    return accounts;
  }

  /**
   * Finds the Total Cash sum from Balance Sheet report.
   */
  static findTotalCash(rows: any[]): number | null {
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

    // Fallback: sum of all found individual bank accounts
    const accounts = this.findBankAccounts(rows);
    if (accounts.length > 0) {
      return accounts.reduce((sum, acc) => sum + acc.balance, 0);
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
    return this.findSummary(rows, 'total liabilities') || this.findSummary(rows, 'liabilities');
  }

  /**
   * Finds Total Equity from Balance Sheet report.
   */
  static findTotalEquity(rows: any[]): number | null {
    return this.findSummary(rows, 'total equity') || this.findSummary(rows, 'equity') || this.findSummary(rows, 'total capital and reserves');
  }

  /**
   * Finds Total Current Liabilities from Balance Sheet report.
   */
  static findCurrentLiabilities(rows: any[]): number | null {
    return this.findSummary(rows, 'total current liabilities') || this.findSummary(rows, 'current liabilities');
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
