import { google } from 'googleapis';

export async function addUserToSheet(user) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      JSON.parse(`"${process.env.GOOGLE_PRIVATE_KEY}"`),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Gerar ID aleatório de 4 dígitos
    const userId = Math.floor(1000 + Math.random() * 9000);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Usuários!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[userId, user.name, user.email, 'user']],
      },
    });
  } catch (error) {
    console.error('Erro ao adicionar usuário à planilha:', error);
    throw new Error('Erro ao adicionar usuário à planilha. Verifique suas credenciais e a configuração do Google Sheets.');
  }
}

export async function getUserFromSheet(email) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      JSON.parse(`"${process.env.GOOGLE_PRIVATE_KEY}"`),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:D',
    });

    const rows = response.data.values;
    if (rows) {
      return rows.find((row) => row[2] === email); // Coluna C contém o e-mail
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário na planilha:', error);
    return null;
  }
}
