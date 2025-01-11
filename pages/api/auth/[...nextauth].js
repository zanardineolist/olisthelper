import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Supabase Client para leitura
import { supabase } from '../../../utils/supabaseClient';

// Supabase Client com Service Role Key para escrita
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
        const allowedDomains = ['@olist.com', '@tiny.com.br'];
        const isAllowedDomain = allowedDomains.some(domain => user.email.endsWith(domain));

        if (!isAllowedDomain) {
          console.error("Domínio não autorizado:", user.email);
          return false;
        }

        const userDetails = await getOrCreateUserInSupabase(user);
        if (!userDetails) {
          console.error("Usuário não autorizado:", user.email);
          return false;
        }

        console.log("Usuário autorizado:", userDetails);
        return true;
      } catch (error) {
        console.error("Erro durante a verificação do login:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token) {
        session.id = token.id;
        session.role = token.role;
        session.user_code = token.user_code;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const userDetails = await getOrCreateUserInSupabase(user);
          if (userDetails) {
            token.id = userDetails.id;
            token.role = userDetails.role;
            token.user_code = userDetails.user_code;
          }
        } catch (error) {
          console.error("Erro ao obter detalhes do usuário:", error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/auth/error',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
});

async function getOrCreateUserInSupabase(user) {
  try {
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error("Erro ao buscar usuário:", userError.message);
      return null;
    }

    if (existingUser) {
      return existingUser;
    }

    const newUserCode = await generateUniqueUserCode();

    const { data: newUser, error: insertError } = await supabaseService
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: 'support',
        user_code: newUserCode,
        squad: 'Squad',          // Valor padrão para squad
        chamado: false,          // Valor padrão para chamado
        telefone: false,         // Valor padrão para telefone
        chat: false,             // Valor padrão para chat
        remote: false            // Valor padrão para acesso remoto
      })
      .single();

    if (insertError) {
      console.error("Erro ao criar usuário:", insertError.message);
      return null;
    }

    return newUser;
  } catch (error) {
    console.error("Erro ao verificar ou criar usuário:", error.message);
    return null;
  }
}

async function generateUniqueUserCode() {
  const { data: usedCodes, error } = await supabase
    .from('users')
    .select('user_code');

  if (error) {
    console.error("Erro ao buscar códigos existentes:", error.message);
    return null;
  }

  let newCode;
  do {
    newCode = Math.floor(1000 + Math.random() * 9000).toString();
  } while (usedCodes.some(user => user.user_code === newCode));

  return newCode;
}
