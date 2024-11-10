import { getSheetMetaData, getSheetValues } from '../../utils/batchSheetUtils';

export default async function handler(req, res) {
  const { userEmail, mode } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  try {
    // Obter metadados da planilha
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    if (mode === 'performance') {
      // Modo desempenho do usuário
      const sheets = await getAuthenticatedGoogleSheets();
      const sheetIdUsuarios = "1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34";
      const sheetIdDesempenho = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI";

      // Buscar Nome do Usuário e Preferências Usando o E-mail
      const usersRows = await getSheetValues(sheets, sheetIdUsuarios, 'Usuários', 'A:H');
      if (!usersRows || usersRows.length === 0) {
        return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
      }

      const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
      if (!userRow) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const userProfile = userRow[3]?.toLowerCase();

      // Verificar se o perfil do usuário é "support"
      if (userProfile !== 'support') {
        return res.status(403).json({ error: 'Usuário não autorizado a visualizar os dados de desempenho.' });
      }

      const squad = userRow[4];
      const hasChamado = userRow[5] === 'TRUE';
      const hasTelefone = userRow[6] === 'TRUE';
      const hasChat = userRow[7] === 'TRUE';

      // Buscar Dados de Desempenho Usando o E-mail do Usuário
      const performanceRows = await getSheetValues(sheets, sheetIdDesempenho, 'Principal', 'A:V');
      if (!performanceRows || performanceRows.length === 0) {
        return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
      }

      const performanceRow = performanceRows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
      if (!performanceRow) {
        return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado para o e-mail fornecido.' });
      }

      // Estrutura de retorno dos dados de desempenho
      const responsePayload = {
        squad,
        chamado: hasChamado,
        telefone: hasTelefone,
        chat: hasChat,
      };

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

      responsePayload.atualizadoAte = performanceRow[21] || "Data não disponível";

      return res.status(200).json(responsePayload);
    } else if (mode === 'category-ranking') {
      // Modo ranking de categorias
      let rows = [];
      for (const sheetName of sheetNames) {
        const response = await getSheetValues(sheetName, 'A:F');
        rows = rows.concat(response);
      }

      if (!rows || rows.length === 0) {
        return res.status(200).json({ categories: [] });
      }

      const currentMonthRows = rows.filter((row, index) => {
        if (index === 0) return false;
        const [dateStr, , , email, category] = row;
        if (email !== userEmail) return false;

        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      const categoryCounts = currentMonthRows.reduce((acc, row) => {
        const category = row[4];

        if (category) {
          acc[category] = (acc[category] || 0) + 1;
        }

        return acc;
      }, {});

      const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      return res.status(200).json({ categories: sortedCategories });
    } else if (mode === 'help-requests') {
      // Modo pedidos de ajuda do usuário
      for (const sheetName of analystSheetNames) {
        const rows = await getSheetValues(sheetName, 'A:F');

        if (rows.length > 0) {
          rows.shift(); // Ignorar cabeçalho

          for (const row of rows) {
            const [dateString, , , email] = row;

            if (email === userEmail) {
              const [day, month, year] = dateString.split('/').map(Number);
              const recordDate = new Date(year, month - 1, day);

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

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
      });
    } else {
      return res.status(400).json({ error: 'Modo inválido. Modos suportados: performance, category-ranking, help-requests.' });
    }
  } catch (error) {
    console.error('Erro ao processar dados do usuário:', error);
    return res.status(500).json({ error: 'Erro ao processar dados do usuário.' });
  }
}
