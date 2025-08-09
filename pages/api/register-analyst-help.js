// pages/api/register-analyst-help.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    userName: rawUserName,
    userEmail: rawUserEmail,
    category: rawCategory,
    description: rawDescription,
    analystId,
  } = req.body || {};

  const userName = typeof rawUserName === 'string' ? rawUserName.trim() : '';
  const userEmail = typeof rawUserEmail === 'string' ? rawUserEmail.trim() : '';
  const category = typeof rawCategory === 'string' ? rawCategory.trim() : '';
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';

  if (!userName || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  try {
    // Exigir sessão e validar vínculo com analystId
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    if (session.id !== analystId) {
      return res.status(403).json({ error: 'Proibido' });
    }

    // Buscar o ID da categoria pelo nome
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .ilike('name', category)
      .eq('active', true)
      .single();
    
    if (categoryError || !categoryData) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }

    // Registrar a ajuda e retornar created_at
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('help_records')
      .insert([{
        analyst_id: analystId,
        requester_name: userName,
        requester_email: userEmail || '',
        category_id: categoryData.id,
        description
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Derivar data (YYYY-MM-DD) em São Paulo a partir do created_at inserido
    const createdAt = new Date(inserted.created_at);
    const utcMs = createdAt.getTime() + createdAt.getTimezoneOffset() * 60000;
    const saoPaulo = new Date(utcMs - 3 * 60 * 60 * 1000);
    const dateStr = saoPaulo.toISOString().slice(0, 10);

    // Obter contadores atualizados do dia (trigger já incrementou helps_count)
    const { data: counter, error: counterErr } = await supabaseAdmin
      .from('daily_counters')
      .select('*')
      .eq('analyst_id', analystId)
      .eq('date', dateStr)
      .maybeSingle();

    // Responder com o record de contadores (se disponível)
    res.status(200).json({ message: 'Ajuda registrada com sucesso.', counter: counter || null });
  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Por favor, tente novamente.' });
  }
}