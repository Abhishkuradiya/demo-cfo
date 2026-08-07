import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
 
// PostgreSQL Connection Pool Config
export function parseXeroDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/Date\((\d+)(?:[+-]\d+)?\)/);
  if (match) {
    return new Date(parseInt(match[1]));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'virtual_cfo',
  connectionTimeoutMillis: 2000 // Quick timeout to fall back to JSON database if pg is offline
});
 
let isPgConnected = false;
 
// Initialize PostgreSQL tables if online
const initPgTables = async () => {
  try {
    const client = await pgPool.connect();
    isPgConnected = true;
    console.log('Successfully connected to PostgreSQL database!');
    
    // Create Tenants Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
 
    // Create Tenant Credentials Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_credentials (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        tenant_identifier VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        scopes TEXT[],
        client_id VARCHAR(255),
        client_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, provider)
      );
    `);
 
    // Create Caches Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        external_id VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
 
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        external_id VARCHAR(255),
        invoice_number VARCHAR(100),
        type VARCHAR(50),
        status VARCHAR(50),
        total DECIMAL,
        amount_due DECIMAL,
        amount_paid DECIMAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
 
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        external_id VARCHAR(255),
        amount DECIMAL,
        payment_type VARCHAR(50),
        status VARCHAR(50),
        payment_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
 
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        external_id VARCHAR(255),
        name VARCHAR(255),
        code VARCHAR(50),
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
 
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        report_type VARCHAR(50) NOT NULL,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, report_type)
      );
    `);
 
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        item_id VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_tracked_as_inventory BOOLEAN DEFAULT FALSE,
        quantity_on_hand DECIMAL,
        unit_price DECIMAL,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, item_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_thresholds (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        item_id VARCHAR(255) NOT NULL,
        minimum_stock DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, item_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_sales_history (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        item_id VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(255) NOT NULL,
        quantity_sold DECIMAL NOT NULL,
        sold_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_cache (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        cache_key VARCHAR(255) NOT NULL,
        cache_value JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, cache_key)
      );
    `);

    // Alter table to add currency, invoice_date, contact_name, due_date, and last_synced_at if they don't exist
    await client.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(50);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
      ALTER TABLE tenant_credentials ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
    `);

    client.release();
  } catch (err) {
    isPgConnected = false;
    console.warn('PostgreSQL database is offline or not created. Falling back to persistent JSON file database.');
  }
};
 
// Run PG check initially
initPgTables();
 
// Fallback JSON DB File Configuration
const JSON_DB_DIR = path.join(process.cwd(), 'src', 'data');
const JSON_DB_PATH = path.join(JSON_DB_DIR, 'db.json');
 
interface JsonSchema {
  tenants: any[];
  tenant_credentials: any[];
  contacts: any[];
  invoices: any[];
  payments: any[];
  accounts: any[];
  reports: any[];
  users: any[];
  sessions: any[];
  bank_transactions: any[];
  prepayments: any[];
  overpayments: any[];
  inventory_items?: any[];
  inventory_thresholds?: any[];
  inventory_sales_history?: any[];
  inventory_cache?: any[];
}
 
const readJsonDb = (): JsonSchema => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialSchema: JsonSchema = {
      tenants: [],
      tenant_credentials: [],
      contacts: [],
      invoices: [],
      payments: [],
      accounts: [],
      reports: [],
      users: [],
      sessions: [],
      bank_transactions: [],
      prepayments: [],
      overpayments: [],
      inventory_items: [],
      inventory_thresholds: [],
      inventory_sales_history: [],
      inventory_cache: []
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialSchema, null, 2));
    return initialSchema;
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.reports) parsed.reports = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.sessions) parsed.sessions = [];
    if (!parsed.bank_transactions) parsed.bank_transactions = [];
    if (!parsed.prepayments) parsed.prepayments = [];
    if (!parsed.overpayments) parsed.overpayments = [];
    if (!parsed.inventory_items) parsed.inventory_items = [];
    if (!parsed.inventory_thresholds) parsed.inventory_thresholds = [];
    if (!parsed.inventory_sales_history) parsed.inventory_sales_history = [];
    if (!parsed.inventory_cache) parsed.inventory_cache = [];
    return parsed;
  } catch (err) {
    return { tenants: [], tenant_credentials: [], contacts: [], invoices: [], payments: [], accounts: [], reports: [], users: [], sessions: [], bank_transactions: [], prepayments: [], overpayments: [], inventory_items: [], inventory_thresholds: [], inventory_sales_history: [], inventory_cache: [] };
  }
};
 
const writeJsonDb = (data: JsonSchema) => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};
 
// DATABASE EXPORTS
export const db = {
  // Check Connection Type
  isPostgres: () => isPgConnected,
 
  // 1. TENANT OPERATIONS
  getTenants: async (): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM tenants ORDER BY id ASC');
        return rows;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return json.tenants;
  },
 
  createTenant: async (name: string): Promise<any> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'INSERT INTO tenants (name) VALUES ($1) RETURNING *',
          [name]
        );
        return rows[0];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const newId = json.tenants.length > 0 ? Math.max(...json.tenants.map(t => t.id)) + 1 : 1;
    const newTenant = { id: newId, name, created_at: new Date().toISOString() };
    json.tenants.push(newTenant);
    writeJsonDb(json);
    return newTenant;
  },
 
  updateTenantName: async (id: number, name: string): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query('UPDATE tenants SET name = $1 WHERE id = $2', [name, id]);
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const t = json.tenants.find(x => x.id === id);
    if (t) {
      t.name = name;
      writeJsonDb(json);
    }
  },
 
  // 2. CREDENTIAL OPERATIONS
  getCredentials: async (tenantId: number, provider: string): Promise<any> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM tenant_credentials WHERE tenant_id = $1 AND provider = $2',
          [tenantId, provider]
        );
        return rows[0] || null;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return json.tenant_credentials.find(c => c.tenant_id === tenantId && c.provider === provider) || null;
  },
 
  saveCredentials: async (tenantId: number, provider: string, fields: {
    client_id?: string;
    client_secret?: string;
    tenant_identifier?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: Date | string;
    scopes?: string[];
    last_synced_at?: Date | string;
  }): Promise<void> => {
    // If the tenant_identifier (Xero Org ID) is changing, auto-clear old cached records
    if (fields.tenant_identifier) {
      try {
        const existing = await db.getCredentials(tenantId, provider);
        if (existing && existing.tenant_identifier && fields.tenant_identifier !== existing.tenant_identifier) {
          await db.clearCachedRecords(tenantId);
        }
      } catch (err) {
        console.error('Failed to auto-clear cache on tenant identifier change:', err);
      }
    }

    if (isPgConnected) {
      try {
        await pgPool.query(
          `INSERT INTO tenant_credentials (tenant_id, provider, client_id, client_secret, tenant_identifier, access_token, refresh_token, expires_at, scopes, last_synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (tenant_id, provider) 
           DO UPDATE SET 
             client_id = COALESCE($3, tenant_credentials.client_id),
             client_secret = COALESCE($4, tenant_credentials.client_secret),
             tenant_identifier = COALESCE($5, tenant_credentials.tenant_identifier),
             access_token = COALESCE($6, tenant_credentials.access_token),
             refresh_token = COALESCE($7, tenant_credentials.refresh_token),
             expires_at = COALESCE($8, tenant_credentials.expires_at),
             scopes = COALESCE($9, tenant_credentials.scopes),
             last_synced_at = COALESCE($10, tenant_credentials.last_synced_at)`,
          [
            tenantId,
            provider,
            fields.client_id || null,
            fields.client_secret || null,
            fields.tenant_identifier || null,
            fields.access_token || null,
            fields.refresh_token || null,
            fields.expires_at || null,
            fields.scopes || null,
            fields.last_synced_at || null
          ]
        );
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const idx = json.tenant_credentials.findIndex(c => c.tenant_id === tenantId && c.provider === provider);
    const existing = idx >= 0 ? json.tenant_credentials[idx] : {};
    const updated = {
      tenant_id: tenantId,
      provider,
      client_id: fields.client_id !== undefined ? fields.client_id : existing.client_id,
      client_secret: fields.client_secret !== undefined ? fields.client_secret : existing.client_secret,
      tenant_identifier: fields.tenant_identifier !== undefined ? fields.tenant_identifier : existing.tenant_identifier,
      access_token: fields.access_token !== undefined ? fields.access_token : existing.access_token,
      refresh_token: fields.refresh_token !== undefined ? fields.refresh_token : existing.refresh_token,
      expires_at: fields.expires_at !== undefined ? fields.expires_at : existing.expires_at,
      scopes: fields.scopes !== undefined ? fields.scopes : existing.scopes,
      last_synced_at: fields.last_synced_at !== undefined ? fields.last_synced_at : existing.last_synced_at
    };
    if (idx >= 0) {
      json.tenant_credentials[idx] = updated;
    } else {
      json.tenant_credentials.push(updated);
    }
    writeJsonDb(json);
  },
 
  deleteCredentials: async (tenantId: number, provider: string): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query(
          'DELETE FROM tenant_credentials WHERE tenant_id = $1 AND provider = $2',
          [tenantId, provider]
        );
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    json.tenant_credentials = json.tenant_credentials.filter(c => !(c.tenant_id === tenantId && c.provider === provider));
    writeJsonDb(json);
  },
 
  // 3. CACHE SCHEMA STATISTICS
  getSyncCounts: async (tenantId: number): Promise<any> => {
    if (isPgConnected) {
      try {
        const contacts = await pgPool.query('SELECT COUNT(*) FROM contacts WHERE tenant_id = $1', [tenantId]);
        const invoices = await pgPool.query('SELECT COUNT(*) FROM invoices WHERE tenant_id = $1', [tenantId]);
        const payments = await pgPool.query('SELECT COUNT(*) FROM payments WHERE tenant_id = $1', [tenantId]);
        const accounts = await pgPool.query('SELECT COUNT(*) FROM accounts WHERE tenant_id = $1', [tenantId]);
        // Bank transactions, prepayments, overpayments stored in reports table as JSON
        const bankTxns = await db.getReport(tenantId, 'BankTransactions');
        const prepays = await db.getReport(tenantId, 'Prepayments');
        const overpays = await db.getReport(tenantId, 'Overpayments');
        return {
          contacts: parseInt(contacts.rows[0].count),
          invoices: parseInt(invoices.rows[0].count),
          payments: parseInt(payments.rows[0].count),
          accounts: parseInt(accounts.rows[0].count),
          bankTransactions: Array.isArray(bankTxns) ? bankTxns.length : 0,
          prepayments: Array.isArray(prepays) ? prepays.length : 0,
          overpayments: Array.isArray(overpays) ? overpays.length : 0
        };
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return {
      contacts: json.contacts.filter(x => x.tenant_id === tenantId).length,
      invoices: json.invoices.filter(x => x.tenant_id === tenantId).length,
      payments: json.payments.filter(x => x.tenant_id === tenantId).length,
      accounts: json.accounts.filter(x => x.tenant_id === tenantId).length,
      bankTransactions: (json.bank_transactions || []).filter(x => x.tenant_id === tenantId).length,
      prepayments: (json.prepayments || []).filter(x => x.tenant_id === tenantId).length,
      overpayments: (json.overpayments || []).filter(x => x.tenant_id === tenantId).length
    };
  },
 
  saveCachedRecords: async (tenantId: number, type: 'invoices' | 'contacts' | 'payments' | 'accounts', records: any[]): Promise<void> => {
    if (isPgConnected) {
      try {
        // Clear old cache first
        await pgPool.query(`DELETE FROM ${type} WHERE tenant_id = $1`, [tenantId]);
        
        // Batch insert
        for (const item of records) {
          if (type === 'contacts') {
            await pgPool.query(
              'INSERT INTO contacts (tenant_id, external_id, name, email) VALUES ($1, $2, $3, $4)',
              [tenantId, item.ContactID || null, item.Name || null, item.EmailAddress || null]
            );
          } else if (type === 'invoices') {
            await pgPool.query(
              'INSERT INTO invoices (tenant_id, external_id, invoice_number, type, status, total, amount_due, amount_paid, currency, invoice_date, contact_name, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
              [
                tenantId,
                item.InvoiceID || null,
                item.InvoiceNumber || null,
                item.Type || null,
                item.Status || null,
                item.Total || 0,
                item.AmountDue || 0,
                item.AmountPaid || 0,
                item.CurrencyCode || null,
                parseXeroDate(item.Date),
                item.Contact?.Name || null,
                parseXeroDate(item.DueDate)
              ]
            );
          } else if (type === 'payments') {
            await pgPool.query(
              'INSERT INTO payments (tenant_id, external_id, amount, payment_type, status, payment_date) VALUES ($1, $2, $3, $4, $5, $6)',
              [
                tenantId,
                item.PaymentID || null,
                item.Amount || 0,
                item.PaymentType || null,
                item.Status || null,
                item.Date ? parseXeroDate(item.Date) : null
              ]
            );
          } else if (type === 'accounts') {
            await pgPool.query(
              'INSERT INTO accounts (tenant_id, external_id, name, code, type) VALUES ($1, $2, $3, $4, $5)',
              [tenantId, item.AccountID || null, item.Name || null, item.Code || null, item.Type || null]
            );
          }
        }
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    
    const json = readJsonDb();
    // Clear old elements
    json[type] = json[type].filter(x => x.tenant_id !== tenantId);
    
    // Add new elements
    for (const item of records) {
      json[type].push({ tenant_id: tenantId, ...item });
    }
    writeJsonDb(json);
  },
 
  clearCachedRecords: async (tenantId: number): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query('DELETE FROM contacts WHERE tenant_id = $1', [tenantId]);
        await pgPool.query('DELETE FROM invoices WHERE tenant_id = $1', [tenantId]);
        await pgPool.query('DELETE FROM payments WHERE tenant_id = $1', [tenantId]);
        await pgPool.query('DELETE FROM accounts WHERE tenant_id = $1', [tenantId]);
        await pgPool.query('DELETE FROM reports WHERE tenant_id = $1', [tenantId]);
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    json.contacts = json.contacts.filter(x => x.tenant_id !== tenantId);
    json.invoices = json.invoices.filter(x => x.tenant_id !== tenantId);
    json.payments = json.payments.filter(x => x.tenant_id !== tenantId);
    json.accounts = json.accounts.filter(x => x.tenant_id !== tenantId);
    json.reports = json.reports.filter(x => x.tenant_id !== tenantId);
    json.bank_transactions = (json.bank_transactions || []).filter(x => x.tenant_id !== tenantId);
    json.prepayments = (json.prepayments || []).filter(x => x.tenant_id !== tenantId);
    json.overpayments = (json.overpayments || []).filter(x => x.tenant_id !== tenantId);
    writeJsonDb(json);
  },
 
  getInvoices: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM invoices WHERE tenant_id = $1', [tenantId]);
        return rows.map(r => ({
          ...r,
          InvoiceID: r.external_id,
          InvoiceNumber: r.invoice_number,
          Type: r.type,
          Status: r.status,
          Total: parseFloat(r.total || 0),
          AmountDue: parseFloat(r.amount_due || 0),
          AmountPaid: parseFloat(r.amount_paid || 0),
          CurrencyCode: r.currency,
          Date: r.invoice_date,
          ContactName: r.contact_name,
          DueDate: r.due_date
        }));
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return json.invoices.filter(x => x.tenant_id === tenantId).map(inv => ({
      ...inv,
      ContactName: inv.Contact?.Name || inv.ContactName || null,
      DueDate: inv.DueDate
    }));
  },

  getPayments: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM payments WHERE tenant_id = $1', [tenantId]);
        return rows.map(r => ({
          ...r,
          PaymentID: r.external_id,
          Amount: parseFloat(r.amount || 0),
          PaymentType: r.payment_type,
          Status: r.status,
          Date: r.payment_date || r.created_at
        }));
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return json.payments.filter(x => x.tenant_id === tenantId);
  },

  getAccounts: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM accounts WHERE tenant_id = $1', [tenantId]);
        return rows.map(r => ({
          ...r,
          AccountID: r.external_id,
          Name: r.name,
          Code: r.code,
          Type: r.type,
          Status: r.status || 'ACTIVE'
        }));
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.accounts || []).filter(x => x.tenant_id === tenantId).map(acc => ({
      ...acc,
      Status: acc.Status || 'ACTIVE'
    }));
  },
 
  // ── Cash Flow Source Getters ──────────────────────────────────────
  // BankTransactions, Prepayments, and Overpayments are stored as JSON arrays.
  // In PG mode: stored in the `reports` table with report_type keys.
  // In JSON mode: stored in dedicated top-level arrays in db.json.

  getBankTransactions: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const data = await db.getReport(tenantId, 'BankTransactions');
        return Array.isArray(data) ? data : [];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.bank_transactions || []).filter(x => x.tenant_id === tenantId);
  },

  getPrepayments: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const data = await db.getReport(tenantId, 'Prepayments');
        return Array.isArray(data) ? data : [];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.prepayments || []).filter(x => x.tenant_id === tenantId);
  },

  getOverpayments: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const data = await db.getReport(tenantId, 'Overpayments');
        return Array.isArray(data) ? data : [];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.overpayments || []).filter(x => x.tenant_id === tenantId);
  },

  saveReport: async (tenantId: number, reportType: string, rawData: any): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query(
          `INSERT INTO reports (tenant_id, report_type, raw_data)
           VALUES ($1, $2, $3)
           ON CONFLICT (tenant_id, report_type)
           DO UPDATE SET raw_data = $3`,
          [tenantId, reportType, JSON.stringify(rawData)]
        );
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const idx = json.reports.findIndex(r => r.tenant_id === tenantId && r.report_type === reportType);
    const updated = { tenant_id: tenantId, report_type: reportType, raw_data: rawData };
    if (idx >= 0) {
      json.reports[idx] = updated;
    } else {
      json.reports.push(updated);
    }
    writeJsonDb(json);
  },
 
  getReport: async (tenantId: number, reportType: string): Promise<any | null> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'SELECT raw_data FROM reports WHERE tenant_id = $1 AND report_type = $2',
          [tenantId, reportType]
        );
        return rows[0] ? rows[0].raw_data : null;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const item = json.reports.find(r => r.tenant_id === tenantId && r.report_type === reportType);
    return item ? item.raw_data : null;
  },

  createUser: async (email: string, passwordHash: string, tenantId: number): Promise<any> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'INSERT INTO users (email, password_hash, tenant_id) VALUES ($1, $2, $3) RETURNING *',
          [email, passwordHash, tenantId]
        );
        return rows[0];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const newId = json.users.length > 0 ? Math.max(...json.users.map(u => u.id)) + 1 : 1;
    const newUser = { id: newId, email, password_hash: passwordHash, tenant_id: tenantId, created_at: new Date().toISOString() };
    json.users.push(newUser);
    writeJsonDb(json);
    return newUser;
  },

  getUserByEmail: async (email: string): Promise<any | null> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0] || null;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return json.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createSession: async (userId: number, token: string, expiresAt: Date | string): Promise<any> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3) RETURNING *',
          [userId, token, expiresAt]
        );
        return rows[0];
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const newId = json.sessions.length > 0 ? Math.max(...json.sessions.map(s => s.id)) + 1 : 1;
    const newSession = { id: newId, user_id: userId, session_token: token, expires_at: new Date(expiresAt).toISOString(), created_at: new Date().toISOString() };
    json.sessions.push(newSession);
    writeJsonDb(json);
    return newSession;
  },

  getSession: async (token: string): Promise<any | null> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          `SELECT s.*, u.email, u.tenant_id 
           FROM sessions s 
           JOIN users u ON s.user_id = u.id 
           WHERE s.session_token = $1 AND s.expires_at > NOW()`,
          [token]
        );
        return rows[0] || null;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const session = json.sessions.find(s => s.session_token === token);
    if (!session) return null;
    
    // Check expiration
    if (new Date(session.expires_at) <= new Date()) {
      json.sessions = json.sessions.filter(s => s.session_token !== token);
      writeJsonDb(json);
      return null;
    }

    const user = json.users.find(u => u.id === session.user_id);
    if (!user) return null;

    return {
      ...session,
      email: user.email,
      tenant_id: user.tenant_id
    };
  },

  deleteSession: async (token: string): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query('DELETE FROM sessions WHERE session_token = $1', [token]);
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    json.sessions = json.sessions.filter(s => s.session_token !== token);
    writeJsonDb(json);
  },

  // 9. INVENTORY OPERATIONS
  saveInventoryItems: async (tenantId: number, items: any[]): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query('DELETE FROM inventory_items WHERE tenant_id = $1', [tenantId]);
        for (const item of items) {
          await pgPool.query(
            `INSERT INTO inventory_items (tenant_id, item_id, code, name, is_tracked_as_inventory, quantity_on_hand, unit_price, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              tenantId,
              item.ItemID,
              item.Code,
              item.Name || null,
              item.IsTrackedAsInventory === true,
              item.QuantityOnHand !== undefined && item.QuantityOnHand !== null ? parseFloat(item.QuantityOnHand) : null,
              item.PurchaseDetails?.UnitPrice !== undefined && item.PurchaseDetails?.UnitPrice !== null ? parseFloat(item.PurchaseDetails.UnitPrice) : null,
              JSON.stringify(item)
            ]
          );
        }
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    if (!json.inventory_items) json.inventory_items = [];
    json.inventory_items = json.inventory_items.filter(x => x.tenant_id !== tenantId);
    for (const item of items) {
      json.inventory_items.push({
        tenant_id: tenantId,
        item_id: item.ItemID,
        code: item.Code,
        name: item.Name || null,
        is_tracked_as_inventory: item.IsTrackedAsInventory === true,
        quantity_on_hand: item.QuantityOnHand !== undefined && item.QuantityOnHand !== null ? parseFloat(item.QuantityOnHand) : null,
        unit_price: item.PurchaseDetails?.UnitPrice !== undefined && item.PurchaseDetails?.UnitPrice !== null ? parseFloat(item.PurchaseDetails.UnitPrice) : null,
        raw_data: item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    writeJsonDb(json);
  },

  getInventoryItems: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM inventory_items WHERE tenant_id = $1', [tenantId]);
        return rows.map(r => ({
          ...r,
          IsTrackedAsInventory: r.is_tracked_as_inventory,
          QuantityOnHand: r.quantity_on_hand,
          PurchaseDetails: { UnitPrice: r.unit_price }
        }));
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.inventory_items || [])
      .filter(x => x.tenant_id === tenantId)
      .map(r => ({
        ...r,
        IsTrackedAsInventory: r.is_tracked_as_inventory,
        QuantityOnHand: r.quantity_on_hand,
        PurchaseDetails: { UnitPrice: r.unit_price },
        ItemID: r.item_id,
        Code: r.code,
        Name: r.name
      }));
  },

  getThresholds: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM inventory_thresholds WHERE tenant_id = $1', [tenantId]);
        return rows;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.inventory_thresholds || []).filter(x => x.tenant_id === tenantId);
  },

  saveThreshold: async (tenantId: number, itemId: string, minimumStock: number): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query(
          `INSERT INTO inventory_thresholds (tenant_id, item_id, minimum_stock, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (tenant_id, item_id) 
           DO UPDATE SET minimum_stock = $3, updated_at = NOW()`,
          [tenantId, itemId, minimumStock]
        );
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    if (!json.inventory_thresholds) json.inventory_thresholds = [];
    const idx = json.inventory_thresholds.findIndex(x => x.tenant_id === tenantId && x.item_id === itemId);
    if (idx >= 0) {
      json.inventory_thresholds[idx].minimum_stock = minimumStock;
      json.inventory_thresholds[idx].updated_at = new Date().toISOString();
    } else {
      const newId = json.inventory_thresholds.length > 0 ? Math.max(...json.inventory_thresholds.map(x => x.id || 0)) + 1 : 1;
      json.inventory_thresholds.push({
        id: newId,
        tenant_id: tenantId,
        item_id: itemId,
        minimum_stock: minimumStock,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    writeJsonDb(json);
  },

  saveSalesHistory: async (tenantId: number, sales: any[]): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query('DELETE FROM inventory_sales_history WHERE tenant_id = $1', [tenantId]);
        for (const s of sales) {
          await pgPool.query(
            `INSERT INTO inventory_sales_history (tenant_id, item_id, invoice_id, quantity_sold, sold_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [tenantId, s.item_id, s.invoice_id, s.quantity_sold, s.sold_at]
          );
        }
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    if (!json.inventory_sales_history) json.inventory_sales_history = [];
    json.inventory_sales_history = json.inventory_sales_history.filter(x => x.tenant_id !== tenantId);
    for (const s of sales) {
      json.inventory_sales_history.push({
        tenant_id: tenantId,
        item_id: s.item_id,
        invoice_id: s.invoice_id,
        quantity_sold: s.quantity_sold,
        sold_at: s.sold_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    writeJsonDb(json);
  },

  getSalesHistory: async (tenantId: number): Promise<any[]> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query('SELECT * FROM inventory_sales_history WHERE tenant_id = $1', [tenantId]);
        return rows;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    return (json.inventory_sales_history || []).filter(x => x.tenant_id === tenantId);
  },

  saveInventoryCache: async (tenantId: number, key: string, value: any, expiresSeconds: number): Promise<void> => {
    const expiresAt = new Date(Date.now() + expiresSeconds * 1000).toISOString();
    if (isPgConnected) {
      try {
        await pgPool.query(
          `INSERT INTO inventory_cache (tenant_id, cache_key, cache_value, expires_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (tenant_id, cache_key)
           DO UPDATE SET cache_value = $3, expires_at = $4, updated_at = NOW()`,
          [tenantId, key, JSON.stringify(value), expiresAt]
        );
        return;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    if (!json.inventory_cache) json.inventory_cache = [];
    const idx = json.inventory_cache.findIndex(x => x.tenant_id === tenantId && x.cache_key === key);
    if (idx >= 0) {
      json.inventory_cache[idx].cache_value = value;
      json.inventory_cache[idx].expires_at = expiresAt;
      json.inventory_cache[idx].updated_at = new Date().toISOString();
    } else {
      const newId = json.inventory_cache.length > 0 ? Math.max(...json.inventory_cache.map(x => x.id || 0)) + 1 : 1;
      json.inventory_cache.push({
        id: newId,
        tenant_id: tenantId,
        cache_key: key,
        cache_value: value,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    writeJsonDb(json);
  },

  getInventoryCache: async (tenantId: number, key: string): Promise<any | null> => {
    if (isPgConnected) {
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM inventory_cache WHERE tenant_id = $1 AND cache_key = $2 AND expires_at > NOW()',
          [tenantId, key]
        );
        return rows[0] ? (typeof rows[0].cache_value === 'string' ? JSON.parse(rows[0].cache_value) : rows[0].cache_value) : null;
      } catch (e) {
        isPgConnected = false;
      }
    }
    const json = readJsonDb();
    const cached = (json.inventory_cache || []).find(
      x => x.tenant_id === tenantId && x.cache_key === key && new Date(x.expires_at) > new Date()
    );
    return cached ? cached.cache_value : null;
  }
};
