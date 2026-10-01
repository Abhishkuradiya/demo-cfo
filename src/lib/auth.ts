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

    return null;
  } catch (err: any) {
    if (!err?.message?.includes('cookies')) {
      console.error('Failed to get tenant_id from session:', err);
    }
    return null;
  }
}
