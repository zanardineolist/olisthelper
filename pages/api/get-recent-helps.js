import { getSession } from 'next-auth/react';
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

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

    // Buscar os últimos três registros do analista
    const { data: recentHelps, error } = await supabaseAdmin
      .from('help_records')
      .select(`
        id,
        created_at,
        requester_name,
        categories:category_id(name),
        description
      `)
      .eq('analyst_id', analystId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Erro ao buscar registros recentes:', error);
      return res.status(500).json({ error: 'Erro ao buscar registros recentes' });
    }

    // Formatar os registros para exibição
    const formattedHelps = recentHelps.map((help) => {
      // Converter para data considerando o fuso horário do Brasil
      const createdAt = new Date(help.created_at);
      const timezone = 'America/Sao_Paulo';
      
      return {
        id: help.id,
        formattedDate: format(createdAt, 'dd/MM/yyyy', { locale: ptBR, timeZone: timezone }),
        formattedTime: format(createdAt, 'HH:mm', { locale: ptBR, timeZone: timezone }),
        requesterName: help.requester_name,
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