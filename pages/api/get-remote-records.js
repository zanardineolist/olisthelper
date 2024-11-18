import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, filterByMonth } = req.query;

  try {
    // Obter todos os registros
    const records = await getSheetValues('Remoto', 'A:G');

    // Converter registros em datas baseadas no horário de Brasília
    const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentMonth = new Date(today).getMonth();
    const currentYear = new Date(today).getFullYear();

    // Função para verificar se o registro pertence ao mês atual
    const isFromCurrentMonth = (record) => {
      const [day, month, year] = record[0].split('/');
      const recordDate = new Date(`${year}-${month}-${day}`);
      return (
        recordDate.getMonth() === currentMonth &&
        recordDate.getFullYear() === currentYear
      );
    };

    // Filtrar registros para um determinado usuário, se especificado
    let filteredRecords = records;
    if (userEmail) {
      filteredRecords = records.filter(record => record[3] === userEmail);
    }

    // Retornar registros do mês atual se solicitado
    if (filterByMonth === 'true') {
      const monthRecords = filteredRecords.filter(isFromCurrentMonth);
      return res.status(200).json({ monthRecords, allRecords: filteredRecords });
    }

    // Caso contrário, retornar todos os registros
    return res.status(200).json({ allRecords: filteredRecords });
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}
