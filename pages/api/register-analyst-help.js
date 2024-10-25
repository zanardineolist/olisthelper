import { getAuthenticatedGoogleSheets, getSheetMetaData, appendValuesToSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userName, userEmail, category, description, analystId } = req.body;

  if (!userName || !userEmail || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    // Formatar a data e hora atuais para o horário de Brasília (UTC-3)
    const date = new Date();
    const brtDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const formattedDate = brtDate.toLocaleDateString('pt-BR');
    const formattedTime = brtDate.toLocaleTimeString('pt-BR');

    // Adicionar os dados na aba do analista
    await appendValuesToSheet(sheetName, [[formattedDate, formattedTime, userName, userEmail, category, description]]);

    res.status(200).json({ message: 'Ajuda registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
