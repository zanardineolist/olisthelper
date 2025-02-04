import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const syncPerformanceData = async () => {
  try {
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

    // Autenticar com Google Sheets
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Buscar dados da planilha
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Metricas!A2:S', // Ajustado para a nova aba e colunas
      valueRenderOption: 'UNFORMATTED_VALUE', // Retorna valores brutos sem formatação
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    // Primeiro, buscar todos os usuários do Supabase para mapear emails para user_ids
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('active', true);

    if (usersError) throw usersError;

    const userMap = new Map(users.map(user => [user.email.toLowerCase(), user.id]));

    // Processar dados em lotes de 100 registros
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(row => {
        const email = (row[0] || '').toLowerCase();
        const userId = userMap.get(email);

        if (!userId || !email) return null;

        return {
          user_id: userId,
          email: email,
          nome: row[1] || '',
          dias_trabalhados: parseInt(row[2]) || 0,
          dias_uteis: parseInt(row[3]) || 0,
          absente_percentage: parseFloat(row[4]?.toString().replace('%', '')) || 0,
          total_chamados: parseInt(row[5]) || 0,
          chamados_media_dia: parseFloat(row[6]) || 0,
          chamados_tma: parseFloat(row[7]) || 0,
          chamados_csat: parseFloat(row[8]?.toString().replace('%', '')) || 0,
          total_telefone: parseInt(row[9]) || 0,
          telefone_media_dia: parseFloat(row[10]) || 0,
          telefone_tma: row[11] ? row[11].toString() : null,
          telefone_csat: parseFloat(row[12]) || 0,
          telefone_perdidas: parseInt(row[13]) || 0,
          total_chats: parseInt(row[14]) || 0,
          chat_media_dia: parseFloat(row[15]) || 0,
          chat_tma: row[16] ? row[16].toString() : null,
          chat_csat: parseFloat(row[17]) || 0,
          atualizado_ate: row[18] || '',
          last_sheets_sync: new Date().toISOString()
        };
      }).filter(Boolean); // Remove registros nulos

      if (batch.length > 0) {
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
      }
    }

    return true;
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    return false;
  }
};

export default syncPerformanceData;