import { google } from 'googleapis';
import { findBestMatch } from 'string-similarity';

async function getAuthenticatedGoogleSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

async function getSheetValues(sheets, spreadsheetId, sheetName, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter valores da aba ${sheetName}.`);
  }
}

const parseValue = (value) => {
  if (typeof value === 'string') {
    if (value.includes('%')) {
      return parseFloat(value.replace('%', '').replace(',', '.'));
    } else if (value.includes(':')) {
      // Convert time in hh:mm:ss format to total minutes
      const parts = value.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    } else if (value === "-") {
      return null;
    }
    return parseFloat(value.replace(',', '.'));
  }
  return value;
};

const formatTime = (minutes) => {
  if (minutes === null) {
    return "-";
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatHours = (value) => {
  if (value === null) {
    return "-";
  }
  return `${value}h`;
};

const getColorForValue = (value, threshold, isGreaterBetter = true) => {
  if (value === null) {
    return null; // Sem cor se o valor for nulo
  }
  return (isGreaterBetter ? value >= threshold : value <= threshold) ? '#779E3D' : '#E64E36';
};

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Autenticação com o Google Sheets API
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetIdUsuarios = "1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34"; // ID da planilha de usuários
    const sheetIdDesempenho = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI"; // ID da planilha de desempenho

    // Buscar Nome do Usuário e Preferências Usando o E-mail
    const usersRows = await getSheetValues(sheets, sheetIdUsuarios, 'Usuários', 'A:H');
    if (!usersRows || usersRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Encontrar o nome do usuário usando o e-mail e obter preferências
    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const userName = userRow[1].trim().toLowerCase();
    const userProfile = userRow[3]?.toLowerCase();

    // Verificar se o perfil do usuário é "user"
    if (userProfile !== 'support') {
      return res.status(403).json({ error: 'Usuário não autorizado a visualizar os dados de desempenho.' });
    }

    const squad = userRow[4];
    const hasChamado = userRow[5] === 'TRUE';
    const hasTelefone = userRow[6] === 'TRUE';
    const hasChat = userRow[7] === 'TRUE';

    // Buscar Dados de Desempenho Usando o Nome do Usuário
    const performanceRows = await getSheetValues(sheets, sheetIdDesempenho, 'Principal', 'A:U');
    if (!performanceRows || performanceRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
    }

    const performanceNames = performanceRows.map(row => row[3] ? row[3].trim().toLowerCase() : '');
    const matchResult = findBestMatch(userName, performanceNames);
    const bestMatchIndex = matchResult.bestMatchIndex;
    const bestMatchRating = matchResult.bestMatch.rating;

    if (bestMatchRating < 0.7) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado com correspondência suficiente.' });
    }

    const performanceData = performanceRows[bestMatchIndex];

    // Estrutura de retorno dos dados de desempenho
    const responsePayload = {
      squad,
      chamado: hasChamado,
      telefone: hasTelefone,
      chat: hasChat,
    };

    if (hasChamado) {
      const mediaPorDia = parseValue(performanceData[8]);
      const tma = parseValue(performanceData[9]);
      const csat = parseValue(performanceData[10]);

      responsePayload.chamados = {
        totalChamados: performanceData[7],
        mediaPorDia,
        tma: formatHours(tma),
        csat,
        colors: {
          mediaPorDia: getColorForValue(mediaPorDia, 25),
          tma: getColorForValue(tma, 30, false),
          csat: getColorForValue(csat, 95),
        }
      };
    }

    if (hasTelefone) {
      const tma = parseValue(performanceData[13]);
      const csat = parseValue(performanceData[14]);

      responsePayload.telefone = {
        totalTelefone: performanceData[11],
        mediaPorDia: parseValue(performanceData[12]),
        tma: formatTime(tma),
        csat,
        perdidas: parseValue(performanceData[15]),
        colors: {
          tma: getColorForValue(tma, 15, false),
          csat: getColorForValue(csat, 3.7),
        }
      };
    }

    if (hasChat) {
      const tma = parseValue(performanceData[18]);
      const csat = parseValue(performanceData[19]);

      responsePayload.chat = {
        totalChats: performanceData[16],
        mediaPorDia: parseValue(performanceData[17]),
        tma: tma !== null ? formatTime(tma) : "-",
        csat: csat !== null ? csat : "-",
        colors: {
          tma: getColorForValue(tma, 20, false),
          csat: getColorForValue(csat, 95),
        }
      };
    }

    responsePayload.atualizadoAte = performanceData[20] || "Data não disponível";

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}