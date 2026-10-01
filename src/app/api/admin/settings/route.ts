import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureSettingsTable() {
  if (db.isPgActive()) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INT PRIMARY KEY DEFAULT 1,
          smtp_host VARCHAR(255),
          smtp_port INTEGER,
          smtp_encryption VARCHAR(50),
          smtp_sender_email VARCHAR(255),
          smtp_sender_name VARCHAR(255),
          smtp_user VARCHAR(255),
          smtp_pass TEXT,
          smtp_verified BOOLEAN DEFAULT FALSE,
          maintenance_mode BOOLEAN DEFAULT FALSE,
          multi_tenancy_enabled BOOLEAN DEFAULT TRUE,
          audit_logging BOOLEAN DEFAULT TRUE,
          rate_limit VARCHAR(50) DEFAULT '1000',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.warn('System settings table check error:', e);
    }
  }
}

export async function GET() {
  try {
    await ensureSettingsTable();

    let settings: any = {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpEncryption: 'TLS',
      smtpSenderEmail: 'noreply@virtualcfo.com',
      smtpSenderName: 'Virtual CFO Platform',
      smtpUser: 'admin@virtualcfo.com',
      smtpPass: '',
      smtpVerified: false,
      maintenanceMode: false,
      multiTenancyEnabled: true,
      auditLogging: true,
      rateLimit: '1000'
    };

    if (db.isPgActive()) {
      const res = await db.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
      if (res.rows.length > 0) {
        const row = res.rows[0];
        settings = {
          smtpHost: row.smtp_host || settings.smtpHost,
          smtpPort: row.smtp_port || settings.smtpPort,
          smtpEncryption: row.smtp_encryption || settings.smtpEncryption,
          smtpSenderEmail: row.smtp_sender_email || settings.smtpSenderEmail,
          smtpSenderName: row.smtp_sender_name || settings.smtpSenderName,
          smtpUser: row.smtp_user || settings.smtpUser,
          smtpPass: row.smtp_pass || '',
          smtpVerified: row.smtp_verified ?? false,
          maintenanceMode: row.maintenance_mode ?? false,
          multiTenancyEnabled: row.multi_tenancy_enabled ?? true,
          auditLogging: row.audit_logging ?? true,
          rateLimit: row.rate_limit || '1000'
        };
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSettingsTable();
    const body = await req.json();

    const {
      smtpHost,
      smtpPort,
      smtpEncryption,
      smtpSenderEmail,
      smtpSenderName,
      smtpUser,
      smtpPass,
      smtpVerified,
      maintenanceMode,
      multiTenancyEnabled,
      auditLogging,
      rateLimit
    } = body;

    if (!smtpVerified) {
      return NextResponse.json({ 
        success: false, 
        message: 'SMTP settings must be verified via test email before saving!' 
      }, { status: 400 });
    }

    if (db.isPgActive()) {
      await db.query(`
        INSERT INTO system_settings (
          id, smtp_host, smtp_port, smtp_encryption, smtp_sender_email, smtp_sender_name, 
          smtp_user, smtp_pass, smtp_verified, maintenance_mode, multi_tenancy_enabled, audit_logging, rate_limit, updated_at
        ) VALUES (
          1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          smtp_host = EXCLUDED.smtp_host,
          smtp_port = EXCLUDED.smtp_port,
          smtp_encryption = EXCLUDED.smtp_encryption,
          smtp_sender_email = EXCLUDED.smtp_sender_email,
          smtp_sender_name = EXCLUDED.smtp_sender_name,
          smtp_user = EXCLUDED.smtp_user,
          smtp_pass = EXCLUDED.smtp_pass,
          smtp_verified = EXCLUDED.smtp_verified,
          maintenance_mode = EXCLUDED.maintenance_mode,
          multi_tenancy_enabled = EXCLUDED.multi_tenancy_enabled,
          audit_logging = EXCLUDED.audit_logging,
          rate_limit = EXCLUDED.rate_limit,
          updated_at = NOW();
      `, [
        smtpHost || 'smtp.gmail.com',
        parseInt(smtpPort) || 587,
        smtpEncryption || 'TLS',
        smtpSenderEmail || 'noreply@virtualcfo.com',
        smtpSenderName || 'Virtual CFO Platform',
        smtpUser || '',
        smtpPass || '',
        true,
        Boolean(maintenanceMode),
        Boolean(multiTenancyEnabled),
        Boolean(auditLogging),
        rateLimit || '1000'
      ]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'System settings & SMTP configuration verified and saved successfully!' 
    });
  } catch (err: any) {
    console.error('Failed to save settings:', err);
    return NextResponse.json({ success: false, message: 'Failed to save system settings' }, { status: 500 });
  }
}
