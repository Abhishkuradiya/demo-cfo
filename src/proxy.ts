import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths
  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/db-status', '/api/xero/callback', '/api/amazon'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Let static next files and favicon pass through
  const isNextAsset = pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname.match(/\.(png|jpg|jpeg|svg|ico)$/);

  if (isPublicPath || isNextAsset) {
    return NextResponse.next();
  }

  // Get session token
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    // If it's an API route, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    // If it's a page, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
