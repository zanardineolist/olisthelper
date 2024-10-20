import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { addUserToSheet } from '../../../utils/googleSheets';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const allowedDomains = process.env.AUTHORIZED_DOMAINS.split(',');
      const emailDomain = user.email.split('@')[1];

      // Verifica se o domínio do e-mail é permitido
      if (!allowedDomains.includes(`@${emailDomain}`)) {
        return false;
      }

      // Adiciona usuário à planilha do Google Sheets
      await addUserToSheet(user);
      return true;
    },
    async session({ session, token }) {
      session.id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
