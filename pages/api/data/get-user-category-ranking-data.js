import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail, dateRange } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório.' });
  }

  try {
    // Autenticar e obter metadados da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    
    // Obter nomes das abas (cada aba representa um analista)
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let rows = [];

    // Obter registros de todas as abas de analistas
    for (const sheetName of sheetNames) {
      const response = await getSheetValues(sheetName, 'A:F');
      if (response && response.length > 0) {
        rows = rows.concat(response);
      }
    }

    // Filtrar registros do mês atual ou conforme o `dateRange` fornecido
    const filteredRows = filterRowsByEmailAndDate(rows, userEmail, dateRange);

    // Contar categorias
    const categoryCounts = countCategories(filteredRows);

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}

// Função para filtrar registros pelo e-mail e intervalo de datas
function filterRowsByEmailAndDate(rows, userEmail, dateRange) {
  const currentDate = new Date();
  const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentMonth = brtDate.getMonth();
  const currentYear = brtDate.getFullYear();

  return rows.filter((row, index) => {
    if (index === 0) return false; // Ignorar cabeçalho
    const [dateStr, , , email, category] = row;

    if (email.toLowerCase() !== userEmail.toLowerCase()) return false;

    // Filtrar por `dateRange` se fornecido, caso contrário filtrar pelo mês atual
    if (dateRange) {
      const [start, end] = dateRange.split('|');
      const startDate = new Date(start);
      const endDate = new Date(end);
      const [day, month, year] = dateStr.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);

      return recordDate >= startDate && recordDate <= endDate;
    } else {
      const [day, month, year] = dateStr.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    }
  });
}

// Função para contar categorias
function countCategories(rows) {
  return rows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});
}
