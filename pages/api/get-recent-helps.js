import { getSession } from 'next-auth/react';
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar a sessão do usuário
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Obter o ID do analista dos parâmetros da query
    const { analystId } = req.query;
    if (!analystId) {
      return res.status(400).json({ error: 'ID do analista é obrigatório' });
    }

    // Garantir que o usuário só acesse seus próprios registros
    if (session.id !== analystId) {
      return res.status(403).json({ error: 'Proibido' });
    }

    // Calcular início e fim do dia atual em America/Sao_Paulo
    const saoPauloOffsetMinutes = -3 * 60; // SP UTC-3 (sem horário de verão atualmente)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const saoPauloNow = new Date(utcMs + saoPauloOffsetMinutes * 60000);
    const spStart = new Date(saoPauloNow);
    spStart.setHours(0, 0, 0, 0);
    const spEnd = new Date(saoPauloNow);
    spEnd.setHours(23, 59, 59, 999);
    const startUTC = new Date(spStart.getTime() - saoPauloOffsetMinutes * 60000); // volta para UTC
    const endUTC = new Date(spEnd.getTime() - saoPauloOffsetMinutes * 60000);

    // Buscar todos os registros do dia atual do analista
    const { data: recentHelps, error } = await supabaseAdmin
      .from('help_records')
      .select(`
        id,
        created_at,
        requester_name,
        requester_email,
        categories:category_id(name),
        description
      `)
      .eq('analyst_id', analystId)
      .gte('created_at', startUTC.toISOString())
      .lte('created_at', endUTC.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar registros recentes:', error);
      return res.status(500).json({ error: 'Erro ao buscar registros recentes' });
    }

    // Formatar os registros usando o mesmo método do manage-records.js
    const formattedHelps = recentHelps.map((help) => {
      const createdAt = new Date(help.created_at);
      
      return {
        id: help.id,
        formattedDate: createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        formattedTime: createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        requesterName: help.requester_name,
        requesterEmail: help.requester_email || '',
        category: help.categories?.name || 'Sem categoria',
        description: help.description
      };
    });

    // Retornar os registros formatados
    return res.status(200).json({ recentHelps: formattedHelps });
  } catch (error) {
    console.error('Erro na API de registros recentes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 