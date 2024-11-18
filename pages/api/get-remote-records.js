import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail } = req.query;

  try {
    const records = await getSheetValues('Remoto', 'A:G');

    if (userEmail) {
      const userRecords = records.filter(record => record[3] === userEmail);
      return res.status(200).json({ records: userRecords });
    }

    return res.status(200).json({ records });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}
