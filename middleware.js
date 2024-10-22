import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  console.log("Token recebido no middleware:", token);

  if (req.nextUrl.pathname === '/my' && !token) {
    console.log("Permissão concedida para /my sem token para evitar redirecionamento em loop.");
    return NextResponse.next();
  }

  if (!token) {
    console.log("Redirecionando - Token não encontrado.");
    return NextResponse.redirect(new URL('/my', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/dashboard-analyst') && token.role !== 'analyst') {
    console.log("Redirecionando - Usuário não tem permissão para acessar o dashboard do analista.");
    return NextResponse.redirect(new URL('/my', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/registrar', '/my', '/dashboard-analyst'],
};