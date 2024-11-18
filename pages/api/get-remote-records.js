import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, filterByMonth } = req.query;

  try {
    const records = await getSheetValues('Remoto', 'A:G');

    let filteredRecords = records;

    if (userEmail) {
      filteredRecords = records.filter(record => record[3] === userEmail);
    }

    // Filtrar por mês atual baseado no horário de Brasília
    if (filterByMonth === 'true') {
      const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentMonth = new Date(today).getMonth();
      const currentYear = new Date(today).getFullYear();

      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record[0]);
        return (
          recordDate.getMonth() === currentMonth &&
          recordDate.getFullYear() === currentYear
        );
      });
    }

    return res.status(200).json({ records: filteredRecords });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}
