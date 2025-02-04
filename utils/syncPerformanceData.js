// utils/syncPerformanceData.js
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para converter porcentagem
const parsePercentage = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace('%', '').replace(',', '.')) || 0;
};

// Função auxiliar para converter número com vírgula
const parseDecimal = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(',', '.')) || 0;
};

// Função auxiliar para converter tempo
const parseTime = (value) => {
  if (!value || value === '-') return null;
  return value.toString();
};

// Função auxiliar para converter número
const parseNumber = (value) => {
  if (!value || value === '-') return 0;
  return parseInt(value) || 0;
};

const syncPerformanceData = async () => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Buscar dados da aba Metricas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Metricas!A2:S',
      valueRenderOption: 'FORMATTED_VALUE', // Mantém a formatação original
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    
    if (!response.data.values) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    // Buscar usuários do Supabase
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('active', true);

    if (usersError) throw usersError;

    // Criar mapa de email -> UUID
    const userMap = new Map(users.map(user => [user.email.toLowerCase(), user.id]));

    // Processar em lotes
    const BATCH_SIZE = 50;
    const rows = response.data.values;
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => {
        const email = (row[0] || '').toLowerCase();
        const userId = userMap.get(email);

        if (!userId) {
          console.warn(`Usuário não encontrado para o email: ${email}`);
          return null;
        }

        return {
          user_id: userId,
          email: email,
          nome: row[1] || '',
          dias_trabalhados: parseNumber(row[2]),
          dias_uteis: parseNumber(row[3]),
          absente_percentage: parsePercentage(row[4]),
          total_chamados: parseNumber(row[5]),
          chamados_media_dia: parseDecimal(row[6]),
          chamados_tma: parseDecimal(row[7]),
          chamados_csat: parsePercentage(row[8]),
          total_telefone: parseNumber(row[9]),
          telefone_media_dia: parseDecimal(row[10]),
          telefone_tma: parseTime(row[11]),
          telefone_csat: parseDecimal(row[12]),
          telefone_perdidas: parseNumber(row[13]),
          total_chats: parseNumber(row[14]),
          chat_media_dia: parseDecimal(row[15]),
          chat_tma: parseTime(row[16]),
          chat_csat: parsePercentage(row[17]),
          atualizado_ate: row[18] || null,
          last_sheets_sync: new Date().toISOString()
        };
      });

      // Filtrar registros válidos
      const validRecords = batch.filter(record => record !== null);

      if (validRecords.length > 0) {
        const { error } = await supabase
          .from('user_performance')
          .upsert(validRecords, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Erro ao inserir lote:', error);
          throw error;
        }
      }
    }

    console.log(`Sincronização concluída com sucesso: ${rows.length} registros processados`);
    return true;
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    return false;
  }
};

export default syncPerformanceData;
