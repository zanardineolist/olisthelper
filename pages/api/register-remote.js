import { getAuthenticatedGoogleSheets, appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userName, userEmail, chamado, tema } = req.body;

  if (!userName || !userEmail || !chamado || !tema) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const date = new Date();
    const brtDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const formattedDate = brtDate.toLocaleDateString('pt-BR');
    const formattedTime = brtDate.toLocaleTimeString('pt-BR');

    await appendValuesToSheet('Remoto', [
      [formattedDate, formattedTime, userName, userEmail, chamado, tema],
    ]);

    res.status(200).json({ message: 'Registro de acesso efetuado com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar acesso remoto:', error);
    res.status(500).json({ error: 'Erro ao registrar o acesso remoto.' });
  }
}
