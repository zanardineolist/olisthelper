import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
      const authorizedDomains = process.env.AUTHORIZED_DOMAINS?.split(",") || [];
      if (!authorizedDomains.includes(user.email.split("@")[1])) {
        return false;
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});
