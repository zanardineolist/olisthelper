// middleware.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  console.log("Token recebido no middleware:", token);

  if (req.nextUrl.pathname === '/profile' && !token) {
    console.log("Permissão concedida para /profile sem token para evitar redirecionamento em loop.");
    return NextResponse.next();
  }

  if (!token) {
    console.log("Redirecionando - Token não encontrado.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-analyst') && token.role !== 'analyst') {
    console.log("Redirecionando - Usuário não tem permissão para acessar o dashboard do analista.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-super') && token.role !== 'super') {
    console.log("Redirecionando - Usuário não tem permissão para acessar o dashboard do supervisor.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/registro') && token.role !== 'analyst') {
    console.log("Redirecionando - Página de registro exclusiva para analistas.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/registrar') && token.role !== 'support') {
    console.log("Redirecionando - Página de registrar exclusiva para usuários.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/profile-analyst') && token.role !== 'analyst') {
    console.log("Redirecionando - Página de perfil do analista exclusiva para analistas.");
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/registrar', '/registro', '/profile', '/dashboard-analyst', '/dashboard-super', '/profile-analyst'],
};
