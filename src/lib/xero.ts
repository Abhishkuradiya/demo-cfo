import { db } from './db';
 
export async function refreshXeroToken(tenantId: number, credentials: any): Promise<string> {
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const basicAuth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64');
 
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token
    })
  });
 
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh credentials with Xero Token Server: ${errText}`);
  }
 
  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
 
  await db.saveCredentials(tenantId, 'xero', {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    scopes: data.scope.split(' ')
  });
 
  return data.access_token;
}
 
export async function getXeroAccessToken(tenantId: number): Promise<{ accessToken: string; xeroTenantId: string } | null> {
  const credentials = await db.getCredentials(tenantId, 'xero');
  if (!credentials || !credentials.client_id || !credentials.client_secret || !credentials.access_token || !credentials.tenant_identifier) {
    return null;
  }
 
  let accessToken = credentials.access_token;
  if (new Date(credentials.expires_at) <= new Date()) {
    try {
      accessToken = await refreshXeroToken(tenantId, credentials);
    } catch (err) {
      console.error('Error refreshing Xero token:', err);
      return null;
    }
  }
 
  return {
    accessToken,
    xeroTenantId: credentials.tenant_identifier
  };
}
 
export async function fetchXeroResource(accessToken: string, xeroTenantId: string, resource: string, queryParams?: string): Promise<any[]> {
  const url = `https://api.xero.com/api.xro/2.0/${resource}${queryParams ? `?${queryParams}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Accept': 'application/json'
    }
  });
 
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Xero resource [${resource}]: ${errText}`);
  }
 
  const data = await res.json();
  return data[resource] || [];
}
 
export async function fetchXeroReport(accessToken: string, xeroTenantId: string, reportPath: string, queryParams?: string): Promise<any> {
  const url = `https://api.xero.com/api.xro/2.0/Reports/${reportPath}${queryParams ? `?${queryParams}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Accept': 'application/json'
    }
  });
 
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Xero report [${reportPath}]: ${errText}`);
  }
 
  const data = await res.json();
  return data.Reports && data.Reports[0] ? data.Reports[0] : null;
}
