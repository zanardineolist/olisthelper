import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const syncPerformanceData = async () => {
  try {
    console.log('Iniciando sincronização de dados de performance...');

    // Validar variáveis de ambiente necessárias
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PERFORMANCE_SHEET_CLIENT_EMAIL',
      'PERFORMANCE_SHEET_PRIVATE_KEY',
      'PERFORMANCE_SHEET_ID'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Variável de ambiente ${envVar} não configurada`);
      }
    }

    // Configurar cliente do Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Autenticar com Google Sheets usando as novas credenciais
    const auth = new google.auth.JWT(
      process.env.PERFORMANCE_SHEET_CLIENT_EMAIL,
      null,
      process.env.PERFORMANCE_SHEET_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('Buscando dados da planilha de performance...');
    
    // Buscar dados da planilha usando o novo ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.PERFORMANCE_SHEET_ID,
      range: 'Metricas!A:W'
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    console.log(`Total de linhas encontradas: ${rows.length - 1}`);

    // Converter e normalizar dados
    const performanceData = rows.slice(1).map((row, index) => {
      try {
        if (!row[0]) {
          console.warn(`Linha ${index + 2} ignorada: email não encontrado`);
          return null;
        }

        return {
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
        };
      } catch (error) {
        console.error(`Erro ao processar linha ${index + 2}:`, error);
        return null;
      }
    }).filter(Boolean);

    console.log(`Dados normalizados: ${performanceData.length} registros válidos`);

    // Atualizar dados no Supabase usando upsert em lotes
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < performanceData.length; i += batchSize) {
      const batch = performanceData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('user_performance')
        .upsert(batch, {
          onConflict: 'email',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Erro no lote ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Lote ${i / batchSize + 1} processado com sucesso`);
      }
    }

    console.log(`Sincronização concluída:
      - Total processado: ${performanceData.length}
      - Sucessos: ${successCount}
      - Erros: ${errorCount}
    `);

    return true;
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    return false;
  }
};

// Função auxiliar para converter tempo em formato HH:mm:ss para intervalo PostgreSQL
const convertTimeToInterval = (timeStr) => {
  try {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    const parts = timeStr.trim().split(':');
    if (parts.length !== 3) return null;

    const [hours, minutes, seconds] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Erro ao converter tempo:', error);
    return null;
  }
};

export default syncPerformanceData;
