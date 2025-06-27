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

  // Mapear papéis e rotas permitidas (SISTEMA MODULAR)
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev', 'quality'];

  const routesWithPermissions = {
    // Rotas baseadas em perfil (sistema legado mantido)
    '/profile-analyst': { profiles: analystRoles },
    '/dashboard-analyst': { profiles: allowedRoles },
    '/dashboard-super': { profiles: ['super'] },
    '/dashboard-quality': { profiles: ['quality'] },
    '/registro': { profiles: allowedRoles },
    '/manager': { profiles: allowedRoles },
    '/admin-notifications': { profiles: ['dev'] },
    '/tools': { profiles: ['support', 'analyst', 'super', 'tax', 'quality'] },
    
    // Rotas baseadas em permissões específicas (NOVO SISTEMA MODULAR)
    '/analytics': { permission: 'admin' },
    '/register-help': { permission: 'can_register_help' },
    '/remote': { permission: 'can_remote_access' }
  };

  // Verificar acesso à rota atual
  const matchedRoute = Object.keys(routesWithPermissions).find(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (matchedRoute) {
    const routeConfig = routesWithPermissions[matchedRoute];
    
    // NOVA LÓGICA: Verificar se é rota baseada em permissão específica
    if (routeConfig.permission) {
      if (!permissions[routeConfig.permission]) {
        console.log(`Acesso negado para ${req.nextUrl.pathname}: usuário não possui permissão ${routeConfig.permission}`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    } 
    // SISTEMA LEGADO: Verificar roles tradicionais
    else if (routeConfig.profiles && !routeConfig.profiles.includes(permissions.profile)) {
      console.log(`Acesso negado para ${req.nextUrl.pathname}: perfil ${permissions.profile} não autorizado`);
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Criar resposta com cookies atualizados (INCLUINDO NOVAS PERMISSÕES)
  const response = NextResponse.next();
  
  // Definir cookies com informações do usuário e suas permissões
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-name', token.name);
  response.cookies.set('user-role', permissions.profile);
  response.cookies.set('user-admin', permissions.admin ? 'true' : 'false');
  response.cookies.set('user-permissions', JSON.stringify({
    can_ticket: permissions.can_ticket,
    can_phone: permissions.can_phone,
    can_chat: permissions.can_chat,
    can_register_help: permissions.can_register_help, // NOVO
    can_remote_access: permissions.can_remote_access, // NOVO
    admin: permissions.admin
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
    '/dashboard-quality',
    '/profile-analyst',
    '/manager',
    '/api/manage-category',
    '/admin-notifications',
    '/remote',
    '/tools',
    '/analytics',
    '/register-help', // NOVA ROTA
  ],
};