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
          order_by = 'created_at',
          order_direction = 'desc'
        } = req.query;

        const tagsArray = filter_tags ? filter_tags.split(',').filter(tag => tag.trim()) : [];

        const { data: entries, error: fetchError } = await supabaseAdmin
          .rpc('search_user_knowledge_base', {
            user_id_param: userId,
            search_term,
            filter_tags: tagsArray,
            filter_category,
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
          color = '#0A4EE4',
          category = 'geral',
          images = []
        } = req.body;

        if (!title || !description) {
          return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
        }

        // Validar cor (formato hexadecimal)
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
          return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
        }

        // Validar imagens (deve ser um array)
        if (!Array.isArray(images)) {
          return res.status(400).json({ error: 'Images deve ser um array' });
        }

        // Validar estrutura das imagens
        for (const image of images) {
          if (!image.id || !image.url) {
            return res.status(400).json({ error: 'Cada imagem deve ter id e url' });
          }
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
            category: category.trim(),
            images: images
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