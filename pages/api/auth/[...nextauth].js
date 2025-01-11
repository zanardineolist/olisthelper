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
        // Verificar ou criar usuário no Supabase
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

/**
 * Verifica ou cria o usuário no Supabase
 */
async function getOrCreateUserInSupabase(user) {
  try {
    // Verificar se o usuário já existe
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error("Erro ao buscar usuário:", userError.message);
      return null;
    }

    // Se o usuário já existe, retorna seus dados
    if (existingUser) {
      return existingUser;
    }

    // Caso não exista, cria o novo usuário
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: 'user',
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
