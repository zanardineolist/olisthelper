import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar a requisição de usuários
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    // 🔍 Consulta a tabela de usuários no Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, squad, chamado, telefone, chat, remote, created_at')
      .order('name', { ascending: true });

    // 📛 Tratamento de erro da consulta
    if (error) {
      console.error(`[GET USERS] Erro ao buscar usuários: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }

    // 🔎 Validação: Verifica se há usuários cadastrados
    if (!users || users.length === 0) {
      console.warn('[GET USERS] Nenhum usuário encontrado.');
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // ✅ Resposta com dados encontrados
    return res.status(200).json({ users });
  } catch (err) {
    console.error('[GET USERS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar usuários' });
  }
}
