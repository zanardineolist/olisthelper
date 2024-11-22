import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets, sortSheetByColumn } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';
import { cache } from '../../utils/cache';

// Função para invalidar o cache da aba
async function invalidateCache(sheetName) {
  const cacheKey = `sheet_${sheetName}_A:A`;
  cache.delete(cacheKey); // Remover o cache após cada operação de modificação para garantir que os dados sejam atualizados
}

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Categorias';

  // Extraindo informações do usuário dos cookies (passados pelo middleware)
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];
  const userRole = req.cookies['user-role'];

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
  };

  console.log('Detalhes do usuário extraídos dos cookies:', req.user);

  const isUserValid = req.user && req.user.id && req.user.name && req.user.role;
  console.log('Usuário é válido:', isUserValid);

  try {
    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando categorias...');
        const rows = await getSheetValues(sheetName, 'A2:A');
        console.log('Categorias carregadas:', rows);

        if (rows && rows.length > 0) {
          const categories = rows.map((row, index) => ({
            id: index + 2, // Identificador para edição/exclusão (linha na planilha)
            name: row[0],
          }));
          return res.status(200).json({ categories });
        }
        return res.status(404).json({ error: 'Nenhuma categoria encontrada.' });

      case 'POST':
        console.log('Método POST chamado - Adicionando nova categoria...');
        const newCategoryName = req.body.name;
        if (!newCategoryName) {
          console.error('Erro: Nome da categoria não fornecido.');
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }

        // Adicionar nova categoria
        await appendValuesToSheet(sheetName, [[newCategoryName]]);
        console.log('Nova categoria adicionada:', newCategoryName);

        // Ordenar categorias após a adição
        await sortSheetByColumn(sheetName, 1, 0, 1, 0); // Ordena a partir da linha 2 (índice 1)

        // Invalida o cache após adicionar uma nova categoria
        invalidateCache(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de criação no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'create_category', 'Categoria', null, { categoryName: newCategoryName }, 'manage-category');
          console.log('Ação de criação registrada com sucesso.');
        }

        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando categoria...');
        const updatedCategoryName = req.body.name;
        const updateIndex = req.body.index;

        if (!updatedCategoryName || typeof updateIndex === 'undefined') {
          console.error('Erro: Nome ou índice da categoria não fornecido.');
          return res.status(400).json({ error: 'Nome ou índice da categoria não fornecido.' });
        }

        const allRowsUpdate = await getSheetValues(sheetName, 'A2:A');
        console.log('Categorias carregadas para atualização:', allRowsUpdate);

        const rowIndex = updateIndex - 2;

        if (rowIndex < 0 || rowIndex >= allRowsUpdate.length) {
          console.error('Erro: Categoria não encontrada.');
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const previousData = allRowsUpdate[rowIndex];
        await updateSheetRow(sheetName, updateIndex, [updatedCategoryName]);
        console.log('Categoria atualizada de:', previousData[0], 'para:', updatedCategoryName);

        // Ordenar categorias após a atualização
        await sortSheetByColumn(sheetName, 1, 0, 1, 0); // Ordena a partir da linha 2 (índice 1)

        // Invalida o cache após atualizar uma categoria
        invalidateCache(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de atualização no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'update_category', 'Categoria', { categoryName: previousData[0] }, { categoryName: updatedCategoryName }, 'manage-category');
          console.log('Ação de atualização registrada com sucesso.');
        }

        return res.status(200).json({ message: 'Categoria atualizada com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo categoria...');
        const deleteIndex = req.query.index;

        if (typeof deleteIndex === 'undefined') {
          console.error('Erro: Índice da categoria não fornecido.');
          return res.status(400).json({ error: 'Índice da categoria não fornecido.' });
        }

        const allRowsDelete = await getSheetValues(sheetName, 'A2:A');
        console.log('Categorias carregadas para exclusão:', allRowsDelete);

        const deleteRowIndex = deleteIndex - 2;

        if (deleteRowIndex < 0 || deleteRowIndex >= allRowsDelete.length) {
          console.error('Erro: Categoria não encontrada.');
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const deletedData = allRowsDelete[deleteRowIndex];
        await deleteSheetRow(sheetName, parseInt(deleteIndex, 10));
        console.log('Categoria excluída:', deletedData[0]);

        // Ordenar categorias após a exclusão
        await sortSheetByColumn(sheetName, 1, 0, 1, 0); // Ordena a partir da linha 2 (índice 1)

        // Invalida o cache após excluir uma categoria
        invalidateCache(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de exclusão no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'delete_category', 'Categoria', { categoryName: deletedData[0] }, null, 'manage-category');
          console.log('Ação de exclusão registrada com sucesso.');
        }

        return res.status(200).json({ message: 'Categoria excluída com sucesso.' });

      default:
        console.error(`Método ${method} não permitido.`);
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de categoria:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}
