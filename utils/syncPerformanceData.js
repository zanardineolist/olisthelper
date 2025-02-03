import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const syncPerformanceData = async () => {
  try {
    // Configurar cliente do Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Autenticar com Google Sheets
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Buscar dados da planilha
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Principal!A:W'
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    // Converter e normalizar dados
    const performanceData = rows.slice(1).map(row => ({
      email: row[0]?.toLowerCase(),
      dias_trabalhados: parseInt(row[5]) || 0,
      dias_uteis: parseInt(row[6]) || 0,
      absente_percentage: parseFloat(row[7]?.replace('%', '')) || 0,
      total_chamados: parseInt(row[8]) || 0,
      chamados_media_dia: parseFloat(row[9]) || 0,
      chamados_tma: row[10] ? convertTimeToInterval(row[10]) : null,
      chamados_csat: parseFloat(row[11]) || 0,
      total_telefone: parseInt(row[12]) || 0,
      telefone_media_dia: parseFloat(row[13]) || 0,
      telefone_tma: row[14] ? convertTimeToInterval(row[14]) : null,
      telefone_csat: parseFloat(row[15]) || 0,
      telefone_perdidas: parseInt(row[16]) || 0,
      total_chats: parseInt(row[17]) || 0,
      chat_media_dia: parseFloat(row[18]) || 0,
      chat_tma: row[19] ? convertTimeToInterval(row[19]) : null,
      chat_csat: parseFloat(row[20]) || 0,
      rfc: parseInt(row[23]) || 0,
      last_sheets_sync: new Date().toISOString()
    }));

    // Atualizar dados no Supabase usando upsert
    for (const data of performanceData) {
      if (!data.email) continue;

      const { error } = await supabase
        .from('user_performance')
        .upsert({
          ...data
        }, {
          onConflict: 'email',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Erro ao atualizar dados para ${data.email}:`, error);
      }
    }

    console.log(`Sincronização concluída: ${performanceData.length} registros processados`);
    return true;
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    return false;
  }
};

// Função auxiliar para converter tempo em formato HH:mm:ss para intervalo PostgreSQL
const convertTimeToInterval = (timeStr) => {
  try {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return null;
  }
};

export default syncPerformanceData;