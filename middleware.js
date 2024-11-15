import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev'];

  // Log para depuração do token recebido
  console.log("Token recebido:", token);

  // Garantir que token.remoteAccess seja booleano (caso contrário, false)
  token.remoteAccess = token.remoteAccess === true || token.remoteAccess === 'VERDADEIRO' || token.remoteAccess === 'true';

  // Controle de acesso para a rota "/remote"
  if (req.nextUrl.pathname.startsWith('/remote') && !(token.role === 'super' || token.remoteAccess)) {
    return NextResponse.redirect(new URL('/', req.url));
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

  if (req.nextUrl.pathname.startsWith('/manager') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/admin-notifications') && token.role !== 'dev') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const response = NextResponse.next();
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-name', token.name);
  response.cookies.set('user-role', token.role);
  response.cookies.set('user-remote', token.remoteAccess);

  return response;
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
    '/remote',
    '/api/manage-category',
    '/admin-notifications',
  ],
};
