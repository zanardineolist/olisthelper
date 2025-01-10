import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Inicialização do cliente Supabase com service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Note a mudança aqui
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
          console.log('Domínio não permitido:', userDomain);
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
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
              user_id: Math.floor(1000 + Math.random() * 9000).toString(), // Gera ID numérico
              email: user.email,
              name: user.name,
              role: 'support',
              chamado: false,
              telefone: false,
              chat: false
            }])
            .select()
            .single();

          if (insertError) {
            console.error("Erro ao criar usuário:", insertError);
            return false;
          }

          console.log('Novo usuário criado:', newUser);
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
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            throw error;
          }

          if (userData) {
            session.user = {
              ...session.user,
              id: userData.user_id,  // Usando user_id em vez de id
              role: userData.role
            };
          }
        } catch (error) {
          console.error("Erro ao buscar dados da sessão:", error);
          return session;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (error) {
            console.error("Erro ao buscar dados para o token:", error);
            throw error;
          }

          if (userData) {
            token.id = userData.user_id;  // Usando user_id em vez de id
            token.role = userData.role;
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
  },
  debug: process.env.NODE_ENV === 'development',
});