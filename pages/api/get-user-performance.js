import { google } from 'googleapis';
import { findBestMatch } from 'string-similarity';

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
    const sheetIdUsuarios = "1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34"; // ID da planilha de usuários
    const sheetIdDesempenho = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI"; // ID da planilha de desempenho

    // Passo 1: Buscar Nome do Usuário Usando o E-mail
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetIdUsuarios,
      range: 'Usuários!A:D', // Colunas A a D da aba "Usuários"
    });
    const usersRows = usersResponse.data.values;

    if (!usersRows) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Encontrar o nome do usuário usando o e-mail
    const userRow = usersRows.find(row => row[2].toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const userName = userRow[1].trim().toLowerCase(); // Coluna B da aba "Usuários" (nome do usuário)

    // Passo 2: Buscar Dados de Desempenho Usando o Nome do Usuário
    const performanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetIdDesempenho,
      range: 'Principal!A:V', // Colunas A a V da aba "Principal"
    });
    const performanceRows = performanceResponse.data.values;

    if (!performanceRows) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado.' });
    }

    // Normalizar os nomes da planilha de desempenho para fazer a correspondência
    const performanceNames = performanceRows.map(row => row[3] ? row[3].trim().toLowerCase() : '');

    // Usar correspondência fuzzy para encontrar o melhor nome correspondente
    const matchResult = findBestMatch(userName, performanceNames);
    const bestMatchIndex = matchResult.bestMatchIndex;
    const bestMatchRating = matchResult.bestMatch.rating;

    // Considerar uma correspondência válida se o índice de similaridade for maior que 0.7
    if (bestMatchRating < 0.7) {
      return res.status(404).json({ error: 'Nenhum dado de desempenho encontrado com correspondência suficiente.' });
    }

    const performanceData = performanceRows[bestMatchIndex];

    // Estrutura de retorno dos dados de desempenho
    const responsePayload = {
      totalChamados: performanceData[7], // Coluna H
      mediaPorDia: performanceData[8], // Coluna I
      tma: performanceData[9], // Coluna J
      csat: performanceData[10], // Coluna K
      atualizadoAte: performanceData[20], // Coluna U
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}
