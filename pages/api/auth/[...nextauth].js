import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '../../../utils/supabaseClient';

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

    const newUserId = await generateUniqueId();

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        name: user.name,
        email: user.email,
        role: 'support',
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

async function generateUniqueId() {
  const usedIds = await supabase
    .from('users')
    .select('id');

  let newId;
  do {
    newId = Math.floor(1000 + Math.random() * 9000).toString();
  } while (usedIds.data.some(user => user.id === newId));

  return newId;
}
