import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, getUserFromSheet, updateUserProfile, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';

// Função para ordenar usuários pelo nome em ordem alfabética
async function sortUsersByName(sheetName) {
  try {
    console.log('Iniciando a ordenação dos usuários...');
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Obtendo informações da planilha
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheet = sheetInfo.data.sheets.find((s) => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Aba '${sheetName}' não encontrada.`);
    }

    // Realizando a ordenação da coluna B (nome)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: 1,
                startColumnIndex: 1,
                endColumnIndex: 2,
              },
              sortSpecs: [
                {
                  dimensionIndex: 1, // Coluna B (índice 1)
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

        // Verificar se o usuário já existe pelo email
        const existingUser = await getUserFromSheet(newUser.email);
        if (existingUser) {
          return res.status(409).json({ error: 'Usuário já existe com este e-mail.' });
        }

        // Gerar ID único para o novo usuário
        const allRows = await getSheetValues(sheetName, 'A:H');
        let newUserId;
        do {
          newUserId = Math.floor(1000 + Math.random() * 9000).toString();
        } while (allRows.some(row => row[0] === newUserId));

        // Adicionar o novo usuário à planilha
        await appendValuesToSheet(sheetName, [
          [
            newUserId,
            newUser.name,
            newUser.email,
            newUser.profile,
            newUser.squad,
            newUser.chamado ? 'TRUE' : 'FALSE',
            newUser.telefone ? 'TRUE' : 'FALSE',
            newUser.chat ? 'TRUE' : 'FALSE',
          ],
        ]);

        // Ordenar usuários após a adição
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

        return res.status(201).json({ message: 'Usuário adicionado com sucesso.', id: newUserId });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando usuário...');
        const updatedUser = req.body;

        if (!updatedUser.id) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        const userToUpdate = await getUserFromSheet(updatedUser.email);
        if (!userToUpdate) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Atualizar informações do usuário na planilha
        await updateUserProfile(updatedUser.email, updatedUser.profile);

        // Ordenar usuários após a atualização
        await sortUsersByName(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de atualização no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'update_user', 'Usuário', {
            userId: userToUpdate[0],
            name: userToUpdate[1],
            email: userToUpdate[2],
          }, {
            userId: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          }, 'manage-user');
          console.log('Ação de atualização registrada com sucesso.');
        }

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
        await deleteSheetRow(sheetName, deleteRowIndex + 1);

        // Ordenar usuários após a exclusão
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
