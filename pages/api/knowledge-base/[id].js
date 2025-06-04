import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID da entrada é obrigatório' });
  }

  try {
    // Primeiro, verificar se a entrada existe e pertence ao usuário
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('knowledge_base_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingEntry) {
      return res.status(404).json({ error: 'Entrada não encontrada ou não autorizada' });
    }

    switch (method) {
      case 'PUT':
        const {
          title,
          description,
          link = '',
          tags = [],
          color = '#0A4EE4',
          category = 'geral',
          marker = 'tech',
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

        const { data: updatedEntry, error: updateError } = await supabaseAdmin
          .from('knowledge_base_entries')
          .update({
            title: title.trim(),
            description: description.trim(),
            link: link.trim(),
            tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
            color,
            category: category.trim(),
            marker,
            images: images,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar entrada:', updateError);
          throw updateError;
        }

        return res.status(200).json(updatedEntry);

      case 'DELETE':
        // TODO: Implementar exclusão de imagens do Imgur antes de excluir a entrada
        // Para implementar futuramente, se necessário
        
        const { error: deleteError } = await supabaseAdmin
          .from('knowledge_base_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Erro ao excluir entrada:', deleteError);
          throw deleteError;
        }

        return res.status(200).json({ message: 'Entrada excluída com sucesso' });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
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