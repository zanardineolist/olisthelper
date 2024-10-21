import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
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
    async signIn({ user, account, profile }) {
      const allowedDomains = process.env.AUTHORIZED_DOMAINS.split(',');
      const emailDomain = user.email.split('@')[1];

      if (!allowedDomains.includes(`@${emailDomain}`)) {
        return false;
      }

      // Verifique se o usuário já existe na planilha
      const existingUser = await getUserFromSheet(user.email);
      if (!existingUser) {
        await addUserToSheet(user);
      }
      return true;
    },
    async session({ session, token }) {
      session.id = token.id;
      return session;
    },
  },
});
