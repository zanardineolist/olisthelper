// pages/api/get-user-help-requests.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Obter metadados da planilha
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Obter todas as abas da planilha
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    // Filtrar apenas as abas que representam analistas (pode ser necessário ajustar a lógica de nomes)
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Iterar sobre todas as abas de analistas para obter os registros de ajuda
    for (const sheetName of analystSheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values || [];

      // Ignorar o cabeçalho
      rows.shift();

      for (const row of rows) {
        const [dateString, , , email] = row;

        if (email === userEmail) {
          const [day, month, year] = dateString.split('/').map(Number);
          const recordDate = new Date(year, month - 1, day);

          // Verificar se o registro pertence ao mês atual ou anterior
          if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
            currentMonthCount++;
          } else if (
            recordDate.getMonth() === currentMonth - 1 &&
            recordDate.getFullYear() === currentYear
          ) {
            lastMonthCount++;
          } else if (currentMonth === 0 && recordDate.getMonth() === 11 && recordDate.getFullYear() === currentYear - 1) {
            lastMonthCount++;
          }
        }
      }
    }

    res.status(200).json({
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
    });
  } catch (error) {
    console.error('Erro ao obter ajudas solicitadas:', error);
    res.status(500).json({ error: 'Erro ao obter as ajudas solicitadas. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}