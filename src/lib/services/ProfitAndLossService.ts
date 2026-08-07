import { XeroReportParser } from './XeroReportParser';
 
export interface ProfitAndLossSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
}
 
export class ProfitAndLossService {
  /**
   * Parses the nested Rows grid of a Profit and Loss report
   * and returns structured financial metrics.
   */
  static parseReport(report: any): ProfitAndLossSummary {
    const result: ProfitAndLossSummary = {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0
    };
 
    if (!report || !report.Rows || !Array.isArray(report.Rows)) return result;
 
    const rows = report.Rows;
 
    // 1. Extract Revenue (Total Trading Income or Sales summary rows)
    const revenueVal = XeroReportParser.findRowValue(rows, [
      'total trading income',
      'total income',
      'sales',
      'total revenue',
      'revenue'
    ]);
    result.revenue = revenueVal !== null ? revenueVal : 0;
 
    // 2. Extract Cost of Goods Sold (COGS)
    const cogsVal = XeroReportParser.findRowValue(rows, [
      'total cost of sales',
      'total cost of goods sold',
      'cost of goods sold',
      'total direct costs',
      'direct costs'
    ]);
    result.cogs = cogsVal !== null ? cogsVal : 0;
 
    // 3. Extract Gross Profit
    const gpVal = XeroReportParser.findRowValue(rows, ['gross profit']);
    result.grossProfit = gpVal !== null ? gpVal : (result.revenue - result.cogs);
 
    // 4. Extract Operating Expenses
    const expensesVal = XeroReportParser.findRowValue(rows, [
      'total operating expenses',
      'total expenses',
      'operating expenses'
    ]);
    result.operatingExpenses = expensesVal !== null ? expensesVal : 0;
 
    // 5. Extract Net Profit
    const npVal = XeroReportParser.findRowValue(rows, [
      'net profit',
      'net profit / loss',
      'net income'
    ]);
    result.netProfit = npVal !== null ? npVal : (result.grossProfit - result.operatingExpenses);
 
    return result;
  }
}
