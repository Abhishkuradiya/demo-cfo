import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function getTenantIdFromSession(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (sessionToken) {
      const session = await db.getSession(sessionToken);
      if (session && session.tenant_id) {
        return session.tenant_id;
      }
    }

    // Fallback to active tenant in DB or default tenant 1 to prevent unwanted logouts
    const tenants = await db.getTenants();
    if (tenants && tenants.length > 0) {
      return tenants[0].id;
    }

    return 1;
  } catch (err) {
    console.error('Failed to get tenant_id from session:', err);
    return 1;
  }
}
