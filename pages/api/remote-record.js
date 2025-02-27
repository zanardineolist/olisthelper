import { appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, time, name, email, chamado, tema, description } = req.body;

  if (!date || !time || !name || !email || !chamado || !tema || !description) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Adicionar registro na aba "Remoto" com todos os campos
    await appendValuesToSheet('Remoto', [[date, time, name, email, chamado, tema, description]]);
    res.status(200).json({ message: 'Registro adicionado com sucesso.' });
  } catch (error) {
    console.error('Erro ao adicionar registro:', error);
    res.status(500).json({ error: 'Erro ao adicionar registro. Tente novamente.' });
  }
}