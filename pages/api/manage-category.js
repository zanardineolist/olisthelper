// pages/api/manage-category.js
import { 
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  supabaseAdmin
} from '../../utils/supabase/supabaseClient';
import { logAction } from '../../utils/firebase/firebaseLogging';

export default async function handler(req, res) {
  const { method } = req;

  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];
  const userRole = req.cookies['user-role'];

  const reqUser = {
    id: userId,
    name: userName,
    role: userRole,
  };

  const isUserValid = reqUser && reqUser.id && reqUser.name && reqUser.role;

  try {
    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando categorias...');
        const categories = await getAllCategories();
        
        // Mapear UUIDs para IDs incrementais para manter compatibilidade com frontend
        return res.status(200).json({ 
          categories: categories.map((cat, index) => ({
            id: index + 2, // Mantém a compatibilidade com a numeração antiga
            name: cat.name,
            uuid: cat.id // Armazena o UUID real para operações futuras
          }))
        });

      case 'POST':
        console.log('Método POST chamado - Adicionando nova categoria...');
        const newCategoryName = req.body.name;
        
        if (!newCategoryName) {
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }

        const createdCategory = await createCategory(newCategoryName, userId);
        if (!createdCategory) {
          return res.status(400).json({ error: 'Erro ao criar categoria.' });
        }

        if (isUserValid) {
          await logAction(
            reqUser.id,
            reqUser.name,
            reqUser.role,
            'create_category',
            'Categoria',
            null,
            { categoryName: newCategoryName },
            'manage-category'
          );
        }

        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando categoria...');
        const { name: updatedName, uuid: categoryUuid } = req.body;

        if (!updatedName || !categoryUuid) {
          return res.status(400).json({ error: 'Nome ou ID da categoria não fornecido.' });
        }

        // Buscar categoria atual para registro no log
        const existingCategory = await getCategoryById(categoryUuid);
        if (!existingCategory) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const updatedCategory = await updateCategory(categoryUuid, updatedName, userId);
        if (!updatedCategory) {
          return res.status(400).json({ error: 'Erro ao atualizar categoria.' });
        }

        if (isUserValid) {
          await logAction(
            reqUser.id,
            reqUser.name,
            reqUser.role,
            'update_category',
            'Categoria',
            { categoryName: existingCategory.name },
            { categoryName: updatedName },
            'manage-category'
          );
        }

        return res.status(200).json({ message: 'Categoria atualizada com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo categoria...');
        const deleteId = req.query.index;

        // Primeiro obtemos todas as categorias para mapear o ID incremental para UUID
        const allCategories = await getAllCategories();
        const categoryIndex = parseInt(deleteId) - 2; // Ajusta o índice baseado na numeração do frontend
        
        if (categoryIndex < 0 || categoryIndex >= allCategories.length) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const categoryToDelete = allCategories[categoryIndex];
        if (!categoryToDelete) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const deleted = await deleteCategory(categoryToDelete.id, userId);
        if (!deleted) {
          return res.status(400).json({ error: 'Erro ao deletar categoria.' });
        }

        if (isUserValid) {
          await logAction(
            reqUser.id,
            reqUser.name,
            reqUser.role,
            'delete_category',
            'Categoria',
            { categoryName: categoryToDelete.name },
            null,
            'manage-category'
          );
        }

        return res.status(200).json({ message: 'Categoria excluída com sucesso.' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de categoria:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}

async function getCategoryById(categoryId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar categoria por ID:', error);
    return null;
  }
}