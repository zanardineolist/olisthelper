import { getAuthenticatedGoogleSheets, appendValuesToSheet } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userName, userEmail, category, description, analystId } = req.body;

  // 1. Validação de entrada
  if (!userName || !userEmail || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // 2. Verificar analista no Supabase
    const { data: analystData, error: analystError } = await supabase
      .from('users')
      .select('*')
      .eq('id', analystId)
      .single();

    if (analystError || !analystData) {
      console.error('Erro ao verificar analista:', analystError);
      return res.status(404).json({ error: 'Analista não encontrado' });
    }

    // 3. Verificar perfil do analista
    if (!['analyst', 'tax'].includes(analystData.role)) {
      return res.status(403).json({ error: 'Usuário não tem permissão para registrar ajudas' });
    }

    // 4. Verificar usuário que recebe ajuda
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.error('Erro ao verificar usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 5. Inicializar Google Sheets
    const sheets = await getAuthenticatedGoogleSheets();

    // 6. Buscar aba do analista
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });

    const sheetName = sheetMeta.data.sheets
      .find(sheet => sheet.properties.title.startsWith(`#${analystData.user_id}`))
      ?.properties.title;

    if (!sheetName) {
      return res.status(404).json({ error: 'Aba não encontrada para este analista' });
    }

    // 7. Formatar data e hora
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const now = new Date(brtDate);
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');

    // 8. Preparar dados para inserção
    const record = [
      formattedDate,
      formattedTime,
      userName,
      userEmail,
      category,
      description
    ];

    // 9. Registrar na planilha
    await appendValuesToSheet(sheetName, [record]);

    // 10. Registrar no Supabase para backup
    const { error: insertError } = await supabase
      .from('analyst_help')
      .insert([{
        analyst_id: analystId,
        user_id: userData.id,
        category,
        description,
        date: formattedDate,
        time: formattedTime,
        created_at: now.toISOString()
      }]);

    if (insertError) {
      console.error('Erro ao registrar no Supabase:', insertError);
      // Não falhar a requisição se apenas o backup falhar
    }

    // 11. Retornar sucesso
    return res.status(200).json({ 
      message: 'Ajuda registrada com sucesso.',
      data: {
        timestamp: now.toISOString(),
        helpId: now.getTime().toString(),
        analyst: {
          id: analystId,
          name: analystData.name,
          role: analystData.role
        },
        user: {
          name: userName,
          email: userEmail
        },
        help: {
          date: formattedDate,
          time: formattedTime,
          category,
          description: description.substring(0, 100) + (description.length > 100 ? '...' : '')
        }
      }
    });

  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    return res.status(500).json({ 
      error: 'Erro ao registrar ajuda',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}