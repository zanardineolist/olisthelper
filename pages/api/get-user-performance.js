// pages/api/get-user-performance.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Autenticação com o Google Sheets API
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI"; // ID da planilha de desempenho

    // Buscar todos os usuários para vincular o e-mail ao nome
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID, // ID da planilha de usuários
      range: 'Usuários!A:D',
    });
    const usersRows = usersResponse.data.values;

    if (!usersRows) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Encontrar o nome do usuário usando o e-mail
    const userRow = usersRows.find(row => row[2] === userEmail);
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const userName = userRow[1].toLowerCase();

    // Buscar dados de desempenho usando o nome
    const performanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Principal!A:K', // Ajustar o nome da aba e intervalo conforme necessário
    });
    const performanceRows = performanceResponse.data.values;

    if (!performanceRows) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
    }

    // Normalizar os nomes e buscar a linha correspondente
    const performanceData = performanceRows.find(row => {
      return row[3] && row[3].toLowerCase() === userName; // Coluna D na planilha de desempenho
    });

    if (!performanceData) {
      return res.status(404).json({ error: 'Dados de desempenho não encontrados para o usuário.' });
    }

    // Estrutura de retorno dos dados de desempenho
    const responsePayload = {
      totalChamados: performanceData[7], // Coluna H
      mediaPorDia: performanceData[8], // Coluna I
      tma: performanceData[9], // Coluna J
      csat: performanceData[10], // Coluna K
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}
