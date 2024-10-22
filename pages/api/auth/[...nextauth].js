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
      
      // Logando o domínio do usuário e os domínios permitidos para depuração
      console.log("Domínio do usuário:", user.email.split("@")[1]);
      console.log("Domínios permitidos:", authorizedDomains);

      if (authorizedDomains.length > 0) {
        if (!authorizedDomains.includes(user.email.split("@")[1])) {
          console.log("Usuário não autorizado devido ao domínio.");
          return false; // Bloqueia caso o domínio não esteja na lista permitida
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.id = token.id; // Corrigido para evitar atribuição de `undefined`
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