// API específica para extensão Chrome - buscar macros
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação usando NextAuth
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  const userId = session.user.id;
  const { search, limit = 100 } = req.query;

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
      .order('copy_count', { ascending: false })
      .limit(parseInt(limit));

    // Buscar apenas mensagens que têm comando definido (macros)
    query = query.not('command', 'is', null);

    // Filtrar por mensagens públicas OU mensagens privadas do próprio usuário
    query = query.or(`is_public.eq.true,user_id.eq.${userId}`);

    // Se há termo de busca, aplicar filtro
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,command.ilike.%${search}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar macros:', error);
      throw error;
    }

    // Formatar dados para a extensão
    const macros = data.map(macro => ({
      id: macro.id,
      title: macro.title,
      content: macro.content,
      command: macro.command,
      tags: macro.tags || [],
      isPublic: macro.is_public,
      copyCount: macro.copy_count || 0,
      authorName: macro.users?.name || 'Usuário desconhecido',
      createdAt: macro.created_at
    }));

    return res.status(200).json({
      success: true,
      macros,
      total: macros.length
    });

  } catch (error) {
    console.error('Erro ao processar requisição de macros:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
}

/**
 * Função auxiliar para buscar macro específica por comando
 */
export async function getMacroByCommand(command, userId) {
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
    console.error('Erro ao buscar macro por comando:', error);
    return null;
  }
}