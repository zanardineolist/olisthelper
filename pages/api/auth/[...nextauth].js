import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserFromSheet, addUserToSheetIfNotExists } from '../../../utils/googleSheets';

/**
 * Função auxiliar para validar e processar o usuário
 * @param {Object} user - Dados do usuário do Google
 * @returns {Promise<Array|null>} Detalhes do usuário ou null
 */
async function processUser(user) {
  if (!user?.email) return null;

  // Validar domínio do email
  if (!user.email.endsWith('@tiny.com.br') && !user.email.endsWith('@olist.com')) {
    console.log('Email não autorizado:', user.email);
    return null;
  }

  try {
    // Verificar se usuário existe na planilha
    let userDetails = await getUserFromSheet(user.email);
    
    // Se não existir, tentar criar
    if (!userDetails) {
      console.log('Criando novo usuário na planilha:', user.email);
      userDetails = await addUserToSheetIfNotExists(user);
      
      // Verificar se a criação foi bem sucedida
      if (!userDetails) {
        console.error('Falha ao criar usuário na planilha:', user.email);
        return null;
      }
    }

    return userDetails;
  } catch (error) {
    console.error('Erro ao processar usuário:', error);
    return null;
  }
}

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
        const userDetails = await processUser(user);
        if (!userDetails) {
          return false;
        }

        // Adicionar dados da planilha ao objeto do usuário
        user.sheetId = userDetails[0];    // ID da planilha (ex: 8487)
        user.role = userDetails[3];       // Papel do usuário
        return true;
      } catch (error) {
        console.error("Erro durante signIn:", error);
        return false;
      }
    },

    async jwt({ token, user, account, profile }) {
      // Adicionar dados do usuário ao token durante o primeiro login
      if (user && account) {
        token.id = user.sheetId;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      // Adicionar dados do token à sessão
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      console.log('Usuário logado com sucesso:', user.email);
    },
    async signOut({ token }) {
      console.log('Usuário deslogado:', token?.email);
    },
    async error(error) {
      console.error('Erro de autenticação:', error);
    }
  },

  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  },

  debug: process.env.NODE_ENV === 'development',
});