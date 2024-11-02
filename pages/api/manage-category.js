import { getSheetValues, addSheetRow, updateSheetRow, deleteSheetRow } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Categorias';

  try {
    switch (method) {
      case 'GET':
        // Obtendo todas as categorias da coluna A, a partir da linha 2
        const rows = await getSheetValues(sheetName, 'A2:A');
        if (rows) {
          const categories = rows.map((row, index) => ({
            name: row[0],
            index: index + 2, // Usado para saber a linha para edição/exclusão
          }));
          return res.status(200).json({ categories });
        }
        return res.status(404).json({ error: 'Nenhuma categoria encontrada.' });

      case 'POST':
        // Adicionando uma nova categoria
        const { name: newCategoryName } = req.body;
        if (!newCategoryName) {
          return res.status(400).json({ error: 'Nome da categoria não fornecido.' });
        }
        await addSheetRow(sheetName, [newCategoryName]);
        await logAction(req.user.id, req.user.name, req.user.role, 'create_category', 'Categoria', null, { categoryName: newCategoryName });
        return res.status(201).json({ message: 'Categoria adicionada com sucesso.' });

      case 'PUT':
        // Editando uma categoria existente
        const { name: updatedCategoryName, index: updateIndex } = req.body;
        if (!updatedCategoryName || !updateIndex) {
          return res.status(400).json({ error: 'Nome ou índice da categoria não fornecido.' });
        }
        const previousData = await getSheetValues(sheetName, `A${updateIndex}:A${updateIndex}`);
        await updateSheetRow(sheetName, updateIndex, [updatedCategoryName]);
        await logAction(req.user.id, req.user.name, req.user.role, 'update_category', 'Categoria', { categoryName: previousData[0] }, { categoryName: updatedCategoryName });
        return res.status(200).json({ message: 'Categoria atualizada com sucesso.' });

      case 'DELETE':
        // Excluindo uma categoria pela linha
        const { index: deleteIndex } = req.query;
        if (!deleteIndex) {
          return res.status(400).json({ error: 'Índice da categoria não fornecido.' });
        }
        const deletedData = await getSheetValues(sheetName, `A${deleteIndex}:A${deleteIndex}`);
        await deleteSheetRow(sheetName, parseInt(deleteIndex, 10));
        await logAction(req.user.id, req.user.name, req.user.role, 'delete_category', 'Categoria', { categoryName: deletedData[0] }, null);
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
