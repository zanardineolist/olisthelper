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

export async function batchGetValues(ranges) {
  const sheets = await getAuthenticatedGoogleSheets();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: process.env.SHEET_ID,
    ranges: ranges.map(range => range),
  });

  return response.data.valueRanges;
}

export async function addUserToSheetIfNotExists(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',
    });

    const rows = response.data.values || [];
    const existingUser = rows.find((row) => row[2] === user.email);
    if (existingUser) {
      return existingUser;
    }

    let userId;
    do {
      userId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rows.some(row => row[0] === userId));

    const newUser = [userId, user.name, user.email, 'support', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE'];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newUser] },
    });

    return newUser;
  } catch (error) {
    console.error('Erro ao adicionar ou verificar usuário na planilha:', error);
    return null;
  }
}

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
      const user = rows.find((row) => row[2] === email);
      if (user) {
        return user;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário na planilha:', error);
    return null;
  }
}

export async function updateUserProfile(email, newRole) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',
    });

    const rows = response.data.values;
    if (rows) {
      const userIndex = rows.findIndex((row) => row[2] === email);
      if (userIndex >= 0) {
        rows[userIndex][3] = newRole;

        // Validação antes de atualizar
        if (rows[userIndex][2] !== email) {
          throw new Error('Validação falhou: O email do usuário não corresponde ao registro existente.');
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Usuários!A${userIndex + 1}:I${userIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [rows[userIndex]] },
        });
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar perfil do usuário na planilha:', error);
  }
}

export async function getSheetMetaData() {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

    return metadata;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

export async function getSheetValues(sheetName, range) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    });

    const values = response.data.values || [];
    return values;
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter valores da aba ${sheetName}.`);
  }
}

export async function appendValuesToSheet(sheetName, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

export async function updateSheetRow(sheetName, rowIndex, newValues, expectedValues) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Validação dos valores atuais antes de atualizar
    const allRows = await getSheetValues(sheetName, `A${rowIndex}:H${rowIndex}`);
    const currentValues = allRows[0];
    if (!expectedValues.every((val, idx) => val === currentValues[idx])) {
      throw new Error('Validação falhou: os valores atuais não correspondem aos valores esperados.');
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newValues] },
    });
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

export async function deleteSheetRow(sheetName, rowIndex, expectedValues) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Validação dos valores atuais antes de deletar
    const allRows = await getSheetValues(sheetName, `A${rowIndex}:H${rowIndex}`);
    const currentValues = allRows[0];
    if (!expectedValues.every((val, idx) => val === currentValues[idx])) {
      throw new Error('Validação falhou: os valores atuais não correspondem aos valores esperados.');
    }

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
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}

export async function addCheckboxToSheet(sheetName, range) {
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
          updateCells: {
            range: {
              sheetId: sheet.properties.sheetId,
              startRowIndex: parseInt(range.startRowIndex) - 1,
              endRowIndex: parseInt(range.endRowIndex),
              startColumnIndex: parseInt(range.startColumnIndex),
              endColumnIndex: parseInt(range.endColumnIndex),
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 1, blue: 1 },
                  horizontalAlignment: 'CENTER'
                },
                dataValidation: {
                  condition: {
                    type: 'BOOLEAN',
                    values: []
                  },
                  strict: true,
                  showCustomUi: true
                }
              }]
            }],
            fields: 'userEnteredFormat, dataValidation'
          }
        }],
      },
    });
  } catch (error) {
    console.error(`Erro ao adicionar checkbox na aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar checkbox na aba ${sheetName}.`);
  }
}

export async function getAllSheetNames() {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId
    });
    
    // Extrair os nomes das abas
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    
    // Opcional: filtrar abas de sistema ou ocultas, se necessário
    return sheetNames;
  } catch (error) {
    console.error('Erro ao obter nomes das abas:', error);
    throw new Error('Erro ao obter nomes das abas da planilha.');
  }
}
