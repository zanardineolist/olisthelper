// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Validação das variáveis de ambiente
const validateEnvironmentVars = () => {
  const missingVars = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missingVars.length > 0) {
    throw new Error(`Variáveis de ambiente necessárias não configuradas: ${missingVars.join(', ')}`);
  }
};

// Configurações do cliente
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 
      'x-application-name': 'olist-helper'
    }
  }
};

validateEnvironmentVars();

// Inicializa o cliente do Supabase com as configurações
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseOptions
);