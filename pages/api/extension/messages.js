// API específica para extensão Chrome - buscar mensagens por comando de macro
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Extrair informações do usuário dos cookies ou headers
  const userId = req.cookies['user-id'] || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { command, search, limit = 50 } = req.query;

  try {
    let query = supabaseAdmin
      .from('shared_responses')
      .select(`
        id,
        title,
        content,
        command,
        tags,
        is_public,
        copy_count,
        created_at,
        users (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Se um comando específico foi fornecido, buscar por ele
    if (command) {
      query = query.eq('command', command);
    } else {
      // Buscar apenas mensagens que têm comando definido
      query = query.not('command', 'is', null);
    }

    // Filtrar por mensagens públicas OU mensagens privadas do próprio usuário
    query = query.or(`is_public.eq.true,user_id.eq.${userId}`);

    // Se há termo de busca, aplicar filtro
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,command.ilike.%${search}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }

    // Formatar dados para a extensão
    const messages = data.map(msg => ({
      id: msg.id,
      title: msg.title,
      content: msg.content,
      command: msg.command,
      tags: msg.tags || [],
      isPublic: msg.is_public,
      copyCount: msg.copy_count || 0,
      authorName: msg.users?.name || 'Usuário desconhecido',
      createdAt: msg.created_at
    }));

    return res.status(200).json({
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
}

/**
 * Função auxiliar para buscar mensagem específica por comando
 * Pode ser usada pela extensão para busca rápida
 */
export async function getMessageByCommand(command, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .select(`
        id,
        title,
        content,
        command,
        tags,
        is_public,
        copy_count,
        users (
          name
        )
      `)
      .eq('command', command)
      .or(`is_public.eq.true,user_id.eq.${userId}`)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      command: data.command,
      tags: data.tags || [],
      isPublic: data.is_public,
      copyCount: data.copy_count || 0,
      authorName: data.users?.name || 'Usuário desconhecido'
    };
  } catch (error) {
    console.error('Erro ao buscar mensagem por comando:', error);
    return null;
  }
}