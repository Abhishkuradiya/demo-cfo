import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
 
// PostgreSQL Connection Pool Config
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
 
    // Insert seed tenant
    await client.query(`
      INSERT INTO tenants (id, name) 
      VALUES (1, 'Demo Company (India)') 
      ON CONFLICT (id) DO NOTHING;
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
}
 
const readJsonDb = (): JsonSchema => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialSchema: JsonSchema = {
      tenants: [{ id: 1, name: 'Demo Company (India)' }],
      tenant_credentials: [],
      contacts: [],
      invoices: [],
      payments: [],
      accounts: []
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialSchema, null, 2));
    return initialSchema;
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { tenants: [], tenant_credentials: [], contacts: [], invoices: [], payments: [], accounts: [] };
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
  }): Promise<void> => {
    if (isPgConnected) {
      try {
        await pgPool.query(
          `INSERT INTO tenant_credentials (tenant_id, provider, client_id, client_secret, tenant_identifier, access_token, refresh_token, expires_at, scopes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (tenant_id, provider) 
           DO UPDATE SET 
             client_id = COALESCE($3, tenant_credentials.client_id),
             client_secret = COALESCE($4, tenant_credentials.client_secret),
             tenant_identifier = COALESCE($5, tenant_credentials.tenant_identifier),
             access_token = COALESCE($6, tenant_credentials.access_token),
             refresh_token = COALESCE($7, tenant_credentials.refresh_token),
             expires_at = COALESCE($8, tenant_credentials.expires_at),
             scopes = COALESCE($9, tenant_credentials.scopes)`,
          [
            tenantId,
            provider,
            fields.client_id || null,
            fields.client_secret || null,
            fields.tenant_identifier || null,
            fields.access_token || null,
            fields.refresh_token || null,
            fields.expires_at || null,
            fields.scopes || null
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
      scopes: fields.scopes !== undefined ? fields.scopes : existing.scopes
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
        return {
          contacts: parseInt(contacts.rows[0].count),
          invoices: parseInt(invoices.rows[0].count),
          payments: parseInt(payments.rows[0].count),
          accounts: parseInt(accounts.rows[0].count)
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
      accounts: json.accounts.filter(x => x.tenant_id === tenantId).length
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
              'INSERT INTO invoices (tenant_id, external_id, invoice_number, type, status, total, amount_due, amount_paid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
              [
                tenantId,
                item.InvoiceID || null,
                item.InvoiceNumber || null,
                item.Type || null,
                item.Status || null,
                item.Total || 0,
                item.AmountDue || 0,
                item.AmountPaid || 0
              ]
            );
          } else if (type === 'payments') {
            await pgPool.query(
              'INSERT INTO payments (tenant_id, external_id, amount) VALUES ($1, $2, $3)',
              [tenantId, item.PaymentID || null, item.Amount || 0]
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
    writeJsonDb(json);
  }
};
