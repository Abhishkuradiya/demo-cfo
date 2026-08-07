import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(req: Request) {
  try {
    const { email, password, companyName } = await req.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User already exists with this email' }, { status: 400 });
    }

    // 1. Create a new Tenant
    const tenantName = companyName.trim();
    const tenant = await db.createTenant(tenantName);

    // 2. Create User
    const hashedPassword = hashPassword(password);
    const user = await db.createUser(email.toLowerCase().trim(), hashedPassword, tenant.id);

    // 3. Create Session Token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Session expires in 7 days

    await db.createSession(user.id, sessionToken, expiresAt);

    // 4. Create Response and set cookie
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: { id: user.id, email: user.email, tenantId: user.tenant_id, companyName: tenant.name }
    });

    response.cookies.set({
      name: 'session_token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Registration failed' }, { status: 500 });
  }
}
