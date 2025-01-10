import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

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
      console.error('Erro ao buscar dados do usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 2. Inicializar Google Sheets
    const sheets = await getAuthenticatedGoogleSheets();

    // 3. Buscar a aba correspondente
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

    console.log(`Aba localizada: ${sheetName}`);

    // 4. Buscar dados da planilha
    const rows = await getSheetValues(sheetName, 'A:F');

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ count: 0, rows: [] });
    }

    // 5. Processar dados baseado no modo
    if (mode === 'profile') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      let currentMonthCount = 0;
      let lastMonthCount = 0;

      rows.forEach((row, index) => {
        if (index === 0) return; // Pular cabeçalho

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        
        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      });

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows,
      });
    }

    // 6. Processamento padrão com filtro
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);

    const filteredRows = rows.filter((row, index) => {
      if (index === 0) return false;

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      const diffTime = currentDate - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= (filter ? parseInt(filter, 10) : 30);
    });

    if (!filteredRows || filteredRows.length === 0) {
      console.log('Nenhum registro encontrado após o filtro.');
      return res.status(200).json({ 
        count: 0, 
        dates: [], 
        counts: [], 
        rows: [] 
      });
    }

    // 7. Preparar resposta
    const count = filteredRows.length;
    const dates = filteredRows.map((row) => row[0]);
    const countsObj = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    console.log(`Total de registros após o filtro: ${count}`);

    return res.status(200).json({
      count,
      dates: Object.keys(countsObj),
      counts: Object.values(countsObj),
      rows: filteredRows,
    });

  } catch (error) {
    console.error('Erro ao obter registros:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter registros.',
      details: error.message 
    });
  }
}