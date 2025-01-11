import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Supabase Client para leitura com anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Supabase Admin Client com service role key
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

/**
 * Função para verificar se o usuário existe no banco
 */
async function getExistingUser(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[AUTH] Erro ao buscar usuário:', error);
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
    async signIn({ user, account }) {
      try {
        // 1. Verificar domínios permitidos
        const allowedDomains = ['@olist.com', '@tiny.com.br'];
        const isAllowedDomain = allowedDomains.some(domain => user.email.endsWith(domain));
        
        if (!isAllowedDomain) {
          console.warn(`[AUTH] Domínio não permitido: ${user.email}`);
          return false;
        }

        // 2. Buscar usuário existente no Supabase
        const existingUser = await getExistingUser(user.email);
        
        // 3. Se o usuário existe, permitir login
        if (existingUser) {
          console.log(`[AUTH] Login bem-sucedido: ${user.email}`);
          return true;
        }

        // 4. Se não existe, criar novo (apenas para domínios permitidos)
        const userCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert([{
            name: user.name,
            email: user.email,
            role: 'support',
            user_code: userCode,
            squad: 'Squad',
            chamado: false,
            telefone: false,
            chat: false,
            remote: false,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('[AUTH] Erro ao criar usuário:', insertError);
          return false;
        }

        console.log(`[AUTH] Novo usuário criado: ${user.email}`);
        return true;

      } catch (error) {
        console.error('[AUTH] Erro no processo de login:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      try {
        // Adicionar dados do usuário ao token apenas no primeiro sign in
        if (account && user) {
          const dbUser = await getExistingUser(user.email);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.user_code = dbUser.user_code;
          }
        }
        return token;
      } catch (error) {
        console.error('[AUTH] Erro ao gerar JWT:', error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (session?.user?.email) {
          // Adicionar dados do usuário à sessão
          session.id = token.id;
          session.role = token.role;
          session.user_code = token.user_code;
        }
        return session;
      } catch (error) {
        console.error('[AUTH] Erro ao criar sessão:', error);
        return session;
      }
    }
  },
  events: {
    async signIn({ user }) {
      console.log(`[AUTH] Evento de login: ${user.email}`);
    },
    async signOut({ session }) {
      console.log(`[AUTH] Evento de logout: ${session?.user?.email}`);
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error'
  },
  debug: process.env.NODE_ENV === 'development'
});