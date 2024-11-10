// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getSheetValues, addSheetRow } from '../../../utils/batchSheetUtils';

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
        let usersRows = await getSheetValues('Usuários', 'A:H');
        
        if (!usersRows || usersRows.length === 0) {
          return false; // Se não há planilhas de usuários configuradas, rejeitar o login
        }

        // Verificar se o usuário já existe
        const existingUser = usersRows.find(row => row[2]?.toLowerCase() === user.email.toLowerCase());

        if (!existingUser) {
          // Se o usuário não existir, adicionar uma nova linha
          const newUser = [
            Math.floor(1000 + Math.random() * 9000).toString(), // Gerar ID único
            user.name,
            user.email,
            'support', // Papel padrão para novos usuários
            '', // Squad vazio por padrão
            'FALSE', // Chamado
            'FALSE', // Telefone
            'FALSE', // Chat
          ];
          
          await addSheetRow('Usuários', newUser);
        }

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
        session.role = token.role; // Papel do usuário: 'support', 'analyst', 'super', etc.
      }
      return session;
    },
    async jwt({ token, user }) {
      // Atribuir ID e papel do usuário ao token
      if (user) {
        try {
          let usersRows = await getSheetValues('Usuários', 'A:H');
          if (usersRows) {
            const userDetails = usersRows.find(row => row[2]?.toLowerCase() === user.email.toLowerCase());
            if (userDetails) {
              token.id = userDetails[0]; // Garantir que o ID seja único e consistente
              token.role = userDetails[3]; // Papel do usuário: 'support', 'analyst', ou 'super'
            }
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
