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
    try {
      await db.clearXeroTokens(tenantId);
    } catch (clearErr) {
      console.error('Failed to auto-clear invalid Xero tokens:', clearErr);
    }
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
 
export async function fetchXeroResource(
  accessToken: string, 
  xeroTenantId: string, 
  resource: string, 
  queryParams?: string,
  retriesLeft: number = 3,
  modifiedSince?: string | Date
): Promise<any[]> {
  const url = `https://api.xero.com/api.xro/2.0/${resource}${queryParams ? `?${queryParams}` : ''}`;
  
  // Throttle to naturally pace concurrent requests
  await new Promise(resolve => setTimeout(resolve, 150));

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Xero-Tenant-Id': xeroTenantId,
    'Accept': 'application/json'
  };

  if (modifiedSince) {
    const modDate = typeof modifiedSince === 'string' ? new Date(modifiedSince) : modifiedSince;
    if (!isNaN(modDate.getTime())) {
      // Format as UTC ISO string or RFC1123 format expected by Xero: e.g. 2026-08-24T00:00:00
      headers['If-Modified-Since'] = modDate.toISOString();
    }
  }

  const res = await fetch(url, { headers });

  if (res.status === 304) {
    // 304 Not Modified: Data has not changed since modifiedSince timestamp
    return [];
  }

  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2') * 1000;
    console.warn(`[Xero API] Rate limit (429) hit for [${resource}]. Waiting ${retryAfter}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
    return fetchXeroResource(accessToken, xeroTenantId, resource, queryParams, retriesLeft - 1, modifiedSince);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Xero resource [${resource}] (Status ${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data[resource] || [];
}
 
export async function fetchXeroReport(
  accessToken: string, 
  xeroTenantId: string, 
  reportPath: string, 
  queryParams?: string,
  retriesLeft: number = 3
): Promise<any> {
  const url = `https://api.xero.com/api.xro/2.0/Reports/${reportPath}${queryParams ? `?${queryParams}` : ''}`;
  
  // Throttle to naturally pace concurrent requests
  await new Promise(resolve => setTimeout(resolve, 150));

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Accept': 'application/json'
    }
  });

  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2') * 1000;
    console.warn(`[Xero API] Rate limit (429) hit for report [${reportPath}]. Waiting ${retryAfter}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
    return fetchXeroReport(accessToken, xeroTenantId, reportPath, queryParams, retriesLeft - 1);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Xero report [${reportPath}] (Status ${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.Reports && data.Reports[0] ? data.Reports[0] : null;
}
