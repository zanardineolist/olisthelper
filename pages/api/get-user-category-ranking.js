import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    console.log('Erro: E-mail do usuário não fornecido ou inválido.');
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o usuário: ${userEmail}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await getSheetMetaData();

    // Filtrar apenas as abas que representam analistas ou usuários "tax" com o formato esperado: "#id - Nome"
    const sheetNames = sheetMeta.data.sheets
      .map(sheet => sheet.properties.title)
      .filter(name => /^#\d+ - .+$/.test(name)); // Apenas abas que começam com "#" seguido por números e um nome

    let rows = [];

    // Iterar sobre as abas filtradas para buscar os dados
    for (const sheetName of sheetNames) {
      const response = await getSheetValues(sheetName, 'A:F');
      rows = rows.concat(response);
    }

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ categories: [] });
    }

    // Filtrar registros do mês atual e do usuário especificado
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false; // Pular cabeçalho
      const [dateStr, , , email, category] = row;
      if (email !== userEmail) return false;

      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Contar categorias
    const categoryCounts = currentMonthRows.reduce((acc, row) => {
      const category = row[4];

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