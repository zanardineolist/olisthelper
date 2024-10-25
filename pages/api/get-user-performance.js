import { google } from 'googleapis';
import { findBestMatch } from 'string-similarity';

async function getAuthenticatedGoogleSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

async function getSheetValues(sheets, spreadsheetId, sheetName, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter valores da aba ${sheetName}.`);
  }
}

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Autenticação com o Google Sheets API
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetIdUsuarios = "1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34"; // ID da planilha de usuários
    const sheetIdDesempenho = "1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI"; // ID da planilha de desempenho

    // Passo 1: Buscar Nome do Usuário e Preferências Usando o E-mail
    const usersRows = await getSheetValues(sheets, sheetIdUsuarios, 'Usuários', 'A:H');
    
    if (!usersRows || usersRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Encontrar o nome do usuário usando o e-mail e obter preferências
    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const userName = userRow[1].trim().toLowerCase(); // Coluna B da aba "Usuários" (nome do usuário)
    const userProfile = userRow[3]?.toLowerCase(); // Coluna D da aba "Usuários" (perfil do usuário)

    // Verificar se o perfil do usuário é "user"
    if (userProfile !== 'user') {
      return res.status(403).json({ error: 'Usuário não autorizado a visualizar os dados de desempenho.' });
    }

    const hasChamado = userRow[5] === 'TRUE'; // Coluna F - Chamado
    const hasTelefone = userRow[6] === 'TRUE'; // Coluna G - Telefone
    const hasChat = userRow[7] === 'TRUE'; // Coluna H - Chat

    // Passo 2: Buscar Dados de Desempenho Usando o Nome do Usuário
    const performanceRows = await getSheetValues(sheets, sheetIdDesempenho, 'Principal', 'A:T');

    if (!performanceRows || performanceRows.length === 0) {
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

    // Estrutura de retorno dos dados de desempenho com base nas preferências
    const responsePayload = {};

    if (hasChamado) {
      responsePayload.chamados = {
        totalChamados: performanceData[7], // Coluna H
        mediaPorDia: performanceData[8], // Coluna I
        tma: performanceData[9], // Coluna J
        csat: performanceData[10], // Coluna K
      };
    }

    if (hasTelefone) {
      responsePayload.telefone = {
        totalTelefone: performanceData[11], // Coluna L
        mediaPorDia: performanceData[12], // Coluna M
        tma: performanceData[13], // Coluna N
        csat: performanceData[14], // Coluna O
        perdidas: performanceData[15], // Coluna P
      };
    }

    if (hasChat) {
      responsePayload.chat = {
        totalChats: performanceData[16], // Coluna Q
        mediaPorDia: performanceData[17], // Coluna R
        tma: performanceData[18], // Coluna S
        csat: performanceData[19], // Coluna T
      };
    }

    responsePayload.atualizadoAte = performanceData[20]; // Coluna U

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}