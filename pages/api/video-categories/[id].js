import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  if (!id) {
    return res.status(400).json({ error: 'ID da categoria é obrigatório' });
  }

  try {
    switch (method) {
      case 'PUT':
        return await handlePut(req, res, id);
      case 'DELETE':
        return await handleDelete(req, res, id);
      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePut(req, res, id) {
  try {
    const { name, value } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se a categoria existe
    const { data: existingCategory, error: fetchError } = await supabase
      .from('video_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Verificar se é uma categoria padrão (não pode ser editada)
    if (existingCategory.is_default) {
      return res.status(403).json({ error: 'Categorias padrão não podem ser editadas' });
    }

    // Se o valor foi alterado, verificar se já existe outro com o mesmo valor
    if (value && value.trim() !== existingCategory.value) {
      const { data: existing } = await supabase
        .from('video_categories')
        .select('id')
        .eq('value', value.trim())
        .neq('id', id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Já existe uma categoria com este valor' });
      }
    }

    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    if (value?.trim()) {
      updateData.value = value.trim();
    }

    const { data: category, error } = await supabase
      .from('video_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }

    return res.status(200).json({ category });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
}

async function handleDelete(req, res, id) {
  try {
    // Verificar se a categoria existe
    const { data: existingCategory, error: fetchError } = await supabase
      .from('video_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Verificar se é uma categoria padrão (não pode ser excluída)
    if (existingCategory.is_default) {
      return res.status(403).json({ error: 'Categorias padrão não podem ser excluídas' });
    }

    // Verificar se há vídeos usando esta categoria
    const { data: videosUsingCategory, error: videosError } = await supabase
      .from('video_library')
      .select('id')
      .eq('category', existingCategory.value)
      .limit(1);

    if (videosError) {
      return res.status(500).json({ error: 'Erro ao verificar dependências' });
    }

    if (videosUsingCategory && videosUsingCategory.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria que possui vídeos associados' 
      });
    }

    const { error } = await supabase
      .from('video_categories')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Erro ao excluir categoria' });
    }

    return res.status(200).json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
} 