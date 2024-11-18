import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = req.query;

  try {
    const records = await getSheetValues('Remoto', 'A:E');

    if (user) {
      // Filtrar registros do usuário especificado
      const userRecords = records.filter(record => record[2] === user);
      return res.status(200).json({ records: userRecords });
    }

    // Se não houver usuário especificado, retornar todos os registros
    return res.status(200).json({ records });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}
