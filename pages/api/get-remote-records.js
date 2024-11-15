import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, role } = req.query;

  try {
    const rows = await getSheetValues('Remoto', 'A2:F');

    if (rows && rows.length > 0) {
      const records = rows.map(row => ({
        date: row[0],
        time: row[1],
        userName: row[2],
        userEmail: row[3],
        chamado: row[4],
        tema: row[5],
      }));

      const filteredRecords = role === 'super' ? records : records.filter(record => record.userEmail === userId);

      return res.status(200).json({ records: filteredRecords });
    }

    return res.status(404).json({ error: 'Nenhum registro encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    return res.status(500).json({ error: 'Erro ao buscar registros.' });
  }
}
