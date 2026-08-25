import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch Tenant Details
    const tenantsList = await db.getTenants();
    const activeTenant = tenantsList.find(t => t.id === session.tenant_id);
    const companyName = activeTenant ? activeTenant.name : 'My Workspace';

    return NextResponse.json({
      success: true,
      user: {
        id: session.user_id,
        email: session.email,
        tenantId: session.tenant_id,
        companyName
      }
    });
  } catch (err: any) {
    console.error('Validate session error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
