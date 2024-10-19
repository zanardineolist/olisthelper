import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Somente POST permitido' });
  }

  const { id, name, email, permission } = req.body;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuários!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[id, name, email, permission]],
      },
    });
    
    res.status(200).send('Usuário registrado com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).send('Erro ao registrar usuário.');
  }
}
