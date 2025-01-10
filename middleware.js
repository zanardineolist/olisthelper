// middleware.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev', 'support+', 'support', 'partner', 'other'];

  // Verificar acesso permitido
  const routesWithAllowedRoles = {
    '/profile-analyst': analystRoles,
    '/dashboard-analyst': [...analystRoles, 'super'],
    '/dashboard-super': ['super'],
    '/registro': [...analystRoles],
    '/manager': [...analystRoles, 'super'],
    '/admin-notifications': ['dev'],
    '/remote': ['support+', 'super'],
    '/profile': ['support', 'support+']
  };

  const matchedRoute = Object.keys(routesWithAllowedRoles).find(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (matchedRoute && !routesWithAllowedRoles[matchedRoute].includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Adicionar informações do usuário aos cookies
  const response = NextResponse.next();
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-name', token.name);
  response.cookies.set('user-role', token.role);
  response.cookies.set('user-email', token.email);

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
    '/api/manage-category',
    '/admin-notifications',
    '/remote',
  ],
};