import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '../../../utils/supabase';

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
        // Verificar domínios permitidos
        const allowedDomains = ['tiny.com.br', 'olist.com'];
        const userDomain = user.email.split('@')[1];
        
        if (!allowedDomains.includes(userDomain)) {
          return false;
        }

        // Verificar/criar usuário no Supabase
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          console.error("Erro ao verificar usuário:", selectError);
          return false;
        }

        if (!existingUser) {
          // Criar novo usuário com perfil padrão 'support'
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              email: user.email,
              name: user.name,
              role: 'support',
              image: user.image,
              active: true
            }]);

          if (insertError) {
            console.error("Erro ao criar usuário:", insertError);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Erro durante o processo de sign in:", error);
        return false;
      }
    },
    async session({ session }) {
      if (session?.user?.email) {
        try {
          // Buscar dados do usuário no Supabase
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (error) throw error;

          if (userData) {
            session.user = {
              ...session.user,
              id: userData.id,
              role: userData.role,
              active: userData.active
            };
          }
        } catch (error) {
          console.error("Erro ao buscar dados da sessão:", error);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          // Buscar dados do usuário no Supabase quando o token é criado
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (error) throw error;

          if (userData) {
            token.id = userData.id;
            token.role = userData.role;
            token.active = userData.active;
          }
        } catch (error) {
          console.error("Erro ao buscar dados para o token:", error);
        }
      }
      return token;
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  }
});