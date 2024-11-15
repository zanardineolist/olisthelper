// pages/api/get-user-details.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetIdMain = process.env.GOOGLE_SHEET_ID_MAIN;
    const sheetIdPerformance = process.env.GOOGLE_SHEET_ID_PERFORMANCE;

    // Buscar Nome do Usuário e Preferências Usando o E-mail
    const usersRows = await getSheetValues(sheets, sheetIdMain, 'Usuários', 'A:H');
    if (!usersRows || usersRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Encontrar o nome do usuário usando o e-mail e obter preferências
    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const userProfile = userRow[3]?.toLowerCase();

    // Verificar se o perfil do usuário é "support", "analyst" ou "tax"
    if (!['support', 'analyst', 'tax'].includes(userProfile)) {
      return res.status(403).json({ error: 'Usuário não autorizado a visualizar os dados.' });
    }

    const squad = userRow[4];
    const hasChamado = (userProfile === 'support' || userProfile === 'tax') ? userRow[5] === 'TRUE' : true;
    const hasTelefone = userRow[6] === 'TRUE';
    const hasChat = userRow[7] === 'TRUE';

    // Estrutura de retorno dos dados do usuário
    const responsePayload = {
      squad,
      chamado: hasChamado,
      telefone: hasTelefone,
      chat: hasChat,
    };

    // Buscar Dados de Desempenho Usando o E-mail do Usuário
    const performanceRows = await getSheetValues(sheets, sheetIdPerformance, 'Principal', 'A:V');
    if (performanceRows && performanceRows.length > 0) {
      // Encontrar a linha do desempenho usando o e-mail
      const performanceRow = performanceRows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
      if (performanceRow) {
        // Atribuir a data de atualização corretamente
        responsePayload.atualizadoAte = performanceRow[21] && performanceRow[21].trim() !== "" ? performanceRow[21] : "Data não disponível";

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

        if (hasChat) {
          const tma = parseValue(performanceRow[19]);
          const csat = parseValue(performanceRow[20]);

          responsePayload.chat = {
            totalChats: performanceRow[17],
            mediaPorDia: parseValue(performanceRow[18]),
            tma: tma !== null ? formatTime(tma) : "-",
            csat: csat !== null ? csat : "-",
            colors: {
              tma: getColorForValue(tma, 20, false),
              csat: getColorForValue(csat, 95),
            }
          };
        }
      }
    }

    // Buscar Dados de Ajuda Solicitada do Usuário
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const today = new Date();
    const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    // Iterar sobre todas as abas de analistas para obter os registros de ajuda
    for (const sheetName of analystSheetNames) {
      const rows = await getSheetValues(sheets, sheetIdMain, sheetName, 'A:F');

      if (rows.length > 0) {
        // Ignorar o cabeçalho
        rows.shift();

        for (const row of rows) {
          const [dateString, , , email] = row;

          if (email === userEmail) {
            const [day, month, year] = dateString.split('/').map(Number);
            const recordDate = new Date(year, month - 1, day);

            // Verificar se o registro pertence ao mês atual ou ao anterior
            if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
              currentMonthCount++;
            } else if (
              (recordDate.getMonth() === currentMonth - 1 && recordDate.getFullYear() === currentYear) ||
              (currentMonth === 0 && recordDate.getMonth() === 11 && recordDate.getFullYear() === currentYear - 1)
            ) {
              lastMonthCount++;
            }
          }
        }
      }
    }

    responsePayload.helpRequests = {
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter detalhes do usuário:', error);
    return res.status(500).json({ error: 'Erro ao obter os detalhes do usuário. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}

// Funções auxiliares
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
  if (value === null) {
    return "-";
  }
  return `${value}h`;
};

const getColorForValue = (value, threshold, isGreaterBetter = true) => {
  if (value === null || isNaN(value)) {
    return 'var(--box-color3)';
  }
  return (isGreaterBetter ? value >= threshold : value <= threshold) ? '#779E3D' : '#E64E36';
};
