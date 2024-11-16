import { getAuthenticatedGoogleSheets, appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { chamado, tema, userName, userId } = req.body;

  // Validação dos campos obrigatórios
  if (!chamado || !tema || !userName || !userId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetName = 'Remoto';

    // Formatar a data e hora atuais para o horário de Brasília (UTC-3)
    const date = new Date();
    const brtDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const formattedDate = brtDate.toLocaleDateString('pt-BR');
    const formattedTime = brtDate.toLocaleTimeString('pt-BR');

    // Adicionar os dados na aba "Remoto"
    await appendValuesToSheet(sheetName, [[formattedDate, formattedTime, userName, chamado, tema]]);

    res.status(200).json({ message: 'Registro criado com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar o acesso:', error);
    res.status(500).json({ error: 'Erro ao registrar o acesso. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
