import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { addUserToSheet, getUserFromSheet } from '../../../utils/googleSheets';

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
        const authorizedDomains = process.env.AUTHORIZED_DOMAINS?.split(",") || [];
        const cleanAuthorizedDomains = authorizedDomains.map(domain => domain.trim().toLowerCase().replace(/^@/, ''));
        const userDomain = user.email.split("@")[1].toLowerCase();

        // Verificar se o domínio do usuário é autorizado
        if (cleanAuthorizedDomains.length > 0 && !cleanAuthorizedDomains.includes(userDomain)) {
          console.log('Usuário não autorizado - domínio não permitido:', userDomain);
          return false;
        }

        // Verificar se o usuário já está registrado na planilha
        let userDetails = await getUserFromSheet(user.email);

        if (!userDetails) {
          console.log('Usuário não encontrado na planilha. Registrando novo usuário:', user.email);
          // Registrar usuário automaticamente na planilha
          await addUserToSheet({ name: user.name, email: user.email });
        }

        return true;
      } catch (error) {
        console.error('Erro durante o login:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token) {
        session.id = token.id; // ID de 4 dígitos da planilha
        session.role = token.role; // Papel do usuário (analyst ou user)
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // Obter detalhes do usuário da planilha
        let userDetails = await getUserFromSheet(user.email);

        if (userDetails) {
          token.id = userDetails[0]; // Armazena o ID de 4 dígitos da planilha
          token.role = userDetails[3]; // Armazena o papel do usuário (e.g., 'user')
        }
      }
      return token;
    },
  },
});
