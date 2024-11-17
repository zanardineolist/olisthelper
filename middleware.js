import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev'];

  if (req.nextUrl.pathname.startsWith('/profile-analyst') && analystRoles.includes(token.role)) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-analyst') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-super') && token.role !== 'super') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/registro') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/profile-analyst') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/manager')) {
    const permissions = token.permissions || {};

    if (!(permissions.manageUsers || permissions.manageCategories || permissions.manageRecords)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (req.nextUrl.pathname.startsWith('/admin-notifications') && token.role !== 'dev') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const nextResponse = NextResponse.next();
  nextResponse.cookies.set('user-id', token.id);
  nextResponse.cookies.set('user-name', token.name);
  nextResponse.cookies.set('user-role', token.role);
  nextResponse.cookies.set('permissions', JSON.stringify(token.permissions));

  return nextResponse;
}

export const config = {
  matcher: [
    '/registrar',
    '/registro',
    '/profile',
    '/dashboard-analyst',
    '/dashboard-super',
    '/profile-analyst',
    '/manager',
    '/api/manage-category',
    '/admin-notifications',
  ],
};
