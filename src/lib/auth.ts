import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function getTenantIdFromSession(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) return null;

    const session = await db.getSession(sessionToken);
    if (!session) return null;

    return session.tenant_id;
  } catch (err) {
    console.error('Failed to get tenant_id from session:', err);
    return null;
  }
}
