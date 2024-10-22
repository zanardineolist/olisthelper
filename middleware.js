import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Rotas protegidas: /registrar, /my e /dashboard-analyst
  const protectedPaths = ['/registrar', '/my', '/dashboard-analyst'];
  const pathIsProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (pathIsProtected && (!token || token.role !== 'analyst')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/registrar', '/my', '/dashboard-analyst'],
};
