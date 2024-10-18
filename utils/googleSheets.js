import { google } from 'googleapis';

export async function appendToSheet(data) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'AnalistaEscolhido!A:C',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [data],
    },
  });
}
