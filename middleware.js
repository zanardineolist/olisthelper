import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Verificar se o usuário está ativo
  if (!token.active) {
    return NextResponse.redirect(new URL('/auth/inactive', req.url));
  }

  // Definir papéis permitidos por rota
  const routePermissions = {
    '/profile-analyst': ['analyst', 'tax'],
    '/dashboard-analyst': ['analyst', 'tax', 'super'],
    '/dashboard-super': ['super'],
    '/registro': ['analyst', 'tax', 'super'],
    '/manager': ['analyst', 'tax', 'super'],
    '/admin-notifications': ['dev'],
    '/remote': ['support+', 'super'],
    '/tools': ['support', 'analyst', 'tax']
  };

  // Verificar permissões da rota atual
  const route = Object.keys(routePermissions).find(path => 
    req.nextUrl.pathname.startsWith(path)
  );

  if (route && !routePermissions[route].includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Adicionar informações do usuário como cookies temporários
  const response = NextResponse.next();
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-email', token.email);
  response.cookies.set('user-name', token.name);
  response.cookies.set('user-role', token.role);

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
    '/api/manage-user',
    '/admin-notifications',
    '/remote',
    '/tools'
  ],
};