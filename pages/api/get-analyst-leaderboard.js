import { getAnalystRecords } from '../../utils/getAnalystSheetDetails';

export default async function handler(req, res) {
  const { analystId } = req.query;

  // Validação do ID do analista
  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Obter registros do analista
    const records = await getAnalystRecords(analystId);

    // Filtrar registros do mês atual para o leaderboard
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const leaderboardRows = records.filter((record) => {
      const [day, month, year] = record.date.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);

      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    console.log(`Total de registros para o leaderboard: ${leaderboardRows.length}`);
    return res.status(200).json({ rows: leaderboardRows });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
