import { google } from 'googleapis';
import { supabase } from '../../utils/supabaseClient';

/**
 * Autentica com a API do Google Sheets
 */
async function getAuthenticatedGoogleSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

/**
 * Busca valores de uma aba específica do Google Sheets
 */
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

/**
 * Função para interpretar valores com porcentagem, tempo ou vazios
 */
const parseValue = (value) => {
  if (typeof value === 'string') {
    if (value.includes('%')) {
      return parseFloat(value.replace('%', '').replace(',', '.'));
    } else if (value.includes(':')) {
      const parts = value.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    } else if (value === "-") {
      return 0;
    }
    return parseFloat(value.replace(',', '.'));
  }
  return value || 0;
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
  return value !== null ? `${value}h` : "-";
};

const getColorForValue = (value, threshold, isGreaterBetter = true) => {
  if (value === null || isNaN(value)) {
    return 'var(--box-color3)';
  }
  return (isGreaterBetter ? value >= threshold : value <= threshold) ? '#779E3D' : '#E64E36';
};

/**
 * Handler principal da API
 */
export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Validação do usuário pelo Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Autenticação com o Google Sheets API
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetIdUsuarios = process.env.SHEET_ID_USUARIOS;
    const sheetIdDesempenho = process.env.SHEET_ID_DESEMPENHO;

    // Buscar informações do usuário
    const usersRows = await getSheetValues(sheets, sheetIdUsuarios, 'Usuários', 'A:H');
    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());

    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const userProfile = userRow[3]?.toLowerCase();
    if (!['support', 'support+', 'analyst', 'tax'].includes(userProfile)) {
      return res.status(403).json({ error: 'Usuário não autorizado a visualizar os dados de desempenho.' });
    }

    const squad = userRow[4];
    const hasChamado = ['support', 'support+', 'tax'].includes(userProfile) ? userRow[5] === 'TRUE' : true;
    const hasTelefone = userRow[6] === 'TRUE';
    const hasChat = userRow[7] === 'TRUE';

    const responsePayload = { squad, chamado: hasChamado, telefone: hasTelefone, chat: hasChat };

    // Buscar dados de desempenho
    const performanceRows = await getSheetValues(sheets, sheetIdDesempenho, 'Principal', 'A:V');
    const performanceRow = performanceRows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());

    if (!performanceRow) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
    }

    responsePayload.atualizadoAte = performanceRow[21] || "Data não disponível";

    // Chamados
    if (hasChamado) {
      const mediaPorDia = parseValue(performanceRow[9]);
      const tma = parseValue(performanceRow[10]);
      const csat = parseValue(performanceRow[11]);

      responsePayload.chamados = {
        totalChamados: performanceRow[8],
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

    // Telefone
    if (hasTelefone) {
      const tma = parseValue(performanceRow[14]);
      const csat = parseValue(performanceRow[15]);

      responsePayload.telefone = {
        totalTelefone: performanceRow[12],
        mediaPorDia: parseValue(performanceRow[13]),
        tma: formatTime(tma),
        csat,
        perdidas: parseValue(performanceRow[16]),
        colors: {
          tma: getColorForValue(tma, 15, false),
          csat: getColorForValue(csat, 3.7),
        }
      };
    }

    // Chat
    if (hasChat) {
      const tma = parseValue(performanceRow[19]);
      const csat = parseValue(performanceRow[20]);

      responsePayload.chat = {
        totalChats: performanceRow[17],
        mediaPorDia: parseValue(performanceRow[18]),
        tma: formatTime(tma),
        csat,
        colors: {
          tma: getColorForValue(tma, 20, false),
          csat: getColorForValue(csat, 95),
        }
      };
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}
