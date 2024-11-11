import { google } from 'googleapis';
import NodeCache from 'node-cache';

// Cache configurado com TTL de 1 hora
const cache = new NodeCache({ stdTTL: 3600 });

// Singleton para instanciar o Google Sheets
let sheetsInstance;

async function getAuthenticatedGoogleSheets() {
  if (!sheetsInstance) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    sheetsInstance = google.sheets({ version: 'v4', auth });
    console.log('Nova instância do Google Sheets criada.');
  }
  return sheetsInstance;
}

async function getSheetMetaData(sheets) {
  const sheetId = process.env.SHEET_ID;
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

async function getSheetValues(sheets, spreadsheetId, sheetName, range) {
  const cacheKey = `${sheetName}-${range}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache encontrado para ${cacheKey}`);
    return cachedData;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    const values = response.data.values || [];
    cache.set(cacheKey, values);
    return values;
  } catch (error) {
    console.error(`Erro ao obter valores da aba ${sheetName}:`, error);
    throw new Error(`Erro ao obter valores da aba ${sheetName}.`);
  }
}

async function batchGetValues(sheets, spreadsheetId, ranges) {
  const cacheKey = `batch-${ranges.join('|')}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache encontrado para ${cacheKey}`);
    return cachedData;
  }

  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    const values = response.data.valueRanges || [];
    // Armazenar cada intervalo individualmente no cache
    values.forEach((valueRange, index) => {
      cache.set(ranges[index], valueRange.values);
    });
    cache.set(cacheKey, values);
    return values;
  } catch (error) {
    console.error(`Erro ao obter valores em lote:`, error);
    throw new Error('Erro ao obter valores em lote.');
  }
}

async function appendValuesToSheet(sheets, spreadsheetId, sheetName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      resource: { values },
    });
    console.log(`Valores adicionados à aba ${sheetName}`);
    // Invalidação do cache da aba modificada
    cache.del(sheetName);
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}

async function updateSheetRow(sheets, spreadsheetId, sheetName, range, values) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      resource: { values },
    });
    console.log(`Valores atualizados na aba ${sheetName}, intervalo ${range}`);
    // Invalidação granular do cache
    cache.del(`${sheetName}-${range}`);
  } catch (error) {
    console.error(`Erro ao atualizar valores na aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na aba ${sheetName}.`);
  }
}

async function addUserToSheetIfNotExists(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    const cacheKey = `user_${user.email}`;

    // Verificar cache global de usuários
    let usersCache = cache.get('users_list');
    if (!usersCache) {
      // Caso não esteja no cache, carregar todos os usuários
      const usersRows = await getSheetValues(sheets, sheetId, 'Usuários', 'A:H');
      usersCache = usersRows || [];
      cache.set('users_list', usersCache);
    }

    // Verificar se o usuário já existe no cache
    const existingUser = usersCache.find((row) => row[2]?.toLowerCase() === user.email.toLowerCase());
    if (existingUser) {
      cache.set(cacheKey, existingUser);
      return existingUser;
    }

    // Adicionar usuário se não existir
    const newUserRow = [user.id, user.name, user.email, user.role, user.squad];
    await appendValuesToSheet(sheets, sheetId, 'Usuários', [newUserRow]);

    // Atualizar cache global
    usersCache.push(newUserRow);
    cache.set('users_list', usersCache);
    cache.set(cacheKey, newUserRow);
    return newUserRow;
  } catch (error) {
    console.error('Erro ao adicionar ou verificar usuário na planilha:', error);
    return null;
  }
}

export async function deleteSheetRow(sheetName, rowIndex) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Obter informações da planilha
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Encontrar a aba correspondente ao sheetName
    const sheet = sheetInfo.data.sheets.find(
      (sheet) => sheet.properties.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Aba ${sheetName} não encontrada.`);
    }

    // Executar a exclusão da linha usando batchUpdate
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

    // Invalidar cache relacionado à aba
    cache.delete(`sheet_${sheetName}_A:H`);
    console.log(`Linha ${rowIndex} removida com sucesso da aba ${sheetName}`);
  } catch (error) {
    console.error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao excluir linha ${rowIndex} da aba ${sheetName}.`);
  }
}

export {
  getAuthenticatedGoogleSheets,
  getSheetMetaData,
  getSheetValues,
  batchGetValues,
  appendValuesToSheet,
  updateSheetRow,
  addUserToSheetIfNotExists,
  deleteSheetRow,
};