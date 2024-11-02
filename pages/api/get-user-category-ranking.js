import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    console.log('Erro: E-mail do usuário não fornecido ou inválido.');
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      return res.status(500).json({ error: 'Erro ao autenticar com Google Sheets. Verifique as credenciais.' });
    }
    const sheetId = process.env.SHEET_ID;

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o usuário: ${userEmail}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await getSheetMetaData();
    if (!sheetMeta || !sheetMeta.length) {
      return res.status(500).json({ error: 'Nenhuma aba encontrada na planilha. Verifique o Google Sheets.' });
    }

    // Iterar sobre todas as abas da planilha, pois queremos buscar os dados para todos os analistas
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let rows = [];

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
