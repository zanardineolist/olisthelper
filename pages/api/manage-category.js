import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

// Função para obter o sheetId baseado no nome da aba
async function getSheetIdByName(sheetName) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);
    if (sheet) {
      return sheet.properties.sheetId;
    } else {
      throw new Error(`Aba '${sheetName}' não encontrada.`);
    }
  } catch (error) {
    console.error('Erro ao obter sheetId:', error);
    throw error;
  }
}

// Função para ordenar categorias pelo nome em ordem alfabética
async function sortCategoriesByName(sheetName) {
  try {
    console.log('Iniciando a ordenação das categorias...');
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = await getSheetIdByName(sheetName);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1,
                endRowIndex: null,
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

        // Garantir que o nome da categoria não exista previamente
        const allRows = await getSheetValues(sheetName, 'A2:A');
        if (allRows.some(row => row[0].toLowerCase() === newCategoryName.toLowerCase())) {
          return res.status(400).json({ error: 'Categoria já existe.' });
        }

        await appendValuesToSheet(sheetName, [[newCategoryName]]);
        console.log('Nova categoria adicionada:', newCategoryName);
        await sortCategoriesByName(sheetName);

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

        // Garantir que o nome da categoria não seja duplicado após a atualização
        if (allRowsUpdate.some((row, idx) => idx !== rowIndex && row[0].toLowerCase() === updatedCategoryName.toLowerCase())) {
          return res.status(400).json({ error: 'Categoria com este nome já existe.' });
        }

        await updateSheetRow(sheetName, updateIndex, [updatedCategoryName], previousData);
        console.log('Categoria atualizada de:', previousData[0], 'para:', updatedCategoryName);
        await sortCategoriesByName(sheetName);

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

        // Validação antes de deletar a categoria
        if (deletedData[0] !== allRowsDelete[deleteRowIndex][0]) {
          return res.status(400).json({ error: 'Categoria não corresponde ao registro existente.' });
        }

        await deleteSheetRow(sheetName, parseInt(deleteIndex, 10), deletedData);
        console.log('Categoria excluída:', deletedData[0]);
        await sortCategoriesByName(sheetName);

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
