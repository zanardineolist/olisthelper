// utils/googleSheets.js
import { google } from 'googleapis';
import { cache, CACHE_TIMES } from './cache';

let sheetsInstance = null;

// Função para autenticação do Google Sheets com singleton
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

// Função otimizada para batch requests
export async function batchGetValues(ranges) {
  const cacheKey = `batch_${ranges.join('_')}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const sheets = await getAuthenticatedGoogleSheets();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: process.env.SHEET_ID,
    ranges: ranges.map(range => range),
  });

  const data = response.data.valueRanges;
  cache.set(cacheKey, data, CACHE_TIMES.SHEET_VALUES);
  return data;
}

// Função para obter usuário da planilha ou adicioná-lo se não existir
export async function addUserToSheetIfNotExists(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const cacheKey = `user_${user.email}`;
    
    // Verificar cache primeiro
    const cachedUser = cache.get(cacheKey);
    if (cachedUser) return cachedUser;

    // Verificar se o usuário já existe
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:I',  // Atualizar o range para incluir a coluna I
    });

    const rows = response.data.values || [];
    const existingUser = rows.find((row) => row[2] === user.email);
    if (existingUser) {
      cache.set(cacheKey, existingUser, CACHE_TIMES.USERS);
      return existingUser;
    }

    // Gerar ID aleatório único
    let userId;
    do {
      userId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rows.some(row => row[0] === userId));

    const newRowIndex = rows.length + 1;
    const newUser = [userId, user.name, user.email, 'support', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE'];

    // Usar batch update para otimizar as requisições
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
              rows: [{
                values: newUser.map(value => ({
                  userEnteredValue: { stringValue: value.toString() }
                }))
              }],
              fields: 'userEnteredValue'
            }
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

    cache.set(cacheKey, newUser, CACHE_TIMES.USERS);
    return newUser;
  } catch (error) {
    console.error('Erro ao adicionar ou verificar usuário na planilha:', error);
    return null;
  }
}

// Função otimizada para obter usuário da planilha
export async function getUserFromSheet(email) {
  try {
    const cacheKey = `user_${email}`;
    const cachedUser = cache.get(cacheKey);
    if (cachedUser) return cachedUser;

    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:H',
    });

    const rows = response.data.values;
    if (rows) {
      const user = rows.find((row) => row[2] === email);
      if (user) {
        cache.set(cacheKey, user, CACHE_TIMES.USERS);
        return user;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário na planilha:', error);
    return null;
  }
}

// Função otimizada para obter metadados da planilha
export async function getSheetMetaData() {
  try {
    const cacheKey = 'sheet_metadata';
    const cachedMetadata = cache.get(cacheKey);
    if (cachedMetadata) return cachedMetadata;

    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    
    cache.set(cacheKey, metadata, CACHE_TIMES.METADATA);
    return metadata;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

// Função otimizada para obter registros de uma aba específica
export async function getSheetValues(sheetName, range) {
  try {
    const cacheKey = `sheet_${sheetName}_${range}`;
    const cachedValues = cache.get(cacheKey);
    if (cachedValues) return cachedValues;

    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    });

    const values = response.data.values || [];
    cache.set(cacheKey, values, CACHE_TIMES.SHEET_VALUES);
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

    // Invalidar cache relacionado
    cache.delete(`sheet_${sheetName}_A:F`);
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

    // Atualizar o cache relacionado diretamente após a modificação
    const cacheKey = `user_${values[2]}`;
    cache.set(cacheKey, values, CACHE_TIMES.USERS);
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

// Função otimizada para adicionar uma nova linha
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
      const [chamado, telefone, chat] = values.slice(5, 8);

      // Usar batch update para otimizar as requisições de checkbox
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [5, 6, 7].map((colIndex) => ({
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: newRowIndex,
                endRowIndex: newRowIndex + 1,
                startColumnIndex: colIndex,
                endColumnIndex: colIndex + 1,
              },
              cell: {
                dataValidation: { condition: { type: 'BOOLEAN' } },
                userEnteredValue: {
                  boolValue: values[colIndex] === 'TRUE'
                },
              },
              fields: 'dataValidation,userEnteredValue',
            },
          })),
        },
      });
    }

    // Invalidar cache relacionado
    cache.delete(`sheet_${sheetName}_A:H`);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
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

    // Invalidar cache relacionado
    cache.delete(`sheet_${sheetName}_A:H`);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}