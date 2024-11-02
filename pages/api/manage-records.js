import { getSheetValues, updateSheetRow, deleteSheetRow, getSheetMetaData } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID não fornecido ou inválido.' });
  }

  // Define o padrão para buscar a aba com base no ID do usuário
  const sheetNamePattern = `#${userId} -`;

  try {
    // Obtém os metadados de todas as abas disponíveis na planilha
    const sheetsMetaData = await getSheetMetaData();
    const matchingSheet = sheetsMetaData.find(sheet => sheet.title.startsWith(sheetNamePattern));

    if (!matchingSheet) {
      return res.status(404).json({ error: 'Aba correspondente não encontrada.' });
    }

    const sheetName = matchingSheet.title;

    switch (method) {
      case 'GET':
        const records = await getSheetValues(sheetName, 'A:F');
        if (records && records.length > 1) {
          const formattedRecords = records.slice(1).map((row, index) => ({
            index,
            date: row[0],
            time: row[1],
            name: row[2],
            email: row[3],
            category: row[4],
            description: row[5],
          }));
          return res.status(200).json({ records: formattedRecords });
        }
        return res.status(404).json({ error: 'Nenhum registro encontrado.' });

      case 'PUT':
        const { record } = req.body;
        if (!record) {
          return res.status(400).json({ error: 'Dados do registro não fornecidos.' });
        }
        await updateSheetRow(sheetName, parseInt(req.query.index, 10) + 2, [
          record.date,
          record.time,
          record.name,
          record.email,
          record.category,
          record.description,
        ]);
        return res.status(200).json({ message: 'Registro atualizado com sucesso.' });

      case 'DELETE':
        const index = req.query.index;
        if (!index) {
          return res.status(400).json({ error: 'Índice do registro não fornecido.' });
        }
        await deleteSheetRow(sheetName, parseInt(index, 10) + 2);
        return res.status(200).json({ message: 'Registro excluído com sucesso.' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de registros:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição.' });
  }
}
