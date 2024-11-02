import { google } from 'googleapis';

// Função para autenticação do Google Sheets
export async function getAuthenticatedGoogleSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

// Função para obter a aba do analista e seus detalhes
export async function getAnalystSheetDetails(analystId) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const matchingSheet = sheetMeta.data.sheets.find((sheet) => 
      sheet.properties.title.startsWith(`#${analystId}`)
    );

    if (!matchingSheet) {
      throw new Error(`Aba correspondente ao ID '${analystId}' não encontrada na planilha.`);
    }

    const sheetName = matchingSheet.properties.title;

    // Definir o mapeamento das colunas
    const columnMapping = {
      date: 'A',
      time: 'B',
      userName: 'C',
      userEmail: 'D',
      topic: 'E',
      description: 'F',
    };

    return {
      sheetName,
      columnMapping,
    };
  } catch (error) {
    console.error('Erro ao obter detalhes da aba do analista:', error);
    throw new Error('Erro ao obter detalhes da aba do analista.');
  }
}

// Função para obter todos os registros de uma aba específica do analista
export async function getAnalystRecords(analystId) {
  try {
    const { sheetName, columnMapping } = await getAnalystSheetDetails(analystId);
    const range = `${columnMapping.date}:${columnMapping.description}`;
    const records = await getSheetValues(sheetName, range);

    if (!records || records.length <= 1) {
      return [];
    }

    // Formatar os registros de acordo com o mapeamento
    return records.slice(1).map((row, index) => ({
      index,
      date: row[0],
      time: row[1],
      userName: row[2],
      userEmail: row[3],
      topic: row[4],
      description: row[5],
    }));
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    throw new Error('Erro ao obter registros do analista.');
  }
}

// Função para adicionar um novo registro na aba do analista
export async function addAnalystRecord(analystId, record) {
  try {
    const { sheetName } = await getAnalystSheetDetails(analystId);
    const values = [
      [
        record.date,
        record.time,
        record.userName,
        record.userEmail,
        record.topic,
        record.description,
      ],
    ];

    await appendValuesToSheet(sheetName, values);
    console.log('Registro adicionado com sucesso.');
  } catch (error) {
    console.error('Erro ao adicionar registro do analista:', error);
    throw new Error('Erro ao adicionar registro do analista.');
  }
}

// Função para atualizar um registro existente na aba do analista
export async function updateAnalystRecord(analystId, rowIndex, record) {
  try {
    const { sheetName } = await getAnalystSheetDetails(analystId);
    const values = [
      record.date,
      record.time,
      record.userName,
      record.userEmail,
      record.topic,
      record.description,
    ];

    await updateSheetRow(sheetName, rowIndex + 2, values);
    console.log('Registro atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar registro do analista:', error);
    throw new Error('Erro ao atualizar registro do analista.');
  }
}

// Função para excluir um registro da aba do analista
export async function deleteAnalystRecord(analystId, rowIndex) {
  try {
    const { sheetName } = await getAnalystSheetDetails(analystId);
    await deleteSheetRow(sheetName, rowIndex + 2);
    console.log('Registro excluído com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir registro do analista:', error);
    throw new Error('Erro ao excluir registro do analista.');
  }
}
