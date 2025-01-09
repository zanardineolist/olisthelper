import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id) {
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

  // Criar a resposta e definir cookies com opções de segurança
  const response = NextResponse.next();
  
  const cookieOptions = {
    maxAge: 60 * 60 * 24, // 24 horas
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };

  // Definir cookies com os dados do usuário
  response.cookies.set('user-id', token.id, cookieOptions);
  response.cookies.set('user-email', token.email, cookieOptions);
  response.cookies.set('user-name', token.name, cookieOptions);
  response.cookies.set('user-role', token.role, cookieOptions);

  // Adicionar headers para o Supabase
  response.headers.set('x-user-id', token.id);
  response.headers.set('x-user-role', token.role);

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
    '/api/messages/:path*'
  ],
};