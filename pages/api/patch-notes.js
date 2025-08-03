// pages/api/patch-notes.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const { limit: limitParam } = req.query;
    const limitValue = limitParam ? parseInt(limitParam, 10) : 50; // Limite padrão de 50

    // Buscar notificações do tipo "informacao" que funcionam como patch notes
    // Ordenadas por data de criação (mais recentes primeiro)
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        id,
        title,
        message,
        notification_style,
        notification_type,
        target_profiles,
        created_at,
        created_by
      `)
      .eq('notification_style', 'informacao') // Apenas notificações informativas
      .order('created_at', { ascending: false })
      .limit(limitValue);

    if (error) {
      console.error('Erro ao buscar patch notes:', error);
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    // Buscar informações dos criadores para adicionar contexto (opcional)
    const uniqueCreatorIds = [...new Set(data?.map(note => note.created_by).filter(Boolean))];
    let creators = {};
    
    if (uniqueCreatorIds.length > 0) {
      const { data: creatorsData } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', uniqueCreatorIds);
      
      if (creatorsData) {
        creators = creatorsData.reduce((acc, creator) => {
          acc[creator.id] = creator.name;
          return acc;
        }, {});
      }
    }

    // Adicionar nome do criador aos patch notes
    const patchNotesWithCreators = data?.map(note => ({
      ...note,
      creator_name: creators[note.created_by] || 'Sistema'
    })) || [];

    res.status(200).json({ 
      patchNotes: patchNotesWithCreators,
      total: patchNotesWithCreators.length,
      message: `${patchNotesWithCreators.length} atualizações encontradas`
    });

  } catch (error) {
    console.error('Erro ao buscar patch notes:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}