import { getSheetValues, getSheetMetaData } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId, infoType } = req.query;

  if (!analystId || !infoType) {
    return res.status(400).json({ error: 'Parâmetros analystId e infoType são obrigatórios.' });
  }

  const sheetId = process.env.SHEET_ID; // Certifique-se de que o valor de SHEET_ID está definido corretamente no arquivo de ambiente.
  const sheetTab = `#${analystId}`; // Usando o numeral do analista conforme estrutura da planilha

  try {
    // Buscar metadados da planilha para confirmar se a aba existe
    const metaData = await getSheetMetaData(sheetId);
    if (!metaData.sheets) {
      console.error('Erro ao buscar metadados: sheets não encontrado.');
      return res.status(404).json({ error: 'Metadados da planilha não encontrados.' });
    }

    const sheetExists = metaData.sheets.some(sheet => sheet.properties.title === sheetTab);
    if (!sheetExists) {
      return res.status(404).json({ error: `Aba para o analista com ID ${analystId} não encontrada.` });
    }

    const range = `'${sheetTab}'!A:Z`; // Ajustar o range conforme necessário
    const data = await getSheetValues(sheetId, range);

    if (!data || data.length === 0) {
      return res.status(200).json({ data: [] });
    }

    let result;
    switch (infoType) {
      case 'helpRequests':
        result = processHelpRequests(data);
        break;
      case 'categoryRanking':
        result = processCategoryRanking(data);
        break;
      case 'performance':
        result = processPerformanceData(data, req.query.userEmail);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de informação inválido.' });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da planilha.' });
  }
}

// Função para processar dados de ajudas solicitadas
function processHelpRequests(data) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  data.forEach((row, index) => {
    if (index === 0) return; // Ignorar o cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);

    if (year === currentYear && month === currentMonth) {
      currentMonthCount++;
    } else if (year === lastMonthYear && month === lastMonth) {
      lastMonthCount++;
    }
  });

  return {
    currentMonth: currentMonthCount,
    lastMonth: lastMonthCount,
  };
}

// Função para processar o ranking de categorias
function processCategoryRanking(data) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();

  const currentMonthRows = data.filter((row, index) => {
    if (index === 0) return false; // Ignorar o cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  // Contar categorias
  const categoryCounts = currentMonthRows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});

  // Transformar em array de objetos para exibição
  return {
    categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
  };
}

// Função para processar os dados de desempenho
function processPerformanceData(data, userEmail) {
  const userRows = data.filter((row) => row[2] === userEmail);

  if (userRows.length === 0) {
    return { error: 'Dados de desempenho não encontrados para o usuário.' };
  }

  // Implementação simplificada para representar dados de desempenho do usuário
  let totalChamados = 0;
  let totalTelefone = 0;
  let totalChats = 0;

  userRows.forEach((row) => {
    const [dateStr, tipo] = row;

    switch (tipo) {
      case 'Chamado':
        totalChamados++;
        break;

      case 'Telefone':
        totalTelefone++;
        break;

      case 'Chat':
        totalChats++;
        break;

      default:
        break;
    }
  });

  return {
    chamados: totalChamados,
    telefone: totalTelefone,
    chat: totalChats,
  };
}
