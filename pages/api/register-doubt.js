import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { analyst, category, description, userName, userEmail } = req.body;

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const date = new Date();
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR');

    // Identificar a aba do analista apenas pelo ID numérico
    const analystSheetName = `${analyst}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${analystSheetName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[formattedDate, formattedTime, userName, userEmail, category, description]],
      },
    });

    res.status(200).json({ message: 'Dúvida registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar dúvida:', error);
    res.status(500).json({ error: 'Erro ao registrar a dúvida.' });
  }
}
