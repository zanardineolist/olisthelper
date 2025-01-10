import { getAuthenticatedGoogleSheets, appendValuesToSheet } from '../../utils/googleSheets';
import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, time, name, email, chamado, tema, description } = req.body;

  // 1. Validação de entrada
  if (!date || !time || !name || !email || !chamado || !tema || !description) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // 2. Verificar usuário no Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('Erro ao verificar usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 3. Verificar permissões
    if (!['support+', 'super'].includes(userData.role)) {
      return res.status(403).json({ error: 'Usuário não tem permissão para acesso remoto' });
    }

    // 4. Validar tema
    const temasPermitidos = ['Certificado A1', 'Certificado A3', 'Etiqueta de produto', 'SAT'];
    if (!temasPermitidos.includes(tema)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }

    // 5. Formatar dados para inserção
    const formattedData = [
      [
        date,
        time,
        name,
        email,
        chamado,
        tema,
        description
      ]
    ];

    // 6. Registrar no Google Sheets
    await appendValuesToSheet('Remoto', formattedData);

    // 7. Registrar no Supabase para backup
    const { error: insertError } = await supabase
      .from('remote_access')
      .insert([{
        date,
        time,
        user_name: name,
        user_email: email,
        ticket_number: chamado,
        theme: tema,
        description,
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('Erro ao registrar no Supabase:', insertError);
      // Não falhar a requisição se apenas o backup falhar
    }

    // 8. Retornar sucesso
    res.status(200).json({ 
      message: 'Registro adicionado com sucesso.',
      data: {
        timestamp: new Date().toISOString(),
        recordId: new Date().getTime().toString(),
        user: {
          name,
          email,
          role: userData.role
        },
        access: {
          date,
          time,
          tema,
          chamado
        }
      }
    });

  } catch (error) {
    console.error('Erro ao adicionar registro:', error);
    res.status(500).json({ 
      error: 'Erro ao adicionar registro. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}