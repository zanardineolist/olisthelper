import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

/**
 * Sincroniza dados de performance dos usuários a partir de uma planilha do Google Sheets
 * @returns {Promise<Object>} Resultado da sincronização
 */
const syncPerformanceData = async () => {
  try {
    console.log('Iniciando sincronização de dados de performance:', new Date().toISOString());
    
    // Verificar se todas as variáveis de ambiente necessárias estão definidas
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }
    
    if (!process.env.PERFORMANCE_SHEET_ID || !process.env.PERFORMANCE_SHEET_CLIENT_EMAIL || !process.env.PERFORMANCE_SHEET_PRIVATE_KEY) {
      throw new Error('Variáveis de ambiente do Google Sheets não configuradas');
    }
    // Configurar cliente do Supabase com role de serviço
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Autenticar com Google Sheets usando as novas variáveis
    const auth = new google.auth.JWT(
      process.env.PERFORMANCE_SHEET_CLIENT_EMAIL,
      null,
      process.env.PERFORMANCE_SHEET_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });

    // Primeiro, verificar se a aba existe
    console.log('Verificando metadados da planilha...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.PERFORMANCE_SHEET_ID,
    });

    const metricasSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === 'Metricas'
    );

    if (!metricasSheet) {
      throw new Error('Aba "Metricas" não encontrada na planilha');
    }

    console.log('Aba "Metricas" encontrada, buscando dados...');
    
    // Buscar dados da planilha
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PERFORMANCE_SHEET_ID,
      range: "'Metricas'!A2:S",
      valueRenderOption: 'FORMATTED_VALUE',
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    console.log(`Encontrados ${rows.length} registros para processar`);

    // Primeiro, buscar todos os usuários do Supabase para mapear emails para user_ids
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('active', true);

    if (usersError) throw usersError;

    const userMap = new Map(users.map(user => [user.email.toLowerCase(), user.id]));
    console.log(`Mapeados ${users.length} usuários ativos`);

    // Processar dados em lotes de 100 registros
    const batchSize = 100;
    let processedCount = 0;
    let successCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(row => {
        const email = (row[0] || '').toLowerCase();
        const userId = userMap.get(email);

        if (!userId || !email) {
          console.log(`Ignorando registro para email ${email} - usuário não encontrado`);
          return null;
        }

        // Função auxiliar para converter tempo
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          const parts = timeStr.toString().split(':');
          if (parts.length >= 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2] ? parts[2].padStart(2, '0') : '00'}`;
          }
          return null;
        };

        // Função auxiliar para converter porcentagem
        const parsePercentage = (value) => {
          if (!value) return 0;
          const str = value.toString().replace(',', '.').replace('%', '');
          return parseFloat(str) || 0;
        };

        // Função auxiliar para converter número
        const parseNumber = (value) => {
          if (!value) return 0;
          const str = value.toString().replace(',', '.');
          return parseFloat(str) || 0;
        };

        return {
          user_id: userId,
          email: email,
          nome: row[1] || '',
          dias_trabalhados: parseInt(row[2]) || 0,
          dias_uteis: parseInt(row[3]) || 0,
          absente_percentage: parsePercentage(row[4]),
          total_chamados: parseInt(row[5]) || 0,
          chamados_media_dia: parseNumber(row[6]),
          chamados_tma: parseNumber(row[7]),
          chamados_csat: parsePercentage(row[8]),
          total_telefone: parseInt(row[9]) || 0,
          telefone_media_dia: parseNumber(row[10]),
          telefone_tma: parseTime(row[11]),
          telefone_csat: parseNumber(row[12]),
          telefone_perdidas: parseInt(row[13]) || 0,
          total_chats: parseInt(row[14]) || 0,
          chat_media_dia: parseNumber(row[15]),
          chat_tma: parseTime(row[16]),
          chat_csat: parseNumber(row[17]),
          atualizado_ate: row[18] || '',
          last_sheets_sync: new Date().toISOString()
        };
      }).filter(Boolean);

      if (batch.length > 0) {
        try {
          const { error: upsertError } = await supabase
            .from('user_performance')
            .upsert(batch, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error('Erro ao atualizar lote:', upsertError);
            throw upsertError;
          }

          successCount += batch.length;
        } catch (error) {
          console.error(`Erro ao processar lote ${i/batchSize + 1}:`, error);
          throw error;
        }
      }

      processedCount += batch.length;
      console.log(`Processados ${processedCount}/${rows.length} registros`);
    }

    console.log(`Sincronização concluída com sucesso. ${successCount} registros atualizados.`);
    return {
      success: true,
      totalProcessed: rows.length,
      successCount: successCount,
      timestamp: new Date().toISOString(),
      message: `Sincronização concluída com sucesso. ${successCount} registros atualizados.`
    };
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido durante a sincronização',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
  }
};

export default syncPerformanceData;