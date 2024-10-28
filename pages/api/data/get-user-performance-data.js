import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório.' });
  }

  try {
    // Autenticar e obter os valores da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID_PERFORMANCE;

    // Obter dados da planilha de desempenho
    const rows = await getSheetValues(sheets, sheetId, 'Desempenho', 'A:U');

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
    }

    // Procurar pelo usuário usando o e-mail diretamente
    const userRow = rows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado na planilha de desempenho.' });
    }

    // Estruturar os dados de retorno
    const responsePayload = {
      email: userEmail,
      desempenho: {
        nome: userRow[1],
        squad: userRow[4],
        tma: formatValue(userRow[9]),
        csat: formatValue(userRow[10]),
        chamados: {
          total: userRow[7],
          mediaPorDia: formatValue(userRow[8]),
          corMediaPorDia: getColorForValue(parseValue(userRow[8]), 25),
        },
        telefone: {
          total: userRow[11],
          tma: formatTime(parseValue(userRow[13])),
          csat: formatValue(userRow[14]),
          perdidas: parseValue(userRow[15]),
        },
        chat: {
          total: userRow[16],
          tma: formatTime(parseValue(userRow[18])),
          csat: formatValue(userRow[19]),
        },
      },
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho do usuário:', error);
    res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}

// Função para converter valores
function parseValue(value) {
  if (typeof value === 'string') {
    if (value.includes('%')) {
      return parseFloat(value.replace('%', '').replace(',', '.'));
    } else if (value.includes(':')) {
      const parts = value.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    } else if (value === "-") {
      return null;
    }
    return parseFloat(value.replace(',', '.'));
  }
  return value;
}

// Função para formatar valores para exibição
function formatValue(value) {
  return value !== null ? value : "-";
}

// Função para formatar valores de tempo (em minutos)
function formatTime(minutes) {
  if (minutes === null) {
    return "-";
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Função para definir a cor de acordo com o valor e o limite
function getColorForValue(value, threshold, isGreaterBetter = true) {
  if (value === null) {
    return null;
  }
  return (isGreaterBetter ? value >= threshold : value <= threshold) ? '#779E3D' : '#E64E36';
}
