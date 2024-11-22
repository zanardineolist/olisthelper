import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, addCheckboxToSheet, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

// Função para obter o sheetId baseado no nome da aba
async function getSheetIdByName(sheetName) {
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
    console.error('Erro ao obter sheetId:', error);
    throw error;
  }
}

// Função para ordenar usuários pelo nome em ordem alfabética
async function sortUsersByName(sheetName) {
  try {
    console.log('Iniciando a ordenação dos usuários...');
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = await getSheetIdByName(sheetName);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheetId, // Usar o sheetId específico da aba "Usuários"
                startRowIndex: 1, // Ignorar a linha de cabeçalho
                endRowIndex: null, // Até o final
                startColumnIndex: 0,
                endColumnIndex: 8, // Ordenar todas as colunas A até H
              },
              sortSpecs: [
                {
                  dimensionIndex: 1, // Índice da coluna B (nome)
                  sortOrder: 'ASCENDING',
                },
              ],
            },
          },
        ],
      },
    });
    console.log('Ordenação dos usuários concluída.');
  } catch (error) {
    console.error('Erro ao ordenar usuários:', error);
  }
}

export default async function handler(req, res) {
  const { method } = req;
  const sheetName = 'Usuários';

  // Extraindo informações do usuário dos cookies (passados pelo middleware)
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];
  const userRole = req.cookies['user-role'];

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
  };

  console.log('Detalhes do usuário extraídos dos cookies:', req.user);

  const isUserValid = req.user && req.user.id && req.user.name && req.user.role;
  console.log('Usuário é válido:', isUserValid);

  try {
    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando usuários...');
        const rows = await getSheetValues(sheetName, 'A:H');
        if (rows && rows.length > 1) {
          const users = rows.slice(1).map((row) => ({
            id: row[0],
            name: row[1],
            email: row[2],
            profile: row[3],
            squad: row[4],
            chamado: row[5] === 'TRUE',
            telefone: row[6] === 'TRUE',
            chat: row[7] === 'TRUE',
          }));
          return res.status(200).json({ users });
        }
        return res.status(404).json({ error: 'Nenhum usuário encontrado.' });

      case 'POST':
        console.log('Método POST chamado - Adicionando novo usuário...');
        const newUser = req.body;
        const allRows = await getSheetValues(sheetName, 'A:H');

        // Garantir que o email não exista previamente
        if (allRows.some(row => row[2] === newUser.email)) {
          return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        // Garantir que o ID seja único e não mude após ser gerado
        let newUserId;
        do {
          newUserId = Math.floor(1000 + Math.random() * 9000).toString();
        } while (allRows.some(row => row[0] === newUserId));

        // Corrigindo a chamada para `appendValuesToSheet`
        await appendValuesToSheet(sheetName, [[
          newUserId,
          newUser.name,
          newUser.email,
          newUser.profile,
          newUser.squad,
          newUser.chamado ? 'TRUE' : 'FALSE',
          newUser.telefone ? 'TRUE' : 'FALSE',
          newUser.chat ? 'TRUE' : 'FALSE'
        ]]);

        // Adicionando checkbox para colunas específicas (chamado, telefone, chat) diretamente na nova linha
        await addCheckboxToSheet(sheetName, {
          startRowIndex: allRows.length, // A linha do novo usuário
          endRowIndex: allRows.length + 1,
          startColumnIndex: 5,
          endColumnIndex: 8
        });

        await sortUsersByName(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de criação no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'create_user', 'Usuário', null, {
            userId: newUserId,
            name: newUser.name,
            email: newUser.email,
          }, 'manage-user');
          console.log('Ação de criação registrada com sucesso.');
        }

        // Atualizando o cache após adicionar o usuário
        await getSheetValues(sheetName, 'A:H', true); // Forçando atualização do cache

        return res.status(201).json({ message: 'Usuário adicionado com sucesso.', id: newUserId });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando usuário...');
        const updatedUser = req.body;

        // Verificar se o ID foi fornecido
        if (!updatedUser.id) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        // Buscar o índice do usuário na planilha
        const allRowsUpdate = await getSheetValues(sheetName, 'A:H');
        const rowIndex = allRowsUpdate.findIndex((row) => row[0] === updatedUser.id);

        if (rowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const previousData = allRowsUpdate[rowIndex];

        // Validação antes de atualizar o usuário
        if (previousData[2] !== updatedUser.email) {
          return res.status(400).json({ error: 'Email do usuário não corresponde ao registro existente.' });
        }

        await updateSheetRow(sheetName, rowIndex + 1, [
          updatedUser.id, // Não modificar o ID do usuário
          updatedUser.name,
          updatedUser.email,
          updatedUser.profile,
          updatedUser.squad,
          updatedUser.chamado ? 'TRUE' : 'FALSE',
          updatedUser.telefone ? 'TRUE' : 'FALSE',
          updatedUser.chat ? 'TRUE' : 'FALSE',
        ], previousData);
        await sortUsersByName(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de atualização no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'update_user', 'Usuário', {
            userId: previousData[0],
            name: previousData[1],
            email: previousData[2],
          }, {
            userId: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          }, 'manage-user');
          console.log('Ação de atualização registrada com sucesso.');
        }

        // Atualizando o cache após editar o usuário
        await getSheetValues(sheetName, 'A:H', true); // Forçando atualização do cache

        return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo usuário...');
        const deleteUserId = req.query.id;

        if (!deleteUserId) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        const userRows = await getSheetValues(sheetName, 'A:H');
        const deleteRowIndex = userRows.findIndex((row) => row[0] === deleteUserId);
        if (deleteRowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const deletedData = userRows[deleteRowIndex];

        // Validação antes de deletar o usuário
        if (deletedData[0] !== deleteUserId) {
          return res.status(400).json({ error: 'ID do usuário não corresponde ao registro existente.' });
        }

        await deleteSheetRow(sheetName, deleteRowIndex + 1, deletedData);
        await sortUsersByName(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de exclusão no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'delete_user', 'Usuário', {
            userId: deletedData[0],
            name: deletedData[1],
            email: deletedData[2],
          }, null, 'manage-user');
          console.log('Ação de exclusão registrada com sucesso.');
        }

        // Atualizando o cache após excluir o usuário
        await getSheetValues(sheetName, 'A:H', true); // Forçando atualização do cache

        return res.status(200).json({ message: 'Usuário excluído com sucesso.' });

      default:
        console.error(`Método ${method} não permitido.`);
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de usuário:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}