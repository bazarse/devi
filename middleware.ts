import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('devi_user_role')?.value;

  // 1. Auto-Redirect Logged-in users from Landing / Login page straight to their dashboard
  if (pathname === '/' || pathname === '/login') {
    if (userRole === 'super_admin') {
      return NextResponse.redirect(new URL('/admin/super', request.url));
    } else if (userRole === 'store_admin') {
      return NextResponse.redirect(new URL('/admin/store', request.url));
    } else if (userRole === 'salesman') {
      return NextResponse.redirect(new URL('/pos', request.url));
    }
  }

  // 2. Guard Super Admin Routes (/admin/super/*)
  if (pathname.startsWith('/admin/super')) {
    if (userRole !== 'super_admin') {
      if (userRole === 'store_admin') {
        return NextResponse.redirect(new URL('/admin/store', request.url));
      }
      return NextResponse.redirect(new URL('/pos', request.url));
    }
  }

  // 3. Guard Store Admin Routes (/admin/store/*)
  if (pathname.startsWith('/admin/store') || pathname.startsWith('/admin')) {
    if (userRole === 'salesman') {
      // Block Salesman from accessing ANY admin route
      return NextResponse.redirect(new URL('/pos', request.url));
    }
  }

  // 4. Attach Strict Zero-Cache Headers to All Served Responses
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*'
  ],
};

