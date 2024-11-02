import { getSheetValues, addSheetRow, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

// Função para ordenar categorias em ordem alfabética pelo nome
async function sortCategoriesByName(sheetName) {
  const sheets = await getAuthenticatedGoogleSheets();
  const sheetId = process.env.SHEET_ID;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          sortRange: {
            range: {
              sheetId: 0, // Atualize conforme necessário
              startRowIndex: 1, // Ignorar a linha de cabeçalho
              endRowIndex: null, // Até o final
              startColumnIndex: 0,
              endColumnIndex: 1, // Apenas a coluna A para categorias
            },
            sortSpecs: [
              {
                dimensionIndex: 0, // Índice da coluna A (nome)
                sortOrder: 'ASCENDING',
              },
            ],
          },
        },
      ],
    },
  });
}

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Categorias';

  try {
    switch (method) {
      case 'GET':
        // Obtendo todas as categorias da coluna A, a partir da linha 2
        const rows = await getSheetValues(sheetName, 'A2:A');
        if (rows && rows.length > 0) {
          const categories = rows.map((row, index) => ({
            id: index + 2, // Identificador para edição/exclusão (linha na planilha)
            name: row[0],
          }));
          return res.status(200).json({ categories });
        }
        return res.status(404).json({ error: 'Nenhuma categoria encontrada.' });

      case 'POST':
        // Adicionando uma nova categoria
        const newCategoryName = req.body.name;
        if (!newCategoryName) {
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }
        await addSheetRow(sheetName, [newCategoryName]);
        await sortCategoriesByName(sheetName); // Ordenar categorias após adicionar
        if (req.user) {
          await logAction(req.user.id, req.user.name, req.user.role, 'create_category', 'Categoria', null, { categoryName: newCategoryName });
        }
        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      case 'PUT':
        // Editando uma categoria existente
        const updatedCategoryName = req.body.name;
        const updateIndex = req.body.index;
        if (!updatedCategoryName || typeof updateIndex === 'undefined') {
          return res.status(400).json({ error: 'Nome ou índice da categoria não fornecido.' });
        }

        const allRowsUpdate = await getSheetValues(sheetName, 'A2:A');
        const rowIndex = updateIndex - 2; // Ajustar índice para a linha correta (abaixo do cabeçalho)

        if (rowIndex < 0 || rowIndex >= allRowsUpdate.length) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const previousData = allRowsUpdate[rowIndex];
        await updateSheetRow(sheetName, updateIndex, [updatedCategoryName]);
        await sortCategoriesByName(sheetName); // Ordenar categorias após atualizar
        if (req.user) {
          await logAction(req.user.id, req.user.name, req.user.role, 'update_category', 'Categoria', { categoryName: previousData[0] }, { categoryName: updatedCategoryName });
        }
        return res.status(200).json({ message: 'Categoria atualizada com sucesso.' });

      case 'DELETE':
        // Excluindo uma categoria pela linha
        const deleteIndex = req.query.index;
        if (typeof deleteIndex === 'undefined') {
          return res.status(400).json({ error: 'Índice da categoria não fornecido.' });
        }

        const allRowsDelete = await getSheetValues(sheetName, 'A2:A');
        const deleteRowIndex = deleteIndex - 2; // Ajustar índice para a linha correta (abaixo do cabeçalho)

        if (deleteRowIndex < 0 || deleteRowIndex >= allRowsDelete.length) {
          return res.status(404).json({ error: 'Categoria não encontrada.' });
        }

        const deletedData = allRowsDelete[deleteRowIndex];
        await deleteSheetRow(sheetName, parseInt(deleteIndex, 10));
        await sortCategoriesByName(sheetName); // Ordenar categorias após excluir
        if (req.user) {
          await logAction(req.user.id, req.user.name, req.user.role, 'delete_category', 'Categoria', { categoryName: deletedData[0] }, null);
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
