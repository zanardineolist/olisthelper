// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    maxAge: 24 * 60 * 60, // 24 horas
    updateAge: 60 * 60,   // 1 hora
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Validação adicional de segurança
        if (!user.email || !user.email.includes('@')) {
          console.error("Email inválido fornecido:", user.email);
          return false;
        }

        // Verificar se é uma conta Google válida
        if (account?.provider !== 'google') {
          console.error("Provedor de autenticação inválido:", account?.provider);
          return false;
        }

        // Verificar ou criar usuário no Supabase
        const userDetails = await getOrCreateUser(user);
        if (!userDetails) {
          console.error("Usuário não autorizado ou erro durante criação:", user.email);
          return false;
        }
        
        // Log de segurança básico
        const timestamp = new Date().toISOString();
        console.log(`[SECURITY] Login bem-sucedido: ${user.email} - Role: ${userDetails.profile} - ${timestamp}`);
        
        return true;
      } catch (error) {
        const timestamp = new Date().toISOString();
        console.error(`[SECURITY] Erro durante verificação do login: ${user.email} - ${timestamp}`, error);
        return false;
      }
    },
    async session({ session, token }) {
      // Adicionar informações extras à sessão
      if (token) {
        session.id = token.id;
        session.role = token.role;
        session.user.profile = token.role; // Para compatibilidade
        
        // Log de sessão criada
        console.log(`[SECURITY] Sessão criada para usuário: ${session.user.email} - Role: ${token.role} - ID: ${token.id}`);
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
};

export default NextAuth(authOptions);

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
          console.log('Email completo:', user.email);
          return null;
        }
        
        console.log('Domínio autorizado:', emailDomain);

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
        can_register_help: false, // Nova permissão padrão
        can_remote_access: false, // Nova permissão padrão
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