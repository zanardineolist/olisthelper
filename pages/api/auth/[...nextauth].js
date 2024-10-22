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

      // Remover "@" dos domínios permitidos, caso haja algum
      const cleanAuthorizedDomains = authorizedDomains.map(domain => domain.trim().replace(/^@/, ''));

      // Extrair o domínio do email do usuário
      const userDomain = user.email.split("@")[1];

      // Log para depuração
      console.log("Domínio do usuário:", userDomain);
      console.log("Domínios permitidos:", cleanAuthorizedDomains);

      // Verificar se o domínio do usuário está na lista de domínios autorizados
      if (cleanAuthorizedDomains.length > 0 && !cleanAuthorizedDomains.includes(userDomain)) {
        console.log("Usuário não autorizado devido ao domínio.");
        return false; // Bloqueia caso o domínio não esteja na lista permitida
      }

      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.id = token.id;
        session.role = token.role; // Adiciona o papel à sessão
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Definir o papel do usuário (supondo uma lógica para definir o papel)
        const analystEmails = process.env.ANALYST_EMAILS?.split(",") || [];
        token.role = analystEmails.includes(user.email) ? "analyst" : "user";
      }
      return token;
    },
  },
});
