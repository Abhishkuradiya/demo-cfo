import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let users: any[] = [];
    if (db.isPgActive()) {
      const res = await db.query(`
        SELECT 
          u.id, 
          u.email, 
          u.tenant_id, 
          u.created_at, 
          t.name as tenant_name 
        FROM users u 
        INNER JOIN tenants t ON u.tenant_id = t.id 
        WHERE u.tenant_id IS NOT NULL 
          AND u.email != 'admin@virtualcfo.com'
        ORDER BY u.id ASC
      `);
      users = res.rows || [];
    } else {
      const json = db.readJsonDb();
      users = (json.users || []).filter((u: any) => u.tenant_id && u.email !== 'admin@virtualcfo.com');
    }

    const formattedUsers = users.map((u: any) => ({
      id: `usr-${u.id}`,
      name: u.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      email: u.email,
      company: u.tenant_name || `Tenant #${u.tenant_id}`,
      role: 'Finance Manager',
      status: 'Active',
      lastLogin: u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch database users' }, { status: 500 });
  }
}
