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
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
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
        console.log('[AUTH] Iniciando processo de login para:', user.email);
        
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
          console.log(`[AUTH] Login bem-sucedido para usuário existente:`, {
            email: user.email,
            role: existingUser.role,
            user_code: existingUser.user_code
          });
          return true;
        }

        // 4. Se não existe, criar novo (apenas para domínios permitidos)
        const userCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        const { data: newUser, error: insertError } = await supabaseAdmin
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
          }])
          .select()
          .single();

        if (insertError) {
          console.error('[AUTH] Erro ao criar usuário:', insertError);
          return false;
        }

        console.log(`[AUTH] Novo usuário criado com sucesso:`, newUser);
        return true;

      } catch (error) {
        console.error('[AUTH] Erro no processo de login:', error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      try {
        console.log('[AUTH] Gerando JWT para:', token?.email || user?.email);
        
        // Atualizar o token com dados do usuário
        if (trigger === 'signIn' || !token.user_code) {
          const dbUser = await getExistingUser(token.email || user.email);
          if (dbUser) {
            console.log('[AUTH] Dados do usuário recuperados para JWT:', dbUser);
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.user_code = dbUser.user_code;
            token.squad = dbUser.squad;
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
        console.log('[AUTH] Construindo sessão com token:', token);

        if (session?.user) {
          // Adicionar todos os dados necessários à sessão
          session.id = token.id;
          session.role = token.role;
          session.user.role = token.role;
          session.user_code = token.user_code;
          session.user.user_code = token.user_code;
          session.user.squad = token.squad;

          console.log('[AUTH] Sessão construída:', session);
        }

        return session;
      } catch (error) {
        console.error('[AUTH] Erro ao criar sessão:', error);
        return session;
      }
    }
  },
  events: {
    async signIn(message) {
      console.log(`[AUTH] Evento de login:`, message);
    },
    async signOut(message) {
      console.log(`[AUTH] Evento de logout:`, message);
    },
    async error(message) {
      console.error(`[AUTH] Evento de erro:`, message);
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error'
  },
});