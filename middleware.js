import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { getAuthenticatedGoogleSheets, getSheetValues } from "../utils/googleSheets";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super', 'dev'];

  // Log do token recebido para depuração
  console.log("Token recebido no middleware:", token);

  // Controle de acesso para a rota "/remote"
  if (req.nextUrl.pathname.startsWith('/remote')) {
    try {
      // Obter a permissão de acesso ao Google Sheets diretamente
      const sheets = await getAuthenticatedGoogleSheets();
      const rows = await getSheetValues('Usuários', 'A2:I');

      if (rows && rows.length > 0) {
        const userRow = rows.find(row => row[2] === token.email);
        const remoteAccess = userRow && userRow[8]?.toLowerCase() === 'TRUE';

        // Verificar se o usuário possui acesso remoto ou é superusuário
        if (!(token.role === 'super' || remoteAccess)) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      } else {
        return NextResponse.redirect(new URL('/profile', req.url));
      }
    } catch (error) {
      console.error('Erro ao obter permissões do Google Sheets:', error);
      return NextResponse.redirect(new URL('/profile', req.url));
    }
  }

  // Controle de acesso para outras rotas
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
  response.cookies.set('user-remote-access', token.remoteAccess);

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
