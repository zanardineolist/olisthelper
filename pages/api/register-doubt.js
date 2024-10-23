import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analyst, category, description, userName, userEmail } = req.body;

  if (!analyst || !category || !description || !userName || !userEmail) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.split('\n').join('\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const date = new Date();
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR');

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const sheetName = sheetMeta.data.sheets.find((sheet) => {
      return sheet.properties.title.startsWith(`#${analyst}`);
    })?.properties.title;

    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analyst}' não existe na planilha.` });
    }

    // Caso a aba exista, prosseguir com o append
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[formattedDate, formattedTime, userName, userEmail, category, description]],
      },
    });

    res.status(200).json({ message: 'Dúvida registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar dúvida:', error);
    throw new Error('Erro ao registrar a dúvida. Verifique suas credenciais e a configuração do Google Sheets.');
  }
}