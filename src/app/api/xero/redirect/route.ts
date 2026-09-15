import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdFromSession();
  if (tenantId === null) {
    return new Response(
      'Error: Unauthorized. Please log in first.',
      { status: 401 }
    );
  }

  try {
    const credentials = await db.getCredentials(tenantId, 'xero');
    if (!credentials || !credentials.client_id) {
      return new Response(
        'Error: No client credentials found for this tenant company. Please save Client ID and Client Secret in Data Sources first.',
        { status: 400 }
      );
    }

    // Construct Redirect URL
    const authorizeUrl = 'https://login.xero.com/identity/connect/authorize';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
    const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const redirectUri = `${baseUrl}/api/xero/callback`;
    // Exact scope string from the working Laravel OAuthManager (line 23 of OAuthManager.php)
    const scopes = 'openid profile email offline_access accounting.contacts.read accounting.invoices.read accounting.payments.read accounting.settings.read accounting.reports.profitandloss.read accounting.banktransactions.read accounting.attachments accounting.budgets.read accounting.manualjournals.read accounting.reports.balancesheet.read accounting.reports.trialbalance.read accounting.reports.aged.read accounting.reports.banksummary.read accounting.reports.tenninetynine.read accounting.reports.taxreports.read accounting.reports.budgetsummary.read accounting.reports.executivesummary.read accounting.invoices accounting.payments assets';
    console.log('--- XERO OAUTH REDIRECT ---');
    console.log('Redirect URI:', redirectUri);
    console.log('Scopes:', scopes);
    console.log('---------------------------');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: credentials.client_id,
      redirect_uri: redirectUri,
      scope: scopes,
      state: String(tenantId)
    });

    return NextResponse.redirect(`${authorizeUrl}?${params.toString()}`);
  } catch (err: any) {
    return new Response(`Redirection failed: ${err.message}`, { status: 500 });
  }
}
