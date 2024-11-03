import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  // Ajustar os papéis permitidos
  const analystRoles = ['analyst', 'tax'];
  const allowedRoles = [...analystRoles, 'super'];

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

  if (req.nextUrl.pathname.startsWith('/manager') && !allowedRoles.includes(token.role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Adicionar informações do token aos cabeçalhos da requisição para uso posterior nos handlers
  req.headers.set('x-user-id', token.id);
  req.headers.set('x-user-name', token.name);
  req.headers.set('x-user-role', token.role);

  return NextResponse.next();
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
    '/api/manage-category', // Incluindo a rota do handler manage-category.js
  ],
};
