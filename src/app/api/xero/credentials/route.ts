import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
 
// GET returns saved client credentials (masked) for display in the Settings modal
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantIdStr = searchParams.get('tenant_id') || '1';
  const tenantId = parseInt(tenantIdStr);
 
  try {
    const credentials = await db.getCredentials(tenantId, 'xero');
    
    if (credentials && credentials.client_id) {
      return NextResponse.json({
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret || ''
      });
    }
    
    return NextResponse.json({ clientId: '', clientSecret: '' });
  } catch (err: any) {
    return NextResponse.json({ clientId: '', clientSecret: '', error: err.message });
  }
}
