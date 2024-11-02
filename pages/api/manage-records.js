import { getSheetValues, updateSheetRow, deleteSheetRow } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { method } = req;
  const { userId, index } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID não fornecido.' });
  }

  const sheetName = `#${userId} - ${req.query.name}`;

  try {
    switch (method) {
      case 'GET':
        const records = await getSheetValues(sheetName, 'A:F');
        return res.status(200).json({ records });

      case 'PUT':
        const { record } = req.body;
        await updateSheetRow(sheetName, index, [
          record.date,
          record.time,
          record.name,
          record.email,
          record.category,
          record.description,
        ]);
        return res.status(200).json({ message: 'Registro atualizado com sucesso.' });

      case 'DELETE':
        await deleteSheetRow(sheetName, parseInt(index, 10) + 1);
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
