// utils/googleSheets.js
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

// Função para obter usuário da planilha ou adicioná-lo se não existir
export async function addUserToSheetIfNotExists(user) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Verificar se o usuário já existe
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:H',
    });

    const rows = response.data.values || [];
    const existingUser = rows.find((row) => row[2] === user.email);
    if (existingUser) {
      return existingUser;
    }

    // Gerar ID aleatório único de 4 dígitos que não repita
    let userId;
    do {
      userId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rows.some(row => row[0] === userId));

    // Determinar o índice da nova linha a ser adicionada
    const newRowIndex = rows.length + 1; // Aumentar índice para a próxima linha correta

    // Adicionar novo usuário com perfil padrão 'support'
    const newUser = [userId, user.name, user.email, 'support', '', 'FALSE', 'FALSE', 'FALSE'];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Usuários!A${newRowIndex}:H${newRowIndex}`, // Ajustar para a linha correta
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newUser],
      },
    });

    // Configurar as células F, G e H como checkboxes na linha correta
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0, // ID da aba, ajuste conforme necessário
                startRowIndex: newRowIndex - 1, // startRowIndex é baseado em zero
                endRowIndex: newRowIndex,
                startColumnIndex: 5, // Coluna F
                endColumnIndex: 8,  // Coluna H
              },
              cell: {
                dataValidation: {
                  condition: {
                    type: 'BOOLEAN',
                  },
                },
                userEnteredValue: { boolValue: false },
              },
              fields: 'dataValidation,userEnteredValue',
            },
          },
        ],
      },
    });

    return newUser;
  } catch (error) {
    console.error('Erro ao adicionar ou verificar usuário na planilha:', error);
    return null;
  }
}

// Função para obter usuário da planilha
export async function getUserFromSheet(email) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:H',
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
export async function getSheetMetaData() {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;
    return await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    throw new Error('Erro ao obter metadados da planilha.');
  }
}

// Função para obter registros de uma aba específica
export async function getSheetValues(sheetName, range) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    });

    return response.data.values || [];
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
      resource: {
        values,
      },
    });
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
      resource: {
        values: [values],
      },
    });
  } catch (error) {
    console.error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Erro ao atualizar valores na linha ${rowIndex} da aba ${sheetName}.`);
  }
}

// Função para adicionar uma nova linha na planilha e configurar os checkboxes
export async function addSheetRow(sheetName, values) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Adicionando os valores na planilha
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`, // Ajuste para adicionar na aba correta
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });

    // Pegar o índice da linha adicionada
    const updatedRange = appendResponse.data.updates.updatedRange;
    const match = updatedRange.match(/(\d+):\w+/);
    if (match) {
      const newRowIndex = parseInt(match[1], 10) - 1; // Corrigir índice (começa do zero)

      // Configurar as células F, G e H como checkboxes com os valores corretos
      const [chamado, telefone, chat] = values.slice(5, 8); // Obter valores de Chamado, Telefone e Chat

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // ID da aba, ajuste conforme necessário
                  startRowIndex: newRowIndex,
                  endRowIndex: newRowIndex + 1,
                  startColumnIndex: 5, // Coluna F
                  endColumnIndex: 6,  // Coluna F (Chamado)
                },
                cell: {
                  userEnteredValue: { boolValue: chamado === 'TRUE' },
                  dataValidation: {
                    condition: {
                      type: 'BOOLEAN',
                    },
                  },
                },
                fields: 'dataValidation,userEnteredValue',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: 0, // ID da aba, ajuste conforme necessário
                  startRowIndex: newRowIndex,
                  endRowIndex: newRowIndex + 1,
                  startColumnIndex: 6, // Coluna G (Telefone)
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredValue: { boolValue: telefone === 'TRUE' },
                  dataValidation: {
                    condition: {
                      type: 'BOOLEAN',
                    },
                  },
                },
                fields: 'dataValidation,userEnteredValue',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: 0, // ID da aba, ajuste conforme necessário
                  startRowIndex: newRowIndex,
                  endRowIndex: newRowIndex + 1,
                  startColumnIndex: 7, // Coluna H (Chat)
                  endColumnIndex: 8,
                },
                cell: {
                  userEnteredValue: { boolValue: chat === 'TRUE' },
                  dataValidation: {
                    condition: {
                      type: 'BOOLEAN',
                    },
                  },
                },
                fields: 'dataValidation,userEnteredValue',
              },
            },
          ],
        },
      });
    }
  } catch (error) {
    console.error(`Erro ao adicionar valores à aba ${sheetName}:`, error);
    throw new Error(`Erro ao adicionar valores à aba ${sheetName}.`);
  }
}
