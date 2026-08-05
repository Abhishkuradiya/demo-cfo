import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
 
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '1';
  const tenantId = parseInt(state);
 
  if (!code) {
    return new Response('Error: Missing authorization code from Xero server.', { status: 400 });
  }
 
  try {
    const credentials = await db.getCredentials(tenantId, 'xero');
    if (!credentials || !credentials.client_id || !credentials.client_secret) {
      return new Response('Error: Client credentials not found for this tenant.', { status: 400 });
    }
 
    // 1. Exchange authorization code for access token
    const tokenUrl = 'https://identity.xero.com/connect/token';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/xero/callback`;
    const basicAuth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64');
 
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
 
    if (!tokenRes.ok) {
      const errorMsg = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errorMsg}`);
    }
 
    const tokenData = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
 
    // 2. Fetch connected organization connections from Xero
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
 
    if (!connectionsRes.ok) {
      throw new Error('Failed to retrieve connected Xero organizations.');
    }
 
    const connections = await connectionsRes.json();
    
    // Find organization connection
    const orgConnection = connections.find((conn: any) => conn.tenantType === 'ORGANISATION');
    if (!orgConnection) {
      throw new Error('No active Xero organization connection found.');
    }
 
    const xeroTenantId = orgConnection.tenantId; // Connection UUID
    const orgName = orgConnection.tenantName || 'Demo Company (India)';
 
    // 3. Save connection details in the database
    await db.saveCredentials(tenantId, 'xero', {
      tenant_identifier: xeroTenantId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      scopes: tokenData.scope.split(' ')
    });
 
    // 4. Update the local tenant company name to match the authorized Xero organization name!
    await db.updateTenantName(tenantId, orgName);
 
    // 5. Render a premium HTML success page
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xero Connected Successfully</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f4f7f9;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
          }
          .logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            background-color: #00b7e2;
            color: #ffffff;
            border-radius: 50%;
            font-size: 20px;
            font-weight: 300;
            margin-bottom: 24px;
            user-select: none;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 8px 0;
          }
          p {
            font-size: 13px;
            color: #64748b;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .badge {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 9999px;
            display: inline-block;
            margin-bottom: 24px;
          }
          .button {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            padding: 10px 24px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            border: none;
            outline: none;
            display: inline-block;
            transition: background-color 0.2s;
          }
          .button:hover {
            background-color: #0f172a;
          }
          .timer {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 16px;
          }
        </style>
        <script>
          let seconds = 5;
          function countdown() {
            seconds--;
            if (seconds <= 0) {
              window.close();
            } else {
              document.getElementById("timer").innerHTML = "This window will close in " + seconds + " seconds...";
              setTimeout(countdown, 1000);
            }
          }
          window.onload = function() {
            setTimeout(countdown, 1000);
          };
        </script>
      </head>
      <body>
        <div class="card">
          <div class="logo">xero</div>
          <h1>Connection Authorized!</h1>
          <p>Your tenant company <strong>${orgName}</strong> is now securely connected to the Virtual CFO Platform.</p>
          <div class="badge">Success Callback Processed</div>
          <div>
            <button class="button" onclick="window.close()">Close Window</button>
          </div>
          <div class="timer" id="timer">This window will close in 5 seconds...</div>
        </div>
      </body>
      </html>
    `;
 
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err: any) {
    return new Response(`Authentication Callback failed: ${err.message}`, { status: 500 });
  }
}
