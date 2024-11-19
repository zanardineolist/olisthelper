// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserFromSheet, addUserToSheetIfNotExists } from '../../../utils/googleSheets';

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
        // Centralizar a verificação e adição do usuário ao Google Sheets
        const userDetails = await getOrCreateUser(user);
        if (!userDetails) {
          console.error("Usuário não autorizado ou erro durante criação:", user.email);
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
        session.role = token.role; // Papel do usuário: 'user', 'analyst', 'tax', 'super', 'support+'
      }
      return session;
    },
    async jwt({ token, user }) {
      // Atribuir ID e papel do usuário ao token
      if (user) {
        try {
          const userDetails = await getOrCreateUser(user);
          if (userDetails) {
            token.id = userDetails[0]; // ID único do usuário
            token.role = userDetails[3]; // Papel do usuário: 'user', 'analyst', 'tax', 'super', 'support+'
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
    error: '/auth/error', // Página de erro personalizada para melhor feedback ao usuário
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
});

/**
 * Função auxiliar para obter ou criar usuário no Google Sheets.
 * Centraliza a lógica de verificação e criação de um novo usuário, evitando duplicação.
 * @param {Object} user - Objeto do usuário fornecido pelo Google.
 * @returns {Promise<Array|null>} - Detalhes do usuário ou null em caso de falha.
 */
async function getOrCreateUser(user) {
  try {
    // Verificar se o usuário já existe no Google Sheets
    let userDetails = await getUserFromSheet(user.email);
    if (userDetails) {
      return userDetails; // Retornar detalhes se o usuário já existir
    }
    
    // Adicionar um novo usuário se não encontrado
    userDetails = await addUserToSheetIfNotExists(user);
    return userDetails;
  } catch (error) {
    console.error("Erro ao obter ou criar usuário:", error);
    return null;
  }
}