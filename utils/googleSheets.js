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

// Função para adicionar novos valores na próxima linha vazia, começando da linha 2
export async function appendValuesToSheet(sheetName, values, withCheckboxes = false) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();

    // Obtendo os valores atuais para descobrir qual é a próxima linha vazia, começando da linha 2
    const currentValues = await getSheetValues(sheetName, 'A2:A');
    const nextRowIndex = currentValues.length + 2; // +2 para considerar o cabeçalho e o índice de linha começando em 1

    // Adicionar valores na próxima linha vazia
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

    // Invalida o cache para garantir dados atualizados em tempo real
    cache.delete(`sheet_${sheetName}_A:A`);
    console.log(`Valores adicionados à aba ${sheetName}:`, values);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

// Função para adicionar checkboxes a colunas específicas
export async function addCheckboxesToColumns(sheetName, startRowIndex, endRowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = await getSheetIdByName(sheetName);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: sheetId,
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

// Função para editar uma linha específica, preservando o cabeçalho (linha 1)
export async function updateSheetRow(sheetName, rowIndex, newValues) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();

    // Garantir que o índice da linha é maior ou igual a 2 (pois a linha 1 é o cabeçalho)
    if (rowIndex < 2) {
      throw new Error('Índice de linha inválido. Não é permitido editar o cabeçalho.');
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newValues] },
    });

    // Invalida o cache para garantir dados atualizados em tempo real
    cache.delete(`sheet_${sheetName}_A:A`);
    console.log(`Valor atualizado na linha ${rowIndex} da aba ${sheetName}:`, newValues);
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

// Função para excluir uma linha específica, preservando o cabeçalho (linha 1)
export async function deleteSheetRow(sheetName, rowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = await getSheetIdByName(sheetName);

    // Garantir que o índice da linha é maior ou igual a 2 (pois a linha 1 é o cabeçalho)
    if (rowIndex < 2) {
      throw new Error('Índice de linha inválido. Não é permitido excluir o cabeçalho.');
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // Ajuste de 1 para indexação zero-based
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    // Invalida o cache para garantir dados atualizados em tempo real
    cache.delete(`sheet_${sheetName}_A:A`);
    console.log(`Linha ${rowIndex} excluída da aba ${sheetName}.`);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}

// Função para obter o ID da aba pelo nome
export async function getSheetIdByName(sheetName) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);
    if (sheet) {
      return sheet.properties.sheetId;
    } else {
      throw new Error(`Aba '${sheetName}' não encontrada.`);
    }
  } catch (error) {
    console.error(`Erro ao obter sheetId da aba ${sheetName}:`, error);
    throw error;
  }
}

// Função para buscar usuário específico pela coluna de email
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

// Função para ordenar os usuários em ordem alfabética pelo nome
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