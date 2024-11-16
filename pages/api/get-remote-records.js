import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    const rows = await getSheetValues('Remoto', 'A2:E');

    if (rows && rows.length > 0) {
      const records = rows
        .filter(row => row[1] === userId)
        .map(row => ({
          datetime: row[0],
          userName: row[1],
          chamado: row[2],
          tema: row[3],
        }));

      return res.status(200).json({ records });
    } else {
      return res.status(404).json({ error: 'Nenhum registro encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao obter registros remotos:', error);
    return res.status(500).json({ error: 'Erro ao obter registros remotos.' });
  }
}
