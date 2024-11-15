// utils/googleSheets.js
import { google } from 'googleapis';

let sheetsInstance = null;

export async function getAuthenticatedGoogleSheets() {
  if (sheetsInstance) return sheetsInstance;

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}

// Função otimizada para batch requests (sem cache)
export async function batchGetValues(ranges) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: process.env.SHEET_ID,
      ranges: ranges.map(range => range),
    });

    const data = response.data.valueRanges;
    return data;
  } catch (error) {
    console.error('Erro ao obter valores em batch:', error);
    throw error;
  }
}

// Função para obter usuário da planilha ou adicioná-lo se não existir (sem cache)
export async function addUserToSheetIfNotExists(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',
    });

    const rows = response.data.values || [];
    const existingUser = rows.find((row) => row[2].toLowerCase() === user.email.toLowerCase());
    if (existingUser) {
      console.log("Usuário existente encontrado:", existingUser);
      return existingUser;
    }

    let userId;
    do {
      userId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rows.some(row => row[0] === userId));

    const newRowIndex = rows.length + 1;
    const newUser = [userId, user.name, user.email, 'support', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE'];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: 0,
                startRowIndex: newRowIndex - 1,
                endRowIndex: newRowIndex,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              rows: [newUser.map(value => ({
                userEnteredValue: { stringValue: value.toString() }
              }))],
              fields: 'userEnteredValue',
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: newRowIndex - 1,
                endRowIndex: newRowIndex,
                startColumnIndex: 5,
                endColumnIndex: 9,
              },
              cell: {
                dataValidation: {
                  condition: { type: 'BOOLEAN' },
                },
                userEnteredValue: { boolValue: false },
              },
              fields: 'dataValidation,userEnteredValue',
            },
          },
        ],
      },
    });

    console.log("Novo usuário adicionado:", newUser);
    return newUser;
  } catch (error) {
    console.error('Erro ao adicionar ou verificar usuário na planilha:', error);
    return null;
  }
}

// Função para obter usuário da planilha (sem cache)
export async function getUserFromSheet(email) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',
    });

    const rows = response.data.values;
    if (rows) {
      const user = rows.find((row) => row[2].toLowerCase() === email.toLowerCase());
      if (user) {
        const remoteAccessRaw = user[8]?.toString().toLowerCase();
        const remoteAccess = remoteAccessRaw === 'true' || remoteAccessRaw === 'verdadeiro';

        console.log("Usuário encontrado na planilha:", user);
        console.log("Acesso Remoto interpretado:", remoteAccess);

        return {
          id: user[0],
          name: user[1],
          email: user[2],
          role: user[3],
          squad: user[4],
          chamado: user[5] === 'TRUE',
          telefone: user[6] === 'TRUE',
          chat: user[7] === 'TRUE',
          remoteAccess: remoteAccess,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário na planilha:', error);
    return null;
  }
}

// Função para obter metadados da planilha (sem cache)
export async function getSheetMetaData() {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

    console.log("Metadados da planilha obtidos:", metadata);
    return metadata;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

// Função para obter registros de uma aba específica (sem cache)
export async function getSheetValues(sheetName, range) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    });

    const values = response.data.values || [];
    console.log(`Valores obtidos da aba ${sheetName}:`, values);
    return values;
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter valores da aba ${sheetName}.`);
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
      resource: { values },
    });

    console.log(`Valores adicionados à aba ${sheetName}:`, values);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

// Função para atualizar uma linha específica da planilha
export async function updateSheetRow(sheetName, rowIndex, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] },
    });

    console.log(`Valores atualizados na linha ${rowIndex} da aba ${sheetName}:`, values);
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

// Função para adicionar uma nova linha
export async function addSheetRow(sheetName, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] },
    });

    const updatedRange = appendResponse.data.updates.updatedRange;
    const match = updatedRange.match(/(\d+):\w+/);

    if (match) {
      const newRowIndex = parseInt(match[1], 10) - 1;
      console.log(`Nova linha adicionada na aba ${sheetName}, índice: ${newRowIndex}`);
    }
  } catch (error) {
    console.error(`Erro ao adicionar nova linha à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar nova linha à aba ${sheetName}.`);
  }
}

// Função para excluir uma linha específica da planilha
export async function deleteSheetRow(sheetName, rowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = sheetInfo.data.sheets.find(
      (sheet) => sheet.properties.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Aba ${sheetName} não encontrada.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    });

    console.log(`Linha ${rowIndex} excluída da aba ${sheetName}`);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}
