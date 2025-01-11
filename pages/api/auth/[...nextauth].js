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
        const isAllowedDomain = allowedDomains.some(domain => user.email.endsWith(domain));

        if (!isAllowedDomain) {
          console.warn(`[AUTH] Domínio não autorizado: ${user.email}`);
          return false;
        }

        // 2. Buscar usuário existente
        const { data: existingUser, error: searchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        // Se houver um erro na busca (que não seja de registro não encontrado)
        if (searchError && searchError.code !== 'PGRST116') {
          console.error(`[AUTH] Erro ao buscar usuário: ${searchError.message}`);
          return false;
        }

        // 3. Se o usuário existe, permitir o login
        if (existingUser) {
          console.log(`[AUTH] Usuário existente autenticado: ${user.email}`);
          return true;
        }

        // 4. Se não existe e o domínio é permitido, criar novo usuário
        console.log(`[AUTH] Criando novo usuário: ${user.email}`);
        const newUserCode = await generateUniqueUserCode();
        
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
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
          });

        if (insertError) {
          console.error(`[AUTH] Erro ao criar usuário: ${insertError.message}`);
          return false;
        }

        console.log(`[AUTH] Novo usuário criado com sucesso: ${user.email}`);
        return true;

      } catch (error) {
        console.error(`[AUTH] Erro no processo de autenticação: ${error.message}`);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (!error && userData) {
            token.id = userData.id;
            token.role = userData.role;
            token.user_code = userData.user_code;
          }
        } catch (error) {
          console.error(`[AUTH] Erro ao gerar JWT: ${error.message}`);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (!error && userData) {
            session.id = userData.id;
            session.role = userData.role;
            session.user_code = userData.user_code;
          }
        } catch (error) {
          console.error(`[AUTH] Erro ao criar sessão: ${error.message}`);
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  }
});

async function generateUniqueUserCode() {
  try {
    const { data: usedCodes, error } = await supabase
      .from('users')
      .select('user_code');

    if (error) {
      console.error(`[AUTH] Erro ao buscar códigos: ${error.message}`);
      return Math.floor(1000 + Math.random() * 9000).toString();
    }

    let newCode;
    do {
      newCode = Math.floor(1000 + Math.random() * 9000).toString();
    } while (usedCodes.some(user => user.user_code === newCode));

    return newCode;
  } catch (error) {
    console.error(`[AUTH] Erro ao gerar código: ${error.message}`);
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}