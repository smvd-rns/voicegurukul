import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearSessionCookie(response);
  return response;
}
export async function GET(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearSessionCookie(response);
  return response;
}
