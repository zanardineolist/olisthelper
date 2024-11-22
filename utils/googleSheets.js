// utils/googleSheets.js
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

export async function getLastFilledRow(sheetName) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    return rows.length;
  } catch (error) {
    console.error(`Erro ao obter a última linha preenchida da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter a última linha preenchida da aba ${sheetName}.`);
  }
}

export async function appendValuesToSheet(sheetName, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Buscar a última linha preenchida
    const lastRow = await getLastFilledRow(sheetName);
    const nextRow = lastRow + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${nextRow}:H${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    cache.updateCache(`sheet_${sheetName}_A:H`, () => getSheetValues(sheetName, 'A:H'), CACHE_TIMES.SHEET_VALUES);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

export async function updateSheetRowById(sheetName, identifier, newValues) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Buscar a linha com o identificador específico
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === identifier);
    if (rowIndex < 0) {
      throw new Error('Registro não encontrado.');
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${rowIndex + 1}:H${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newValues] },
    });

    cache.updateCache(`sheet_${sheetName}_A:H`, () => getSheetValues(sheetName, 'A:H'), CACHE_TIMES.SHEET_VALUES);
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex + 1} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex + 1} da aba ${sheetName}.`);
  }
}

export async function deleteSheetRowById(sheetName, identifier) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Buscar a linha com o identificador específico
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === identifier);
    if (rowIndex < 0) {
      throw new Error('Registro não encontrado.');
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
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    cache.updateCache(`sheet_${sheetName}_A:H`, () => getSheetValues(sheetName, 'A:H'), CACHE_TIMES.SHEET_VALUES);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex + 1} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex + 1} da aba ${sheetName}.`);
  }
}

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
