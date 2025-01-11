// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Conectando com o Supabase usando variáveis de ambiente configuradas no Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas.');
}

// Inicializa o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
