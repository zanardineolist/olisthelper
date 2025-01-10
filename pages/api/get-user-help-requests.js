import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // 1. Buscar dados do usuário no Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 2. Inicializar Google Sheets
    const sheets = await getAuthenticatedGoogleSheets();

    // 3. Obter metadados das abas
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });

    // 4. Filtrar abas de analistas (formato #ID - Nome)
    const analystSheets = sheetMeta.data.sheets
      .filter(sheet => /^#\d+/.test(sheet.properties.title))
      .map(sheet => sheet.properties.title);

    // 5. Inicializar contadores
    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // 6. Configurar datas para filtro
    const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const brtDate = new Date(today);
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // 7. Processar cada aba
    for (const sheetName of analystSheets) {
      try {
        const rows = await getSheetValues(sheetName, 'A:F');
        if (!rows || rows.length <= 1) continue; // Pular se vazio ou só tem cabeçalho

        // Processar registros da aba atual
        for (const row of rows.slice(1)) { // Ignorar cabeçalho
          const [dateStr, , , email] = row;
          
          if (email === userEmail) {
            const [day, month, year] = dateStr.split('/').map(Number);
            const recordDate = new Date(year, month - 1, day);

            // Classificar por mês
            if (recordDate.getMonth() === currentMonth && 
                recordDate.getFullYear() === currentYear) {
              currentMonthCount++;
            } else if (recordDate.getMonth() === lastMonth && 
                      recordDate.getFullYear() === lastMonthYear) {
              lastMonthCount++;
            }
          }
        }
      } catch (sheetError) {
        console.error(`Erro ao processar aba ${sheetName}:`, sheetError);
        // Continuar processando outras abas mesmo se uma falhar
      }
    }

    // 8. Calcular porcentagem de variação
    let percentageChange = 0;
    if (lastMonthCount > 0) {
      percentageChange = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    }

    // 9. Retornar resposta formatada
    return res.status(200).json({
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
      percentageChange: Math.round(percentageChange * 10) / 10, // Arredondar para 1 decimal
      userData: {
        name: userData.name,
        role: userData.role,
        squad: userData.squad || null
      },
      metadata: {
        periodStart: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
        periodEnd: brtDate.toISOString().split('T')[0],
        timezone: 'America/Sao_Paulo'
      }
    });

  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar solicitação',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}