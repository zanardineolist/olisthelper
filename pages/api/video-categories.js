import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handleGet(req, res) {
  try {
    const { data: categories, error } = await supabase
      .from('video_categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }

    return res.status(200).json({ categories: categories || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
}

async function handlePost(req, res) {
  try {
    const { name, value, userId } = req.body;

    if (!name?.trim() || !value?.trim()) {
      return res.status(400).json({ error: 'Nome e valor são obrigatórios' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se já existe uma categoria com o mesmo valor
    const { data: existing } = await supabase
      .from('video_categories')
      .select('id')
      .eq('value', value.trim())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma categoria com este valor' });
    }

    const { data: category, error } = await supabase
      .from('video_categories')
      .insert({
        name: name.trim(),
        value: value.trim(),
        created_by: userId,
        is_default: false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao criar categoria' });
    }

    return res.status(201).json({ category });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
} 