import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { type, userEmail, analystId, filter } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'O tipo de solicitação é obrigatório' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    let rows = [];
    let responsePayload = {};

    switch (type) {
      case 'analyst-records':
        if (!analystId) {
          return res.status(400).json({ error: 'ID do analista é obrigatório' });
        }

        // Obter a aba do analista
        const analystSheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;
        if (!analystSheetName) {
          return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
        }

        rows = await getSheetValues(analystSheetName, 'A:F');
        // Filtrar registros conforme o período especificado
        if (filter) {
          const currentDate = new Date();
          const filteredRows = rows.filter((row, index) => {
            if (index === 0) return false; // Pular cabeçalho
            const [dateStr] = row;
            const [day, month, year] = dateStr.split('/').map(Number);
            const date = new Date(year, month - 1, day);
            const timeDiff = (currentDate - date) / (1000 * 60 * 60 * 24);

            if (filter === '1') return timeDiff < 1;
            if (filter === '7') return timeDiff <= 7;
            if (filter === '30') return timeDiff <= 30;

            return true;
          });

          responsePayload = { count: filteredRows.length, rows: filteredRows };
        } else {
          responsePayload = { count: rows.length, rows };
        }
        break;

      case 'category-ranking':
        if (!analystId) {
          return res.status(400).json({ error: 'ID do analista é obrigatório' });
        }

        // Obter a aba do analista
        const categorySheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;
        if (!categorySheetName) {
          return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
        }

        rows = await getSheetValues(categorySheetName, 'A:F');
        // Processar o ranking de categorias
        const categoryCounts = rows.reduce((acc, row) => {
          const category = row[4];
          if (category) {
            acc[category] = (acc[category] || 0) + 1;
          }
          return acc;
        }, {});

        responsePayload = { categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })) };
        break;

      case 'user-help-requests':
        if (!userEmail) {
          return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
        }

        // Obter todas as abas dos analistas
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
          const sheetRows = await getSheetValues(sheetName, 'A:F');

          if (sheetRows.length > 0) {
            // Ignorar o cabeçalho
            sheetRows.shift();

            for (const row of sheetRows) {
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

        responsePayload = {
          currentMonth: currentMonthCount,
          lastMonth: lastMonthCount,
        };
        break;

      case 'user-performance':
        if (!userEmail) {
          return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
        }

        // Buscar o desempenho do usuário específico
        try {
          rows = await getSheetValues('Principal', 'A:V');
        } catch (error) {
          return res.status(400).json({ error: `Erro ao obter valores da aba 'Principal'. Detalhes: ${error.message}` });
        }

        const userRow = rows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
        if (!userRow) {
          return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado para o e-mail fornecido.' });
        }

        responsePayload = {
          squad: userRow[4],
          chamado: userRow[5] === 'TRUE',
          telefone: userRow[6] === 'TRUE',
          chat: userRow[7] === 'TRUE',
          chamados: userRow[8] ? { totalChamados: userRow[8] } : null,
          telefone: userRow[12] ? { totalTelefone: userRow[12] } : null,
          chat: userRow[17] ? { totalChats: userRow[17] } : null,
          atualizadoAte: userRow[21] || "Data não disponível",
        };
        break;

      case 'analyst-leaderboard':
        if (!analystId) {
          return res.status(400).json({ error: 'ID do analista é obrigatório' });
        }

        // Obter a aba do analista
        const leaderboardSheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

        if (!leaderboardSheetName) {
          return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
        }

        rows = await getSheetValues(leaderboardSheetName, 'A:F');

        // Filtrar todos os registros do mês atual para o leaderboard
        const currentDate = new Date();
        const brtDateLeaderboard = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const currentMonthLeaderboard = brtDateLeaderboard.getMonth();
        const currentYearLeaderboard = brtDateLeaderboard.getFullYear();

        const leaderboardRows = rows.filter((row, index) => {
          if (index === 0) return false; // Pular cabeçalho

          const [dateStr] = row;
          const [day, month, year] = dateStr.split('/').map(Number);
          const date = new Date(year, month - 1, day);

          return date.getMonth() === currentMonthLeaderboard && date.getFullYear() === currentYearLeaderboard;
        });

        responsePayload = { rows: leaderboardRows };
        break;

      default:
        return res.status(400).json({ error: 'Tipo de solicitação inválido' });
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
}