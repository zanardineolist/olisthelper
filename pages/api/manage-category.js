import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';
import { cache } from '../../utils/cache';

// Função para ordenar categorias pelo nome em ordem alfabética
async function sortCategoriesByName(sheetName) {
  try {
    console.log('Iniciando a ordenação das categorias...');
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Utilizando a função centralizada de `getSheetIdByName` do googleSheets.js
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = sheetInfo.data.sheets.find((s) => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Aba '${sheetName}' não encontrada.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              sortSpecs: [
                {
                  dimensionIndex: 0,
                  sortOrder: 'ASCENDING',
                },
              ],
            },
          },
        ],
      },
    });
    console.log('Ordenação das categorias concluída.');
  } catch (error) {
    console.error('Erro ao ordenar categorias:', error);
  }
}

async function invalidateCache(sheetName) {
  const cacheKey = `sheet_${sheetName}_A:A`;
  cache.delete(cacheKey);
}

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Categorias';

  // Extraindo informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];
  const userRole = req.cookies['user-role'];

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
  };

  const isUserValid = req.user && req.user.id && req.user.name && req.user.role;

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
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }

        await appendValuesToSheet(sheetName, [[newCategoryName]]);
        console.log('Nova categoria adicionada:', newCategoryName);

        // Ordenar categorias após a adição
        await sortCategoriesByName(sheetName);

        // Invalida o cache após adicionar uma nova categoria
        await invalidateCache(sheetName);

        if (isUserValid) {
          await logAction(req.user.id, req.user.name, req.user.role, 'create_category', 'Categoria', null, { categoryName: newCategoryName }, 'manage-category');
        }

        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando categoria...');
        const updatedCategoryName = req.body.name;
        const updateIndex = req.body.index;

        if (!updatedCategoryName || typeof updateIndex === 'undefined') {
          return res.status(400).json({ error: 'Nome ou índice da categoria não fornecido.' });
        }

        const allRowsUpdate = await getSheetValues(sheetName, 'A2:A');
        const rowIndex = updateIndex - 2;

        if (rowIndex < 0 || rowIndex >= allRowsUpdate.length) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const previousData = allRowsUpdate[rowIndex];
        await updateSheetRow(sheetName, updateIndex, [updatedCategoryName]);
        console.log('Categoria atualizada de:', previousData[0], 'para:', updatedCategoryName);

        // Ordenar categorias após a atualização
        await sortCategoriesByName(sheetName);

        // Invalida o cache após a atualização de uma categoria
        await invalidateCache(sheetName);

        if (isUserValid) {
          await logAction(req.user.id, req.user.name, req.user.role, 'update_category', 'Categoria', { categoryName: previousData[0] }, { categoryName: updatedCategoryName }, 'manage-category');
        }

        return res.status(200).json({ message: 'Categoria atualizada com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo categoria...');
        const deleteIndex = req.query.index;

        if (typeof deleteIndex === 'undefined') {
          return res.status(400).json({ error: 'Índice da categoria não fornecido.' });
        }

        const allRowsDelete = await getSheetValues(sheetName, 'A2:A');
        const deleteRowIndex = deleteIndex - 2;

        if (deleteRowIndex < 0 || deleteRowIndex >= allRowsDelete.length) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const deletedData = allRowsDelete[deleteRowIndex];
        await deleteSheetRow(sheetName, parseInt(deleteIndex, 10));
        console.log('Categoria excluída:', deletedData[0]);

        // Ordenar categorias após a exclusão
        await sortCategoriesByName(sheetName);

        // Invalida o cache após excluir uma categoria
        await invalidateCache(sheetName);

        if (isUserValid) {
          await logAction(req.user.id, req.user.name, req.user.role, 'delete_category', 'Categoria', { categoryName: deletedData[0] }, null, 'manage-category');
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