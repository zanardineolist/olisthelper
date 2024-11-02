import { getAnalystRecords } from '../../utils/getAnalystSheetDetails';

export default async function handler(req, res) {
  const { analystId, filter } = req.query;

  // Validação do ID do analista
  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    // Obtém registros do analista usando a função centralizada
    const records = await getAnalystRecords(analystId);

    // Filtrar registros, se necessário
    let filteredRecords = records;

    if (filter === 'month') {
      const currentDate = new Date();
      const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentMonth = brtDate.getMonth();
      const currentYear = brtDate.getFullYear();

      filteredRecords = records.filter((record) => {
        const [day, month, year] = record.date.split('/').map(Number);
        const recordDate = new Date(year, month - 1, day);

        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });
    }

    res.status(200).json({ records: filteredRecords });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
