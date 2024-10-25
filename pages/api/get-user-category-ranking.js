import { google } from 'googleapis';

let cache = {
  timestamp: null,
  data: null,
};

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    console.log('Erro: E-mail do usuário não fornecido ou inválido.');
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache

  // Verificar se os dados em cache ainda são válidos
  const currentTime = Date.now();
  if (cache.timestamp && currentTime - cache.timestamp < CACHE_DURATION && cache.data) {
    console.log('Servindo dados do cache.');
    return res.status(200).json(cache.data);
  }

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o usuário: ${userEmail}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Iterar sobre todas as abas da planilha, pois queremos buscar os dados para todos os analistas
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let rows = [];

    // Executar as requisições de forma paralela para obter os dados de todas as abas
    const requests = sheetNames.map(async (sheetName) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${sheetName}!A:F`,
        });
        return response.data.values || [];
      } catch (error) {
        console.error(`Erro ao buscar dados da aba ${sheetName}:`, error);
        return []; // Retornar array vazio caso haja erro na requisição da aba
      }
    });

    // Aguardar todas as requisições completarem
    const results = await Promise.all(requests);
    results.forEach(sheetRows => {
      rows = rows.concat(sheetRows);
    });

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

      // Garantir que o formato da linha está correto
      if (!row || row.length < 5) return false;

      const [dateStr, , , email, category] = row;
      if (!dateStr || !email || !category) return false; // Validar se todos os campos necessários estão presentes

      if (email.toLowerCase() !== userEmail.toLowerCase()) return false;

      const [day, month, year] = dateStr.split('/').map(Number);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return false; // Validar se a data é válida

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

    // Atualizar o cache apenas se tivermos dados válidos
    if (sortedCategories.length > 0) {
      cache = {
        timestamp: Date.now(),
        data: { categories: sortedCategories },
      };
    }

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}