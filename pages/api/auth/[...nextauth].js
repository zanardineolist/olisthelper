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
        // Verificar domínios permitidos
        const allowedDomains = ['@olist.com', '@tiny.com.br'];
        const isAllowedDomain = allowedDomains.some(domain => user.email.endsWith(domain));

        if (!isAllowedDomain) {
          console.warn("Domínio não autorizado:", user.email);
          return false;
        }

        // Buscar usuário existente
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Erro ao buscar usuário:", fetchError);
          return false;
        }

        // Se o usuário já existe, retornar true
        if (existingUser) {
          console.log("Usuário existente encontrado:", existingUser.email);
          return true;
        }

        // Se não existe, criar novo usuário
        const newUserCode = await generateUniqueUserCode();
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
            remote: false
          }]);

        if (insertError) {
          console.error("Erro ao criar usuário:", insertError);
          return false;
        }

        console.log("Novo usuário criado com sucesso:", user.email);
        return true;
      } catch (error) {
        console.error("Erro durante o processo de sign in:", error);
        return false;
      }
    },

    async session({ session, token }) {
      if (token) {
        try {
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (!error && user) {
            session.id = user.id;
            session.role = user.role;
            session.user_code = user.user_code;
          }
        } catch (error) {
          console.error("Erro ao buscar dados da sessão:", error);
        }
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
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
          console.error("Erro ao buscar dados para JWT:", error);
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

async function generateUniqueUserCode() {
  try {
    const { data: usedCodes, error } = await supabase
      .from('users')
      .select('user_code');

    if (error) {
      console.error("Erro ao buscar códigos existentes:", error);
      return Math.floor(1000 + Math.random() * 9000).toString();
    }

    let newCode;
    do {
      newCode = Math.floor(1000 + Math.random() * 9000).toString();
    } while (usedCodes.some(user => user.user_code === newCode));

    return newCode;
  } catch (error) {
    console.error("Erro ao gerar código único:", error);
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}