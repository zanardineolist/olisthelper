import { getSheetMetaData, getSheetValues, addUserToSheetIfNotExists } from '../../utils/batchSheetUtils';

export default async function handler(req, res) {
  const { userEmail, mode } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  try {
    // Obter dados do usuário
    const usersRows = await getSheetValues('Usuários', 'A:H');
    if (!usersRows || usersRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const userProfile = userRow[3]?.toLowerCase();
    const userId = userRow[0];
    const squad = userRow[4];
    const hasChamado = userRow[5] === 'TRUE';
    const hasTelefone = userRow[6] === 'TRUE';
    const hasChat = userRow[7] === 'TRUE';

    // Dividir lógicas por perfil do usuário
    if (userProfile === 'support') {
      // Lógica específica para o perfil 'support'
      if (mode === 'performance') {
        const sheets = await getAuthenticatedGoogleSheets();
        const sheetIdDesempenho = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI";
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
          atualizadoAte: performanceRow[21] || "Data não disponível"
        };

        // Adicionar dados de desempenho específicos com base nos privilégios do usuário
        if (hasChamado) {
          responsePayload.chamados = {
            totalChamados: performanceRow[8],
            mediaPorDia: parseValue(performanceRow[9]),
            tma: formatHours(parseValue(performanceRow[10])),
            csat: parseValue(performanceRow[11]),
            colors: {
              mediaPorDia: getColorForValue(parseValue(performanceRow[9]), 25),
              tma: getColorForValue(parseValue(performanceRow[10]), 30, false),
              csat: getColorForValue(parseValue(performanceRow[11]), 95),
            }
          };
        }

        if (hasTelefone) {
          responsePayload.telefone = {
            totalTelefone: performanceRow[12],
            mediaPorDia: parseValue(performanceRow[13]),
            tma: formatTime(parseValue(performanceRow[14])),
            csat: parseValue(performanceRow[15]),
            perdidas: parseValue(performanceRow[16]),
            colors: {
              tma: getColorForValue(parseValue(performanceRow[14]), 15, false),
              csat: getColorForValue(parseValue(performanceRow[15]), 3.7),
            }
          };
        }

        if (hasChat) {
          responsePayload.chat = {
            totalChats: performanceRow[17],
            mediaPorDia: parseValue(performanceRow[18]),
            tma: parseValue(performanceRow[19]) !== null ? formatTime(parseValue(performanceRow[19])) : "-",
            csat: parseValue(performanceRow[20]) !== null ? parseValue(performanceRow[20]) : "-",
            colors: {
              tma: getColorForValue(parseValue(performanceRow[19]), 20, false),
              csat: getColorForValue(parseValue(performanceRow[20]), 95),
            }
          };
        }

        return res.status(200).json(responsePayload);
      }

    } else if (userProfile === 'analyst' || userProfile === 'tax') {
      // Lógica para 'analyst' e 'tax'
      const sheetMeta = await getSheetMetaData();
      const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);
      const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

      const currentDate = new Date();
      const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentMonth = brtDate.getMonth();
      const currentYear = brtDate.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      if (mode === 'help-requests') {
        // Modo pedidos de ajuda para analistas
        let currentMonthCount = 0;
        let lastMonthCount = 0;

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
                } else if (recordDate.getMonth() === lastMonth && recordDate.getFullYear() === lastMonthYear) {
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
      } else if (mode === 'category-ranking') {
        // Modo ranking de categorias para analistas
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
      }
    } else {
      // Caso o perfil seja desconhecido ou o modo não seja permitido
      return res.status(403).json({ error: 'Perfil do usuário inválido ou modo não permitido.' });
    }
  } catch (error) {
    console.error('Erro ao processar dados do usuário:', error);
    return res.status(500).json({ error: 'Erro ao processar dados do usuário.' });
  }
}
