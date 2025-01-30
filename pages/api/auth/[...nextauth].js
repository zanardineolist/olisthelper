// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
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
        // Verificar ou criar usuário no Supabase
        const userDetails = await getOrCreateUser(user);
        if (!userDetails) {
          console.error("Usuário não autorizado ou erro durante criação:", user.email);
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
      // Adicionar informações extras à sessão
      if (token) {
        session.id = token.id;
        session.role = token.role;
        session.user.profile = token.role; // Para compatibilidade
      }
      return session;
    },
    async jwt({ token, user }) {
      // Atribuir informações ao token
      if (user) {
        try {
          const userDetails = await getOrCreateUser(user);
          if (userDetails) {
            token.id = userDetails.id;
            token.role = userDetails.profile;
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
 * Função auxiliar para obter ou criar usuário no Supabase
 * @param {Object} user - Objeto do usuário fornecido pelo Google
 * @returns {Promise<Object|null>} - Detalhes do usuário ou null em caso de falha
 */
async function getOrCreateUser(user) {
  try {
    // Verificar se o email é do domínio permitido
    const allowedDomains = ['olist.com', 'tiny.com.br'];
    const emailDomain = user.email.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      console.log('Domínio de email não autorizado:', emailDomain);
      return null;
    }

    // Buscar usuário existente
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignorar erro de não encontrado
      throw fetchError;
    }

    if (existingUser) {
      // Atualizar último login e retornar usuário existente
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_sign_in: new Date(),
          name: user.name, // Atualiza o nome caso tenha mudado no Google
          updated_at: new Date()
        })
        .eq('id', existingUser.id);

      if (updateError) throw updateError;
      return existingUser;
    }

    // Criar novo usuário com perfil padrão 'support'
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        name: user.name,
        email: user.email,
        profile: 'support', // Perfil padrão
        can_ticket: false,
        can_phone: false,
        can_chat: false,
        active: true,
        last_sign_in: new Date()
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    return newUser;
  } catch (error) {
    console.error("Erro ao processar usuário:", error);
    return null;
  }
}