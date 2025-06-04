import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const {
          search_term = '',
          filter_tags = '',
          filter_category = '',
          filter_priority = '',
          order_by = 'created_at',
          order_direction = 'desc'
        } = req.query;

        const tagsArray = filter_tags ? filter_tags.split(',').filter(tag => tag.trim()) : [];

        const { data: entries, error: fetchError } = await supabaseAdmin
          .rpc('search_user_knowledge_base', {
            user_uuid: userId,
            search_term,
            filter_tags: tagsArray,
            filter_category,
            filter_priority,
            order_by,
            order_direction
          });

        if (fetchError) {
          console.error('Erro ao buscar entradas:', fetchError);
          throw fetchError;
        }

        return res.status(200).json({ entries: entries || [] });

      case 'POST':
        const {
          title,
          description,
          link = '',
          tags = [],
          color = '#3B82F6',
          priority = 'normal',
          category = 'geral',
          is_favorite = false
        } = req.body;

        if (!title || !description) {
          return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
        }

        // Validar prioridade
        if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
          return res.status(400).json({ error: 'Prioridade inválida' });
        }

        // Validar cor (formato hexadecimal)
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
          return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
        }

        const { data: newEntry, error: insertError } = await supabaseAdmin
          .from('knowledge_base_entries')
          .insert([{
            user_id: userId,
            title: title.trim(),
            description: description.trim(),
            link: link.trim(),
            tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
            color,
            priority,
            category: category.trim(),
            is_favorite
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Erro ao criar entrada:', insertError);
          throw insertError;
        }

        return res.status(201).json(newEntry);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 