import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // 1. Buscar dados do analista no Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', analystId)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 2. Validar perfil do usuário
    if (!['analyst', 'tax'].includes(userData.role)) {
      return res.status(403).json({ error: 'Perfil não autorizado' });
    }

    // 3. Inicializar Google Sheets
    const sheets = await getAuthenticatedGoogleSheets();

    // 4. Buscar aba do analista
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });

    const sheetName = sheetMeta.data.sheets
      .find(sheet => sheet.properties.title.startsWith(`#${userData.user_id}`))
      ?.properties.title;

    if (!sheetName) {
      console.log(`Erro: Aba não encontrada para o ID '${userData.user_id}'`);
      return res.status(404).json({ error: 'Aba não encontrada para este usuário' });
    }

    // 5. Obter registros da planilha
    const rows = await getSheetValues(sheetName, 'A:F');

    if (!rows || rows.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    // 6. Configurar período atual
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    // 7. Filtrar registros do mês atual
    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false; // Pular cabeçalho

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // 8. Processar categorias
    const categoryCounts = currentMonthRows.reduce((acc, row) => {
      const category = row[4]?.trim(); // Categoria está na coluna E (índice 4)

      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }

      return acc;
    }, {});

    // 9. Ordenar e formatar categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / currentMonthRows.length) * 100)
      }));

    // 10. Preparar resposta
    const response = {
      categories: sortedCategories,
      metadata: {
        totalRecords: currentMonthRows.length,
        periodStart: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
        periodEnd: brtDate.toISOString().split('T')[0],
        uniqueCategories: Object.keys(categoryCounts).length,
        analystInfo: {
          name: userData.name,
          role: userData.role,
          squad: userData.squad || null
        }
      }
    };

    console.log('Ranking de categorias processado com sucesso');
    return res.status(200).json(response);

  } catch (error) {
    console.error('Erro ao processar ranking de categorias:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar ranking de categorias',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}