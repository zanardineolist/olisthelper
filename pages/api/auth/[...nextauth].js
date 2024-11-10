// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { addUserToSheetIfNotExists } from '../../../utils/batchSheetUtils';
import { cache, CACHE_TIMES } from '../../../utils/cache';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      try {
        // Verifica se o usuário já está no cache
        const cacheKey = `user_${user.email.toLowerCase()}`;
        const cachedUser = cache.get(cacheKey);

        if (cachedUser) {
          return true; // Se o usuário já está no cache, permitir o login
        }

        // Caso contrário, tentar adicionar ou obter o usuário da planilha
        const addedUser = await addUserToSheetIfNotExists({
          email: user.email,
          name: user.name,
        });

        // Cachear usuário para futuras referências
        if (addedUser) {
          cache.set(cacheKey, addedUser, CACHE_TIMES.USERS);
          return true;
        } else {
          return false; // Se houver um problema ao adicionar o usuário
        }
      } catch (error) {
        console.error("Erro durante a verificação do login:", error);
        return false;
      }
    },
    async session({ session, token }) {
      // Adicionar ID e papel do usuário à sessão
      if (token) {
        session.id = token.id;
        session.role = token.role; // Papel do usuário: 'support', 'analyst', 'super', etc.
      }
      return session;
    },
    async jwt({ token, user }) {
      // Atribuir ID e papel do usuário ao token
      if (user) {
        try {
          const cacheKey = `user_${user.email.toLowerCase()}`;
          let cachedUser = cache.get(cacheKey);

          // Se o usuário não estiver no cache, buscar da planilha
          if (!cachedUser) {
            cachedUser = await addUserToSheetIfNotExists({
              email: user.email,
              name: user.name,
            });

            if (cachedUser) {
              cache.set(cacheKey, cachedUser, CACHE_TIMES.USERS);
            }
          }

          // Atribuir valores ao token
          if (cachedUser) {
            token.id = cachedUser[0]; // ID do usuário
            token.role = cachedUser[3]; // Papel do usuário
          }
        } catch (error) {
          console.error("Erro ao obter detalhes do usuário:", error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
});
