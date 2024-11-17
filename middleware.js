import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  // Declarar `analystRoles` antes do uso
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev'];

  // Buscar as permissões do usuário a partir da API (dados do Google Sheets)
  const response = await fetch(`${req.nextUrl.origin}/api/get-users?id=${token.id}`);
  const userData = await response.json();

  // Adicionar permissões do Google Sheets ao token
  token.permissions = {
    manageUsers: userData.manageUsers === 'TRUE',
    manageCategories: userData.manageCategories === 'TRUE',
    manageRecords: userData.manageRecords === 'TRUE',
  };

  console.log('Permissões do Usuário:', token.permissions);

  // Se o usuário tentar acessar '/profile-analyst', e já tiver o papel correto, não redirecionar novamente
  if (req.nextUrl.pathname.startsWith('/profile-analyst') && analystRoles.includes(token.role)) {
    return NextResponse.next();
  }

  // Redirecionar caso o papel do usuário não tenha acesso à rota específica
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

  // Verificar se o acesso à rota "manager" está autorizado
  if (req.nextUrl.pathname.startsWith('/manager')) {
    const { manageUsers, manageCategories, manageRecords } = token.permissions;

    // Verificar se há pelo menos uma permissão para acessar a página "manager"
    if (!(manageUsers || manageCategories || manageRecords)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (req.nextUrl.pathname.startsWith('/admin-notifications') && token.role !== 'dev') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Criar a resposta, adicionar os detalhes do usuário como cookies temporários
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