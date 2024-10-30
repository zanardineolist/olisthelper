import { google } from 'googleapis';

// Função para autenticação do Google Sheets
export async function getAuthenticatedGoogleSheets() {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Erro ao autenticar com o Google Sheets:', error);
    throw new Error('Falha na autenticação do Google Sheets.');
  }
}

// Função para adicionar usuário à planilha
export async function addUserToSheet(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Gerar ID aleatório de 4 dígitos
    const userId = Math.floor(1000 + Math.random() * 9000);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Usuários!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[userId, user.name, user.email, 'support']],
      },
    });
  } catch (error) {
    console.error('Erro ao adicionar usuário à planilha:', error);
    throw new Error('Erro ao adicionar usuário à planilha. Verifique suas credenciais e a configuração do Google Sheets.');
  }
}

// Função para obter usuário da planilha
export async function getUserFromSheet(email) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
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

// Função para obter metadados da planilha
export async function getSheetMetaData(sheetId) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      throw new Error('Erro na autenticação ao buscar metadados.');
    }

    const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

// Função para obter registros de uma aba específica
export async function getSheetValues(sheetId, range) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      throw new Error('Erro na autenticação ao buscar valores.');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    if (!response.data.values) {
      throw new Error(`Nenhum valor encontrado no range: ${range} na planilha: ${sheetId}`);
    }

    return response.data.values;
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${range} na planilha ${sheetId}:`, error);
    throw error;
  }
}

// Função para adicionar valores a uma aba específica
export async function appendValuesToSheet(sheetName, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}
