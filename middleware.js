import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { getUserFromSheet } from "../utils/googleSheets";

export async function middleware(req) {
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Redirecionar para página de login se não houver token
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Verificar se o perfil do usuário está atualizado
  const userFromSheet = await getUserFromSheet(token.email);
  if (userFromSheet && userFromSheet[3] !== token.role) {
    token.role = userFromSheet[3];
  }

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev'];
  const supportRoles = ['support+', 'super'];

  // Função auxiliar para verificar se o papel é permitido
  const hasAccess = (role, allowedRoles) => allowedRoles.includes(role);

  // Se o usuário tentar acessar '/profile-analyst', e já tiver o papel correto, não redirecionar novamente
  if (req.nextUrl.pathname.startsWith('/profile-analyst') && analystRoles.includes(token.role)) {
    return NextResponse.next();
  }

  // Verificação de acesso para cada rota específica
  if (req.nextUrl.pathname.startsWith('/dashboard-analyst') && !hasAccess(token.role, allowedRoles)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-super') && token.role !== 'super') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/registro') && !hasAccess(token.role, allowedRoles)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/profile-analyst') && !hasAccess(token.role, allowedRoles)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/manager') && !hasAccess(token.role, allowedRoles)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/admin-notifications') && token.role !== 'dev') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/remote') && !hasAccess(token.role, supportRoles)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Criar a resposta, adicionar os detalhes do usuário como cookies temporários
  const response = NextResponse.next();
  response.cookies.set('user-id', token.id, { httpOnly: true, secure: true, sameSite: 'Strict' });
  response.cookies.set('user-name', token.name, { httpOnly: true, secure: true, sameSite: 'Strict' });
  response.cookies.set('user-role', token.role, { httpOnly: true, secure: true, sameSite: 'Strict' });

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
