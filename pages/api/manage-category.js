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
        try {
          const categories = await getAllCategories();
          
          // Mapear UUIDs para IDs incrementais para manter compatibilidade com frontend
          return res.status(200).json({ 
            categories: categories.map((cat, index) => ({
              id: index + 2, // Mantém a compatibilidade com a numeração antiga
              name: cat.name,
              uuid: cat.id // Armazena o UUID real para operações futuras
            }))
          });
        } catch (error) {
          console.error('Erro ao buscar categorias:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao carregar categorias. Tente novamente em alguns instantes.' 
          });
        }

      case 'POST':
        const newCategoryName = req.body.name;
        
        // Validações obrigatórias
        if (!newCategoryName || !newCategoryName.trim()) {
          return res.status(400).json({ 
            error: 'Nome da categoria é obrigatório. Por favor, preencha o campo "Nome da Categoria".' 
          });
        }

        // Validar tamanho do nome
        if (newCategoryName.trim().length < 2) {
          return res.status(400).json({ 
            error: 'Nome da categoria deve ter pelo menos 2 caracteres.' 
          });
        }

        if (newCategoryName.trim().length > 100) {
          return res.status(400).json({ 
            error: 'Nome da categoria deve ter no máximo 100 caracteres.' 
          });
        }

        // Verificar se categoria já existe
        try {
          const existingCategories = await getAllCategories();
          const categoryExists = existingCategories.some(
            cat => cat.name.toLowerCase().trim() === newCategoryName.toLowerCase().trim()
          );

          if (categoryExists) {
            return res.status(400).json({ 
              error: `Categoria "${newCategoryName.trim()}" já existe. Por favor, utilize um nome diferente.` 
            });
          }
        } catch (error) {
          console.error('Erro ao verificar categoria existente:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao verificar categoria existente. Tente novamente.' 
          });
        }

        try {
          const createdCategory = await createCategory(newCategoryName.trim(), userId);
          if (!createdCategory) {
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao criar categoria. Tente novamente em alguns instantes.' 
            });
          }

          if (isUserValid) {
            await logAction(
              reqUser.id,
              reqUser.name,
              reqUser.role,
              'create_category',
              'Categoria',
              null,
              { categoryName: newCategoryName.trim() },
              'manage-category'
            );
          }

          return res.status(201).json({ 
            message: `Categoria "${newCategoryName.trim()}" adicionada com sucesso.` 
          });
        } catch (error) {
          console.error('Erro ao criar categoria:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao criar categoria. Tente novamente em alguns instantes.' 
          });
        }

      case 'PUT':
        const { name: updatedName, uuid: categoryUuid } = req.body;

        // Validações obrigatórias
        if (!updatedName || !updatedName.trim()) {
          return res.status(400).json({ 
            error: 'Nome da categoria é obrigatório. Por favor, preencha o campo "Nome da Categoria".' 
          });
        }

        if (!categoryUuid) {
          return res.status(400).json({ 
            error: 'ID da categoria não fornecido. Erro interno do sistema.' 
          });
        }

        // Validar tamanho do nome
        if (updatedName.trim().length < 2) {
          return res.status(400).json({ 
            error: 'Nome da categoria deve ter pelo menos 2 caracteres.' 
          });
        }

        if (updatedName.trim().length > 100) {
          return res.status(400).json({ 
            error: 'Nome da categoria deve ter no máximo 100 caracteres.' 
          });
        }

        try {
          // Buscar categoria atual para registro no log
          const existingCategory = await getCategoryById(categoryUuid);
          if (!existingCategory) {
            return res.status(404).json({ 
              error: 'Categoria não encontrada. A categoria pode ter sido removida ou você não tem permissão para editá-la.' 
            });
          }

          // Verificar se o novo nome já existe em outra categoria
          const allCategories = await getAllCategories();
          const nameExists = allCategories.some(
            cat => cat.id !== categoryUuid && 
                   cat.name.toLowerCase().trim() === updatedName.toLowerCase().trim()
          );

          if (nameExists) {
            return res.status(400).json({ 
              error: `Categoria "${updatedName.trim()}" já existe. Por favor, utilize um nome diferente.` 
            });
          }

          const updatedCategory = await updateCategory(categoryUuid, updatedName.trim(), userId);
          if (!updatedCategory) {
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao atualizar categoria. Tente novamente em alguns instantes.' 
            });
          }

          if (isUserValid) {
            await logAction(
              reqUser.id,
              reqUser.name,
              reqUser.role,
              'update_category',
              'Categoria',
              { categoryName: existingCategory.name },
              { categoryName: updatedName.trim() },
              'manage-category'
            );
          }

          return res.status(200).json({ 
            message: `Categoria "${existingCategory.name}" atualizada para "${updatedName.trim()}" com sucesso.` 
          });
        } catch (error) {
          console.error('Erro ao atualizar categoria:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao atualizar categoria. Tente novamente em alguns instantes.' 
          });
        }

      case 'DELETE':
        const deleteId = req.query.index;

        if (!deleteId) {
          return res.status(400).json({ 
            error: 'ID da categoria não fornecido. Erro interno do sistema.' 
          });
        }

        try {
          // Primeiro obtemos todas as categorias para mapear o ID incremental para UUID
          const allCategories = await getAllCategories();
          const categoryIndex = parseInt(deleteId) - 2; // Ajusta o índice baseado na numeração do frontend
          
          if (categoryIndex < 0 || categoryIndex >= allCategories.length) {
            return res.status(404).json({ 
              error: 'Categoria não encontrada. A categoria pode ter sido removida anteriormente.' 
            });
          }

          const categoryToDelete = allCategories[categoryIndex];
          if (!categoryToDelete) {
            return res.status(404).json({ 
              error: 'Categoria não encontrada. A categoria pode ter sido removida anteriormente.' 
            });
          }

          // Verificar se a categoria já está inativa
          if (!categoryToDelete.active) {
            return res.status(400).json({ 
              error: `A categoria "${categoryToDelete.name}" já está inativa.` 
            });
          }

          const deleted = await deleteCategory(categoryToDelete.id, userId);
          if (!deleted) {
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao excluir categoria. Tente novamente em alguns instantes.' 
            });
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

          return res.status(200).json({ 
            message: `Categoria "${categoryToDelete.name}" excluída com sucesso.` 
          });
        } catch (error) {
          console.error('Erro ao excluir categoria:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao excluir categoria. Tente novamente em alguns instantes.' 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Método ${method} não permitido. Use GET, POST, PUT ou DELETE.` 
        });
    }
  } catch (error) {
    console.error('Erro não tratado na API manage-category:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.' 
    });
  }
}

async function getCategoryById(categoryId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      console.error('Erro ao buscar categoria por ID:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar categoria por ID:', error);
    return null;
  }
}