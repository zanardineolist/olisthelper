import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev', 'support+'];

  // Verificar acesso permitido e evitar redirecionamento indesejado
  const routesWithAllowedRoles = {
    '/profile-analyst': analystRoles,
    '/dashboard-analyst': allowedRoles,
    '/dashboard-super': ['super'],
    '/registro': allowedRoles,
    '/manager': allowedRoles,
    '/admin-notifications': ['dev'],
    '/remote': ['support+', 'super'],
    '/tools': ['support', 'support+', 'analyst', 'tax']
  };

  const matchedRoute = Object.keys(routesWithAllowedRoles).find(route => req.nextUrl.pathname.startsWith(route));
  if (matchedRoute && !routesWithAllowedRoles[matchedRoute].includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Criar a resposta, adicionar os detalhes do usuário como cookies temporários
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
    '/api/manage-category',
    '/admin-notifications',
    '/remote',
    '/tools',
    '/registrar',
  ],
};
