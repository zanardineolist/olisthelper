import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, filterByMonth } = req.query;

  try {
    // Obter todos os registros
    const records = await getSheetValues('Remoto', 'A:G');
    const dataWithoutHeader = records.slice(1); // Ignora a primeira linha (cabeçalho)
    console.log('Registros obtidos do Google Sheets:', records);

    if (userEmail) {
      const filteredRecords = dataWithoutHeader.filter(record => record[3] === userEmail);
      console.log(`Registros filtrados para o usuário ${userEmail}:`, filteredRecords);

      if (filterByMonth === 'true') {
        const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const currentMonth = new Date(today).getMonth();
        const currentYear = new Date(today).getFullYear();

        const isFromCurrentMonth = (record) => {
          const [day, month, year] = record[0].split('/');
          const recordDate = new Date(year, month - 1, day);
          return (
            recordDate.getMonth() === currentMonth &&
            recordDate.getFullYear() === currentYear
          );
        };
        
        const monthRecords = filteredRecords.filter(isFromCurrentMonth);
        console.log('Registros do mês atual:', monthRecords);        

        return res.status(200).json({ monthRecords, allRecords: filteredRecords });
      }

      // Se não for solicitado apenas registros do mês, retornar todos os registros do usuário
      return res.status(200).json({ allRecords: filteredRecords });
    }

    // Caso não seja uma requisição de usuário específico, retornar todos os registros (a partir da linha 2)
    console.log('Todos os registros:', dataWithoutHeader);
    return res.status(200).json({ allRecords: dataWithoutHeader });

  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}