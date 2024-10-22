import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Páginas que requerem autenticação
  const protectedRoutes = ['/registrar', '/my'];

  // Se o usuário não estiver autenticado e tentar acessar uma página protegida, redirecionar para login
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Se estiver autenticado, permite o acesso
  return NextResponse.next();
}

export const config = {
  matcher: ['/registrar', '/my'], // Define as rotas que serão protegidas pelo middleware
};