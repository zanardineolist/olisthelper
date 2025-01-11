import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Supabase Client para leitura
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Supabase Admin Client para operações privilegiadas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkExistingUser(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Usuário não encontrado
      }
      throw error; // Outros erros
    }
    
    return data; // Usuário encontrado
  } catch (error) {
    console.error('[AUTH] Erro ao verificar usuário existente:', error);
    throw error;
  }
}

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
        // 1. Verificar domínios permitidos
        const allowedDomains = ['@olist.com', '@tiny.com.br'];
        if (!allowedDomains.some(domain => user.email.endsWith(domain))) {
          console.warn(`[AUTH] Domínio não autorizado: ${user.email}`);
          return false;
        }

        // 2. Verificar se o usuário já existe
        const existingUser = await checkExistingUser(user.email);
        
        if (existingUser) {
          console.log(`[AUTH] Usuário encontrado: ${user.email}`);
          return true;
        }

        // 3. Se não existe, criar novo usuário
        console.log(`[AUTH] Criando novo usuário: ${user.email}`);
        const newUserCode = Math.floor(1000 + Math.random() * 9000).toString();

        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert([{
            name: user.name,
            email: user.email,
            role: 'support',
            user_code: newUserCode,
            squad: 'Squad',
            chamado: false,
            telefone: false,
            chat: false,
            remote: false,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error(`[AUTH] Erro ao criar usuário:`, insertError);
          return false;
        }

        return true;
      } catch (error) {
        console.error(`[AUTH] Erro no processo de autenticação:`, error);
        return false;
      }
    },

    async jwt({ token, user }) {
      try {
        if (user) {
          const existingUser = await checkExistingUser(user.email);
          if (existingUser) {
            token.id = existingUser.id;
            token.role = existingUser.role;
            token.user_code = existingUser.user_code;
          }
        }
      } catch (error) {
        console.error('[AUTH] Erro ao gerar JWT:', error);
      }
      return token;
    },

    async session({ session, token }) {
      try {
        if (session?.user?.email) {
          const existingUser = await checkExistingUser(session.user.email);
          if (existingUser) {
            session.id = existingUser.id;
            session.role = existingUser.role;
            session.user_code = existingUser.user_code;
          }
        }
      } catch (error) {
        console.error('[AUTH] Erro ao criar sessão:', error);
      }
      return session;
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error'
  },
});