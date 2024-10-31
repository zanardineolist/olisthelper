// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserFromSheet, addUserToSheetIfNotExists } from '../../../utils/googleSheets';
import { JWT } from 'next-auth/jwt';

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
        // Verifica se o usuário está autorizado ou cria um novo
        const userDetails = await addUserToSheetIfNotExists(user);
        if (!userDetails) {
          console.log("Usuário não autorizado:", user.email);
          return false; // Rejeitar o login se o usuário não puder ser criado
        }
        console.log("Usuário autorizado:", userDetails);
        return true; // Permitir o login
      } catch (error) {
        console.error("Erro durante a verificação do login:", error);
        return false;
      }
    },
    async session({ session, token }) {
      // Adicionar ID e papel do usuário à sessão
      if (token) {
        session.id = token.id;
        session.role = token.role; // Papel do usuário: 'user', 'analyst', ou 'super'
      }
      return session;
    },
    async jwt({ token, user }) {
      // Atribuir ID e papel do usuário ao token
      if (user) {
        try {
          let userDetails = await getUserFromSheet(user.email);
          if (userDetails) {
            token.id = userDetails[0];
            token.role = userDetails[3]; // Papel do usuário: 'user', 'analyst', ou 'super'
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
