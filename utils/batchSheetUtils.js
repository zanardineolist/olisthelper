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

// Função para obter metadados da planilha com cache
export async function getSheetMetaData() {
  const cacheKey = 'sheet_metadata';
  const cachedMetadata = cache.get(cacheKey);
  if (cachedMetadata) return cachedMetadata;

  const sheets = await getAuthenticatedGoogleSheets();
  const sheetId = process.env.SHEET_ID;

  const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  cache.set(cacheKey, metadata, CACHE_TIMES.METADATA);
  return metadata;
}

// Função para buscar valores em lote de múltiplos ranges com cache
export async function batchGetValues(ranges) {
  const cacheKey = `batch_${ranges.join('_')}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const sheets = await getAuthenticatedGoogleSheets();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: process.env.SHEET_ID,
    ranges,
  });

  const data = response.data.valueRanges || [];
  cache.set(cacheKey, data, CACHE_TIMES.SHEET_VALUES);
  return data;
}

// Função para obter valores de uma aba específica com cache
export async function getSheetValues(sheetName, range) {
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

    // Invalidar cache relacionado
    cache.delete(`sheet_${sheetName}_A:H`);
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
