// middleware.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { getUserPermissions } from './utils/supabase/supabaseClient';
const rateLimiter = require('./utils/simpleRateLimiter');

export async function middleware(req) {
  // Rate limiting básico
  const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimiter.isAllowed(clientIP)) {
    console.log(`[SECURITY] Rate limit excedido para IP: ${clientIP} - Rota: ${req.nextUrl.pathname}`);
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Buscar permissões atualizadas do usuário no Supabase
  const permissions = await getUserPermissions(token.id);
  if (!permissions) {
    console.error(`[SECURITY] Erro ao buscar permissões do usuário: ${token.id} - Rota: ${req.nextUrl.pathname}`);
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  console.log(`[SECURITY] Permissões carregadas para usuário: ${token.id} - Role: ${permissions.profile}`);



  // Mapear papéis e rotas permitidas (SISTEMA MODULAR)
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev', 'quality'];

  const routesWithPermissions = {
    // Rotas baseadas em perfil (sistema legado mantido)
    '/profile-analyst': { profiles: analystRoles },
    '/dashboard-analyst': { profiles: allowedRoles },
    '/dashboard-super': { profiles: ['super'] },
    '/dashboard-quality': { profiles: ['quality'] },
    '/manager': { profiles: allowedRoles },
    '/admin-notifications': { permission: 'admin' },
    '/tools': { profiles: ['support', 'analyst', 'super', 'tax', 'quality'] },
    
    // Rotas baseadas em permissões específicas (NOVO SISTEMA MODULAR)
  
    '/registrar-ajuda': { permission: 'can_register_help' },
    '/remote': { permission: 'can_remote_access' },
    
    // IMPORTANTE: Rotas com prefixos similares devem vir DEPOIS das mais específicas
    '/registro': { profiles: allowedRoles }
  };

  // Verificar acesso à rota atual - ORDENAR POR ESPECIFICIDADE (mais longo primeiro)
  const sortedRoutes = Object.keys(routesWithPermissions).sort((a, b) => b.length - a.length);
  const matchedRoute = sortedRoutes.find(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (matchedRoute) {
    const routeConfig = routesWithPermissions[matchedRoute];
    
    // NOVA LÓGICA: Verificar se é rota baseada em permissão específica
    if (routeConfig.permission) {
      if (!permissions[routeConfig.permission]) {
        console.log(`[SECURITY] Acesso negado - Usuário: ${token.id} - Permissão necessária: ${routeConfig.permission} - Rota: ${req.nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/', req.url));
      }
      console.log(`[SECURITY] Acesso permitido por permissão - Usuário: ${token.id} - Permissão: ${routeConfig.permission} - Rota: ${req.nextUrl.pathname}`);
    } 
    // SISTEMA LEGADO: Verificar roles tradicionais
    else if (routeConfig.profiles && !routeConfig.profiles.includes(permissions.profile)) {
      console.log(`[SECURITY] Acesso negado - Usuário: ${token.id} - Role atual: ${permissions.profile} - Roles permitidos: ${routeConfig.profiles.join(', ')} - Rota: ${req.nextUrl.pathname}`);
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    console.log(`[SECURITY] Acesso permitido por role - Usuário: ${token.id} - Role: ${permissions.profile} - Rota: ${req.nextUrl.pathname}`);
  }

  // Criar resposta com cookies mínimos necessários
  const response = NextResponse.next();
  
  // Definir apenas cookies essenciais (sem informações sensíveis)
  response.cookies.set('user-id', token.id);
  response.cookies.set('user-name', token.name);
  // NOTA: Permissões são verificadas em tempo real, não armazenadas em cookies

  return response;
}

export const config = {
  matcher: [
    '/registrar',
    '/registro',
    '/registrar-ajuda', // NOVA ROTA
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


  ],
};