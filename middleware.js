import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  console.log("Token recebido no middleware:", token);

  // Verificar se o token existe e se o papel do usuário é "analyst"
  if (req.nextUrl.pathname.startsWith('/dashboard-analyst')) {
    if (!token || token.role !== 'analyst') {
      console.log("Redirecionando porque o usuário não tem permissão para acessar o dashboard do analista.");
      return NextResponse.redirect(new URL('/my', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/registrar', '/my', '/dashboard-analyst'],
};
