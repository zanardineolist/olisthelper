import { getAnalystRecords } from '../../utils/getAnalystSheetDetails';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Obtém todos os registros do analista usando a função centralizada
    const records = await getAnalystRecords(analystId);

    if (!records || records.length === 0) {
      console.log('Nenhum registro encontrado para o analista especificado.');
      return res.status(200).json({ categories: [] });
    }

    console.log(`Total de registros encontrados para o analista: ${records.length}`);

    // Filtrar todos os registros do mês atual para o ranking das categorias
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRecords = records.filter((record) => {
      const [day, month, year] = record.date.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);

      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    // Contar categorias
    const categoryCounts = currentMonthRecords.reduce((acc, record) => {
      const category = record.topic;

      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }

      return acc;
    }, {});

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    console.log('Categorias no ranking:', sortedCategories);

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}
