import { executeCfoTool, getCfoTool, getLlmToolsSchema, ToolAliases, ToolExecutionContext } from './copilot-tools';
import { saveChatMessage, getChatMessages } from './copilot-db';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export interface ToolActivityLog {
  toolName: string;
  args: any;
  status: 'SUCCESS' | 'ERROR';
  resultSummary: string;
  recordsCount: number;
}

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), 'src', 'data', 'system_settings.json');

export function parseDatesFromPrompt(msg: string): { startDate: string; endDate: string; periodLabel: string } {
  const defaultDates = {
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    periodLabel: '01 Apr 2026 to 30 Sep 2026'
  };

  if (!msg) return defaultDates;

  const monthMap: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09', sept: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  const getMonthNum = (mStr: string) => {
    const key = mStr.toLowerCase().substring(0, 3);
    return monthMap[key] || '01';
  };

  const pad2 = (n: string | number) => String(n).padStart(2, '0');

  // Format 1: "01 jan 2026 to 30 sep 2026" or "1 january 2026 to 30 september 2026" or "01 apr 2026 - 30 sep 2026"
  const wordRangeRegex = /(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\s+(?:to|-|until|through)\s+(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i;
  const match1 = msg.match(wordRangeRegex);
  if (match1) {
    const d1 = pad2(match1[1]);
    const m1 = getMonthNum(match1[2]);
    const y1 = match1[3];
    const d2 = pad2(match1[4]);
    const m2 = getMonthNum(match1[5]);
    const y2 = match1[6];

    return {
      startDate: `${y1}-${m1}-${d1}`,
      endDate: `${y2}-${m2}-${d2}`,
      periodLabel: `${d1} ${match1[2].substring(0,3)} ${y1} to ${d2} ${match1[5].substring(0,3)} ${y2}`
    };
  }

  // Format 2: "2026-01-01 to 2026-09-30" or "2026-01-01 - 2026-09-30"
  const isoRangeRegex = /(\d{4}-\d{2}-\d{2})\s+(?:to|-)\s+(\d{4}-\d{2}-\d{2})/i;
  const match2 = msg.match(isoRangeRegex);
  if (match2) {
    return {
      startDate: match2[1],
      endDate: match2[2],
      periodLabel: `${match2[1]} to ${match2[2]}`
    };
  }

  // Format 3: "01/01/2026 to 30/09/2026"
  const slashRangeRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:to|-)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
  const match3 = msg.match(slashRangeRegex);
  if (match3) {
    const d1 = pad2(match3[1]);
    const m1 = pad2(match3[2]);
    const y1 = match3[3];
    const d2 = pad2(match3[4]);
    const m2 = pad2(match3[5]);
    const y2 = match3[6];
    return {
      startDate: `${y1}-${m1}-${d1}`,
      endDate: `${y2}-${m2}-${d2}`,
      periodLabel: `${d1}/${m1}/${y1} to ${d2}/${m2}/${y2}`
    };
  }

  // Format 4: Single Year e.g. "for 2025" or "in 2026"
  const yearRegex = /\b(20\d{2})\b/;
  const match4 = msg.match(yearRegex);
  if (match4 && !msg.toLowerCase().includes('to')) {
    const yr = match4[1];
    return {
      startDate: `${yr}-01-01`,
      endDate: `${yr}-12-31`,
      periodLabel: `01 Jan ${yr} to 31 Dec ${yr}`
    };
  }

  return defaultDates;
}

async function getLlmSettings() {
  let settings = {
    provider: 'omegaplus',
    apiKey: '',
    baseUrl: 'https://api.omegaplusapi.com',
    defaultModel: 'claude-fable-5',
    enabledModels: ['claude-fable-5'],
    temperature: 0.7,
    maxTokens: 2048
  };

  try {
    if (fs.existsSync(LOCAL_SETTINGS_FILE)) {
      const raw = fs.readFileSync(LOCAL_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      settings = {
        provider: parsed.llmProvider || settings.provider,
        apiKey: parsed.llmApiKey || settings.apiKey,
        baseUrl: (parsed.llmBaseUrl || settings.baseUrl).replace(/\/+$/, ''),
        defaultModel: parsed.llmDefaultModel || settings.defaultModel,
        enabledModels: Array.isArray(parsed.llmEnabledModels) ? parsed.llmEnabledModels : settings.enabledModels,
        temperature: parsed.llmTemperature ?? settings.temperature,
        maxTokens: parsed.llmMaxTokens ?? settings.maxTokens
      };
    }
  } catch (e) {}

  if (db.isPgActive()) {
    try {
      const res = await db.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (row.llm_api_key) settings.apiKey = row.llm_api_key;
        if (row.llm_base_url) settings.baseUrl = row.llm_base_url.replace(/\/+$/, '');
        if (row.llm_default_model) settings.defaultModel = row.llm_default_model;
        if (row.llm_provider) settings.provider = row.llm_provider;
      }
    } catch (e) {}
  }

  return settings;
}

export async function runCopilotInvestigation(opts: {
  chatId: string;
  tenantId: string | number;
  message: string;
  selectedModel?: string;
  onSSEEvent?: (event: { type: string; [key: string]: any }) => void;
}): Promise<{ finalAnswer: string; debugActivities: ToolActivityLog[] }> {
  const { chatId, tenantId, message, selectedModel, onSSEEvent } = opts;
  const numTenantId = Number(tenantId) || 1;
  const debugActivities: ToolActivityLog[] = [];

  const sendSSE = (evt: { type: string; [key: string]: any }) => {
    if (onSSEEvent) {
      onSSEEvent(evt);
    }
  };

  const llmSettings = await getLlmSettings();
  const targetModel = selectedModel || llmSettings.defaultModel;

  sendSSE({ type: 'investigation_status', status: 'INITIATING_INVESTIGATION', model: targetModel });

  const history = getChatMessages(chatId);
  const execContext: ToolExecutionContext = { tenantId: numTenantId };
  const llmToolsSchema = getLlmToolsSchema();
  const toolOutputs: Record<string, any> = {};

  const MAX_TOOL_ROUNDS = 5;
  let finalAnswer = '';
  let nativeLlmToolCallingSucceeded = false;

  // Attempt Native LLM Tool Calling via OmegaPlus / Claude API if API key is provided
  if (llmSettings.apiKey.trim()) {
    try {
      const endpoint = `${llmSettings.baseUrl}/v1/messages`;
      const systemPrompt = `You are the Virtual CFO Executive AI Copilot for MI Health Ltd.
Your primary role is to provide authoritative, data-driven financial intelligence using your available CFO tools.
When answering financial questions, choose the appropriate CFO tools to fetch real accounting data.
Always provide precise numerical metrics, clear explanations, and actionable financial insights.`;

      // Build conversation messages array for Anthropic API
      const apiMessages: Array<{ role: string; content: any }> = [];
      if (history.length > 0) {
        // Include recent history for continuous context (last 6 messages)
        const recentHistory = history.slice(-6);
        for (const h of recentHistory) {
          if (h.role === 'user' || h.role === 'assistant') {
            apiMessages.push({ role: h.role, content: h.text });
          }
        }
      }

      // Append current user message
      if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1].content !== message) {
        apiMessages.push({ role: 'user', content: message });
      }

      sendSSE({ type: 'investigation_status', status: 'GATHERING_EVIDENCE' });

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': llmSettings.apiKey,
            'Authorization': `Bearer ${llmSettings.apiKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: llmSettings.maxTokens,
            system: systemPrompt,
            messages: apiMessages,
            tools: llmToolsSchema
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`LLM API returned HTTP ${response.status}: ${errText}`);
          break;
        }

        const resJson = await response.json();
        const contentBlocks = resJson.content || [];
        const toolUseBlocks = contentBlocks.filter((c: any) => c.type === 'tool_use');

        // Check if LLM generated tool call requests
        if (toolUseBlocks.length > 0 || resJson.stop_reason === 'tool_use') {
          // Append assistant message containing tool_use blocks to API messages history
          apiMessages.push({
            role: 'assistant',
            content: contentBlocks
          });

          const toolResultContent: any[] = [];

          for (const block of toolUseBlocks) {
            const requestedToolName = block.name;
            const toolUseId = block.id || `toolu_${Date.now()}`;
            const modelArgs = block.input || {};

            // Strip security parameters from model input
            delete modelArgs.tenantId;

            const toolDef = getCfoTool(requestedToolName);
            let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
            let summary = '';
            let recordsCount = 1;
            let resultData: any = null;

            if (!toolDef) {
              status = 'ERROR';
              summary = `Unknown tool requested: ${requestedToolName}`;
              resultData = { error: `Tool "${requestedToolName}" is not registered in canonical registry.` };
            } else {
              const toolRes = await executeCfoTool(requestedToolName, modelArgs, execContext);
              if (toolRes.success) {
                resultData = toolRes.data;
                toolOutputs[toolDef.name] = resultData;
                summary = `Tool ${toolDef.name} executed successfully.`;
                recordsCount = Array.isArray(resultData) ? resultData.length : (resultData?.records?.length || 1);
              } else {
                status = 'ERROR';
                resultData = { error: toolRes.error?.message || 'Tool execution failed' };
                summary = `Tool ${toolDef.name} failed: ${toolRes.error?.message}`;
              }
            }

            const activity: ToolActivityLog = {
              toolName: toolDef ? toolDef.name : requestedToolName,
              args: modelArgs,
              status,
              resultSummary: summary,
              recordsCount
            };
            debugActivities.push(activity);

            sendSSE({
              type: 'tool_done',
              name: toolDef ? toolDef.name : requestedToolName,
              status,
              summary,
              count: recordsCount,
              step: debugActivities.length
            });

            toolResultContent.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: JSON.stringify(resultData)
            });
          }

          // Push tool_result block back to API messages history
          apiMessages.push({
            role: 'user',
            content: toolResultContent
          });

          // Continue loop to let LLM process tool result
          continue;
        }

        // If LLM returned text response (final answer)
        const textBlocks = contentBlocks.filter((c: any) => c.type === 'text');
        if (textBlocks.length > 0) {
          finalAnswer = textBlocks.map((c: any) => c.text || '').join('');
        } else if (resJson.choices && resJson.choices[0]?.message?.content) {
          finalAnswer = resJson.choices[0].message.content;
        }

        if (finalAnswer) {
          nativeLlmToolCallingSucceeded = true;
          break;
        }
      }

      // If max tool rounds reached and tool results were gathered, solicit final text synthesis from LLM
      if (!finalAnswer && apiMessages.length > 1) {
        apiMessages.push({
          role: 'user',
          content: 'Please summarize your final executive CFO financial analysis based on all tool results gathered above.'
        });
        const finalRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': llmSettings.apiKey,
            'Authorization': `Bearer ${llmSettings.apiKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: llmSettings.maxTokens,
            system: systemPrompt,
            messages: apiMessages
          })
        });

        if (finalRes.ok) {
          const finalJson = await finalRes.json();
          const textBlocks = (finalJson.content || []).filter((c: any) => c.type === 'text');
          if (textBlocks.length > 0) {
            finalAnswer = textBlocks.map((c: any) => c.text || '').join('');
            nativeLlmToolCallingSucceeded = true;
          } else if (finalJson.choices && finalJson.choices[0]?.message?.content) {
            finalAnswer = finalJson.choices[0].message.content;
            nativeLlmToolCallingSucceeded = true;
          }
        }
      }
    } catch (llmErr: any) {
      console.warn('Native LLM tool calling execution error:', llmErr.message || llmErr);
    }
  }

  // Controlled Error Path (If LLM API fails or is unconfigured)
  if (!nativeLlmToolCallingSucceeded || !finalAnswer) {
    finalAnswer = "⚠️ **Virtual CFO Copilot Notice**: Unable to execute native LLM tool calling. Please verify that your LLM API service is configured and active in system settings.";
  }

  sendSSE({ type: 'investigation_status', status: 'COMPLETED' });

  // Stream Tokens
  sendSSE({ type: 'answer_start' });
  const words = finalAnswer.split(/(?<=\s)/);
  const CHUNK_SIZE = 4;
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join('');
    sendSSE({ type: 'token', content: chunk });
    await new Promise(r => setTimeout(r, 20));
  }

  // Save Assistant Message to DB
  saveChatMessage(chatId, tenantId, 'assistant', finalAnswer, debugActivities);

  sendSSE({ type: 'done', chatId, tenantId, debugActivities });

  return { finalAnswer, debugActivities };
}

function generateFinancialSynthesis(
  userQuery: string,
  toolsData: Record<string, any>,
  activities: ToolActivityLog[],
  chatId?: string
): string {
  const q = userQuery.toLowerCase().trim();
  const pnl = toolsData['get_profit_and_loss_report'];
  const cashBal = toolsData['get_cash_flow_balance'];
  const cashDrivers = toolsData['get_cash_flow_drivers'];
  const invoices = toolsData['search_invoices_and_bills'];
  const anomalies = toolsData['find_unusual_transactions'];
  const tenantContext = toolsData['get_tenant_context'];

  const orgName = tenantContext?.organizationName || 'MI Health Ltd';
  const currency = pnl?.currency || cashBal?.currency || 'GBP';
  const currSym = currency === 'GBP' || currency === '£' ? 'GBP' : currency;

  const extractedPeriod = parseDatesFromPrompt(userQuery);
  const { startDate, endDate, periodLabel } = extractedPeriod;

  // Calculate period length in months for proportional scaling
  let monthsCount = 6;
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    monthsCount = Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
  } catch (err) {}

  const getNum = (v: any) => {
    if (typeof v === 'object' && v !== null) return typeof v.value === 'number' ? v.value : null;
    if (typeof v === 'number') return v;
    return null;
  };

  const rawRev = getNum(pnl?.profitability?.revenue);
  const rawGp = getNum(pnl?.profitability?.grossProfit);
  const rawNp = getNum(pnl?.profitability?.netProfit);
  const rawOpex = getNum(pnl?.profitability?.operatingExpenses);

  const revVal = rawRev ?? 0;
  const gpVal = rawGp ?? (rawRev !== null ? revVal - (rawOpex ?? 0) : 0);
  const cogsVal = revVal - gpVal;
  const opexVal = rawOpex ?? 0;
  const npVal = rawNp ?? (gpVal - opexVal);

  const grossMargin = revVal > 0 ? ((gpVal / revVal) * 100).toFixed(1) : '0.0';
  const netMargin = revVal > 0 ? ((npVal / revVal) * 100).toFixed(1) : '0.0';

  // Specific query intent flags
  const isGrossProfitOnly = (q.includes('gross profit') || q.includes('gross margin') || (q.includes('gross') && q.includes('profit'))) &&
                            !q.includes('opex') && !q.includes('operating expense') && !q.includes('breakdown') && !q.includes('analyze my profit') && !q.includes('all');

  const isRevenueOnly = (q.includes('revenue') || q.includes('sales') || q.includes('turnover')) &&
                        !q.includes('gross profit') && !q.includes('opex') && !q.includes('operating expense') && !q.includes('breakdown') && !q.includes('analyze my profit');

  const isOpExOnly = (q.includes('opex') || q.includes('operating expense') || q.includes('expenses breakdown') || q.includes('payroll') || q.includes('salaries')) &&
                     !q.includes('gross profit') && !q.includes('revenue') && !q.includes('analyze my profit');

  const isNetProfitOnly = (q.includes('net profit') || q.includes('net margin') || q.includes('bottom line')) &&
                          !q.includes('gross profit') && !q.includes('revenue') && !q.includes('opex') && !q.includes('analyze my profit');

  const isARAPOnly = (q.includes('overdue') || q.includes('invoice') || q.includes('receivable') || q.includes('payable') || q.includes('ar') || q.includes('ap')) &&
                     !q.includes('profit') && !q.includes('revenue') && !q.includes('analyze my profit');

  const isCashOnly = (q.includes('cash') || q.includes('bank') || q.includes('balance') || q.includes('liquidity')) &&
                     !q.includes('profit') && !q.includes('revenue') && !q.includes('analyze my profit');

  const isConversational = q === 'tu khud dekhle' || q.includes('dekh le') || q.includes('bhai') || q === 'hi' || q === 'hello' || q.includes('see');

  // 1. Target Response: Gross Profit Only
  if (isGrossProfitOnly) {
    return `### 📈 Gross Profit Performance Analysis
**Organization**: ${orgName} | **Analysis Scope**: ${periodLabel}

- **Gross Profit**: **${currSym} ${gpVal.toLocaleString()}**
- **Gross Profit Margin**: **${grossMargin}%**

#### 📊 Cost Structure Context
- **Total Revenue**: **${currSym} ${revVal.toLocaleString()}**
- **Cost of Goods Sold (COGS)**: **${currSym} ${cogsVal.toLocaleString()}**`;
  }

  // 2. Target Response: Revenue Only
  if (isRevenueOnly) {
    return `### 💰 Total Revenue Performance Summary
**Organization**: ${orgName} | **Analysis Scope**: ${periodLabel}

- **Total Revenue**: **${currSym} ${revVal.toLocaleString()}**

#### 📊 Related Profitability Metrics
- **Gross Profit**: **${currSym} ${gpVal.toLocaleString()}** (Gross Margin: **${grossMargin}%**)
- **Operating Net Profit**: **${currSym} ${npVal.toLocaleString()}** (Net Margin: **${netMargin}%**)`;
  }

  // 3. Target Response: Operating Expenses (OpEx) Only
  if (isOpExOnly) {
    const lines = [
      `### 🏷️ Operating Expenses (OpEx) Breakdown`,
      `**Organization**: ${orgName} | **Analysis Scope**: ${periodLabel}\n`,
      `- **Total Operating Expenses (OpEx)**: **${currSym} ${opexVal.toLocaleString()}** (${revVal > 0 ? ((opexVal / revVal) * 100).toFixed(1) : '0.0'}% of Revenue)\n`,
      `#### 📑 Key Expense Categories`
    ];
    if (pnl?.expensesBreakdown?.topExpenseAccounts && pnl.expensesBreakdown.topExpenseAccounts.length > 0) {
      pnl.expensesBreakdown.topExpenseAccounts.forEach((exp: any) => {
        lines.push(`- **${exp.accountName}** (\`Acc ${exp.accountCode || ''}\`): **${currSym} ${exp.currentAmount.toLocaleString()}** (${exp.percentOfRevenue}% of Revenue)`);
      });
    } else {
      lines.push(`- *No operating expense line items recorded for this period.*`);
    }
    return lines.join('\n');
  }

  // 4. Target Response: Net Profit Only
  if (isNetProfitOnly) {
    return `### 📊 Operating Net Profit Performance
**Organization**: ${orgName} | **Analysis Scope**: ${periodLabel}

- **Operating Net Profit**: **${currSym} ${npVal.toLocaleString()}**
- **Net Profit Margin**: **${netMargin}%**

#### 📉 Profitability Flow
- **Total Revenue**: **${currSym} ${revVal.toLocaleString()}**
- **Gross Profit**: **${currSym} ${gpVal.toLocaleString()}**
- **Total OpEx**: **${currSym} ${opexVal.toLocaleString()}**`;
  }

  // 5. Target Response: AR / Overdue Invoices Only
  if (isARAPOnly) {
    const overdueList = invoices?.records ? invoices.records.filter((r: any) => r.status === 'OVERDUE') : [];
    if (overdueList.length === 0) {
      return `### 📑 Accounts Receivable (AR) & Overdue Invoices\n**Organization**: ${orgName}\n\n✅ **No overdue customer invoices found for this organization.**`;
    }

    const lines = [
      `### 📑 Accounts Receivable (AR) & Overdue Invoices`,
      `**Organization**: ${orgName}\n`,
      `⚠️ **${overdueList.length} Overdue Customer Invoices Flagged**:`
    ];
    overdueList.forEach((inv: any) => {
      lines.push(`- **${inv.contactName}** (\`${inv.invoiceNumber}\`): **${currSym} ${inv.amountDue.toLocaleString()}** (${inv.daysOverdue} days overdue)`);
    });
    return lines.join('\n');
  }

  // 6. Target Response: Cash Flow Only
  if (isCashOnly) {
    const cashTotal = cashBal?.totalCash ?? 0;
    const bankList = cashBal?.bankAccounts || [];
    if (bankList.length === 0) {
      return `### 💸 Cash Flow & Liquid Reserves\n**Organization**: ${orgName}\n\n- **Total Liquid Cash Reserve**: **${currSym} ${cashTotal.toLocaleString()}** (No active bank accounts linked)`;
    }

    const lines = [
      `### 💸 Cash Flow & Liquid Reserves`,
      `**Organization**: ${orgName}\n`,
      `- **Total Liquid Cash Reserve**: **${currSym} ${cashTotal.toLocaleString()}** across ${bankList.length} active bank accounts:`
    ];
    bankList.forEach((b: any) => {
      lines.push(`  - **${b.name}**: **${currSym} ${b.balance.toLocaleString()}**`);
    });
    return lines.join('\n');
  }

  // 7. Target Response: Conversational / Hinglish follow-up
  if (isConversational) {
    return `### 🤖 Virtual CFO Executive Financial Summary
**Organization**: ${orgName} | **Period**: ${periodLabel}

Here is the direct financial summary for your requested period:

- **Gross Profit**: **${currSym} ${gpVal.toLocaleString()}** (Gross Margin: **${grossMargin}%**)
- **Total Revenue**: **${currSym} ${revVal.toLocaleString()}**
- **Operating Net Profit**: **${currSym} ${npVal.toLocaleString()}** (Net Margin: **${netMargin}%**)

*If you would like a specific breakdown of OpEx line items, AR overdue invoices, or cash flow drivers, just let me know!*`;
  }

  // 8. Default: Comprehensive Full Executive P&L Report (used when user asks for full P&L analysis or multi-metric evaluation)
  const sections: string[] = [];
  sections.push(`### 🤖 Virtual CFO Executive Financial Intelligence Report\n**Organization**: ${orgName} | **Analysis Scope**: Live Xero General Ledger & Financial Analytics\n`);

  sections.push(`#### 📊 Profit & Loss & Margin Performance Analysis`);
  sections.push(`- **Total Revenue**: \`${currSym} ${revVal.toLocaleString()}\``);
  sections.push(`- **Cost of Goods Sold (COGS)**: \`${currSym} ${cogsVal.toLocaleString()}\``);
  sections.push(`- **Gross Profit**: \`${currSym} ${gpVal.toLocaleString()}\` | **Gross Margin**: \`${grossMargin}%\``);
  sections.push(`- **Total Operating Expenses (OpEx)**: \`${currSym} ${opexVal.toLocaleString()}\``);
  sections.push(`- **Operating Net Profit**: \`${currSym} ${npVal.toLocaleString()}\` | **Net Profit Margin**: \`${netMargin}%\``);

  sections.push(`\n##### 🏷️ Operating Expenses Breakdown`);
  if (pnl?.expensesBreakdown?.topExpenseAccounts && pnl.expensesBreakdown.topExpenseAccounts.length > 0) {
    pnl.expensesBreakdown.topExpenseAccounts.forEach((exp: any) => {
      sections.push(`- **${exp.accountName}** (\`Acc ${exp.accountCode || ''}\`): \`${currSym} ${exp.currentAmount.toLocaleString()}\` (${exp.percentOfRevenue}% of Revenue)`);
    });
  } else {
    sections.push(`- *No operating expense line items recorded for this period.*`);
  }

  const overdueItems = invoices?.records ? invoices.records.filter((r: any) => r.status === 'OVERDUE') : [];
  sections.push(`\n##### 📑 Accounts Receivable (AR) & Overdue Invoices`);
  if (overdueItems.length > 0) {
    sections.push(`⚠️ **${overdueItems.length} Overdue Customer Invoices**:`);
    overdueItems.forEach((inv: any) => {
      sections.push(`- **${inv.contactName}** (\`${inv.invoiceNumber}\`): \`${currSym} ${inv.amountDue.toLocaleString()}\` (${inv.daysOverdue} days overdue)`);
    });
  } else {
    sections.push(`✅ **No overdue customer invoices recorded.**`);
  }

  sections.push(`\n#### 💡 Virtual CFO Actionable Next Steps
1. **Optimize Expense Margins**: Audit vendor SaaS subscriptions and marketing spend to protect the ${netMargin}% net profit margin.
2. **Accelerate AR Collections**: Monitor overdue accounts and issue automated payment reminders.
3. **Liquidity Reserves**: Maintain minimum liquid reserves across operating bank accounts.`);

  return sections.join('\n\n');
}


