import { google } from 'googleapis';
import { cache, CACHE_TIMES } from './cache';

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

export async function getSheetMetaData() {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

export async function getSheetValues(sheetName, range) {
  try {
    const cacheKey = `sheet_${sheetName}_${range}`;
    const cachedValues = cache.get(cacheKey);
    if (cachedValues) return cachedValues;

    const sheets = await getAuthenticatedGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
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

export async function appendValuesToSheet(sheetName, values, withCheckboxes = false) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();

    // Descobrir qual é a última linha preenchida para inserir novos dados.
    const currentValues = await getSheetValues(sheetName, 'A:A');
    const nextRowIndex = currentValues.length + 1;

    // Adicionar valores à planilha
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!A${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    // Adicionar checkboxes às colunas necessárias, se for especificado
    if (withCheckboxes) {
      await addCheckboxesToColumns(sheetName, nextRowIndex, nextRowIndex);
    }

    // Atualizar cache
    cache.updateCache(`sheet_${sheetName}_A:A`, () => getSheetValues(sheetName, 'A:A'), CACHE_TIMES.SHEET_VALUES);
    console.log(`Valores adicionados à aba ${sheetName}:`, values);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

export async function addCheckboxesToColumns(sheetName, startRowIndex, endRowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = sheetInfo.data.sheets.find((sheet) => sheet.properties.title === sheetName);

    if (!sheet) {
      throw new Error(`Aba ${sheetName} não encontrada.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: startRowIndex - 1,
                endRowIndex: endRowIndex,
                startColumnIndex: 5,
                endColumnIndex: 8,
              },
              rows: Array(endRowIndex - startRowIndex + 1).fill({
                values: [
                  {
                    userEnteredValue: { boolValue: false },
                    dataValidation: { condition: { type: 'BOOLEAN' } },
                  },
                  {
                    userEnteredValue: { boolValue: false },
                    dataValidation: { condition: { type: 'BOOLEAN' } },
                  },
                  {
                    userEnteredValue: { boolValue: false },
                    dataValidation: { condition: { type: 'BOOLEAN' } },
                  },
                ],
              }),
              fields: 'userEnteredValue,dataValidation',
            },
          },
        ],
      },
    });

    console.log(`Checkboxes adicionados nas colunas F, G e H da linha ${startRowIndex} até ${endRowIndex}.`);
  } catch (error) {
    console.error(`Erro ao adicionar checkboxes às colunas na aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar checkboxes às colunas na aba ${sheetName}.`);
  }
}

export async function updateSheetRow(sheetName, rowIndex, newValues) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newValues] },
    });

    cache.updateCache(`sheet_${sheetName}_A:A`, () => getSheetValues(sheetName, 'A:A'), CACHE_TIMES.SHEET_VALUES);
    console.log(`Valor atualizado na linha ${rowIndex} da aba ${sheetName}:`, newValues);
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

export async function deleteSheetRow(sheetName, rowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID,
    });

    const sheet = sheetInfo.data.sheets.find((sheet) => sheet.properties.title === sheetName);

    if (!sheet) {
      throw new Error(`Aba ${sheetName} não encontrada.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    cache.updateCache(`sheet_${sheetName}_A:A`, () => getSheetValues(sheetName, 'A:A'), CACHE_TIMES.SHEET_VALUES);
    console.log(`Linha ${rowIndex} excluída da aba ${sheetName}.`);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}

export async function getUserFromSheet(email) {
  try {
    const rows = await getSheetValues('Usuários', 'A:H');
    const user = rows.find((row) => row[2] === email);
    return user ? {
      id: row[0],
      name: row[1],
      email: row[2],
      profile: row[3],
      squad: row[4],
      chamado: row[5] === 'TRUE',
      telefone: row[6] === 'TRUE',
      chat: row[7] === 'TRUE',
    } : null;
  } catch (error) {
    console.error('Erro ao buscar usuário na planilha:', error);
    throw new Error('Erro ao buscar usuário na planilha.');
  }
}

export async function sortSheetByColumn(sheetName, startRowIndex, startColumnIndex, endColumnIndex, dimensionIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = sheetInfo.data.sheets.find((sheet) => sheet.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Aba '${sheetName}' não encontrada.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex,
                startColumnIndex,
                endColumnIndex,
              },
              sortSpecs: [
                {
                  dimensionIndex,
                  sortOrder: 'ASCENDING',
                },
              ],
            },
          },
        ],
      },
    });
    console.log(`Ordenação da aba ${sheetName} concluída.`);
  } catch (error) {
    console.error(`Erro ao ordenar a aba ${sheetName}:`, error);
    throw new Error(`Erro ao ordenar a aba ${sheetName}.`);
  }
}
