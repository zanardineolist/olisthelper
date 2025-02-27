// middleware.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { getUserPermissions } from './utils/supabase/supabaseClient';

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Buscar permissões atualizadas do usuário no Supabase
  const permissions = await getUserPermissions(token.id);
  if (!permissions) {
    console.error('Erro ao buscar permissões do usuário:', token.id);
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Mapear papéis e rotas permitidas
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev', 'support+'];

  const routesWithAllowedRoles = {
    '/profile-analyst': analystRoles,
    '/dashboard-analyst': allowedRoles,
    '/dashboard-super': ['super'],
    '/registro': allowedRoles,
    '/manager': allowedRoles,
    '/admin-notifications': ['dev'],
    '/remote': ['support+', 'super'],
    '/tools': ['support', 'support+', 'analyst', 'super']
  };

  // Verificar acesso à rota atual
  const matchedRoute = Object.keys(routesWithAllowedRoles).find(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (matchedRoute && !routesWithAllowedRoles[matchedRoute].includes(permissions.profile)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Criar resposta com cookies atualizados
  const response = NextResponse.next();
  
  // Definir cookies com informações do usuário e suas permissões
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-name', token.name);
  response.cookies.set('user-role', permissions.profile);
  response.cookies.set('user-permissions', JSON.stringify({
    can_ticket: permissions.can_ticket,
    can_phone: permissions.can_phone,
    can_chat: permissions.can_chat
  }));

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
  ],
};