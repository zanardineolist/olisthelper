import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar operações de CRUD na tabela de categorias
 */
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getCategories(req, res);
      break;

    case 'POST':
      await createCategory(req, res);
      break;

    case 'PUT':
      await updateCategory(req, res);
      break;

    case 'DELETE':
      await deleteCategory(req, res);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido.`);
  }
}

// Listar todas as categorias
async function getCategories(req, res) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nenhuma categoria encontrada.' });
    }

    return res.status(200).json({ categories: data });
  } catch (error) {
    console.error('[GET CATEGORIES] Erro ao listar categorias:', error.message);
    return res.status(500).json({ error: 'Erro ao listar categorias.' });
  }
}

// Criar nova categoria
async function createCategory(req, res) {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
  }

  try {
    // Verificar se a categoria já existe
    const { data: existingCategory, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'Categoria já existente.' });
    }

    // Inserir nova categoria
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }]);

    if (error) throw error;

    return res.status(201).json({ message: 'Categoria criada com sucesso.', category: data });
  } catch (error) {
    console.error('[CREATE CATEGORY] Erro ao criar categoria:', error.message);
    return res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
}

// Atualizar categoria existente
async function updateCategory(req, res) {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID e nome da categoria são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Categoria atualizada com sucesso.', category: data });
  } catch (error) {
    console.error('[UPDATE CATEGORY] Erro ao atualizar categoria:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
}

// Deletar categoria
async function deleteCategory(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID da categoria não fornecido.' });
  }

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Categoria deletada com sucesso.' });
  } catch (error) {
    console.error('[DELETE CATEGORY] Erro ao deletar categoria:', error.message);
    return res.status(500).json({ error: 'Erro ao deletar categoria.' });
  }
}
