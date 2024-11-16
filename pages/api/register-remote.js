import { appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { datetime, userName, chamado, tema } = req.body;

  if (!datetime || !userName || !chamado || !tema) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    await appendValuesToSheet('Remoto', [[datetime, userName, chamado, tema]]);
    res.status(201).json({ message: 'Registro salvo com sucesso.' });
  } catch (error) {
    console.error('Erro ao salvar registro remoto:', error);
    res.status(500).json({ error: 'Erro ao salvar registro remoto.' });
  }
}
