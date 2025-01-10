// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        const { email } = user;
        
        // Verificar se é um email válido (olist.com ou tiny.com.br)
        if (!email.endsWith('@olist.com') && !email.endsWith('@tiny.com.br')) {
          return false;
        }

        // Buscar ou criar usuário no Supabase
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar usuário:', error);
          return false;
        }

        if (!userData) {
          // Se usuário não existe, criar com role padrão
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              user_id: Math.floor(1000 + Math.random() * 9000).toString(),
              name: user.name,
              email: user.email,
              role: 'support',
              squad: null,
              chamado: false,
              telefone: false,
              chat: false
            }]);

          if (insertError) {
            console.error('Erro ao criar usuário:', insertError);
            return false;
          }
        }

        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        // Buscar dados do usuário no Supabase
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (!error && userData) {
          token.id = userData.user_id;
          token.role = userData.role;
          token.squad = userData.squad;
          token.chamado = userData.chamado;
          token.telefone = userData.telefone;
          token.chat = userData.chat;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.squad = token.squad;
        session.user.chamado = token.chamado;
        session.user.telefone = token.telefone;
        session.user.chat = token.chat;
      }
      return session;
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
});