import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  // Criar uma nova resposta com os headers do usuário
  const response = NextResponse.next();
  response.headers.set('x-user-id', token.sub);
  response.headers.set('x-user-name', token.name);
  response.headers.set('x-user-role', token.role);

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super'];

  // Se o usuário tentar acessar '/profile-analyst', e já tiver o papel correto, não redirecionar novamente
  if (req.nextUrl.pathname.startsWith('/profile-analyst') && analystRoles.includes(token.role)) {
    return response;
  }

  // Redirecionar caso o papel do usuário não tenha acesso à rota específica
  if (req.nextUrl.pathname.startsWith('/dashboard-analyst') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-super') && token.role !== 'super') {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/registro') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/profile-analyst') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/manager') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

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
    '/manager'
  ],
};
