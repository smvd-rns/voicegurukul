import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check custom JWT session cookie
  const token = request.cookies.get('session_token')?.value;
  const path = request.nextUrl.pathname;

  // If user is logged in with valid token and tries to access login or home page, auto-redirect to dashboard
  if (token && (path === '/auth/login' || path === '/auth/register' || path === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
