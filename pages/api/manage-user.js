import { getSheetValues, appendValuesToSheet, updateSheetRow, deleteSheetRow, getUserFromSheet, getAuthenticatedGoogleSheets, addCheckboxesToColumns } from '../../utils/googleSheets';
import { logAction } from '../../utils/firebase/firebaseLogging';
import { cache } from '../../utils/cache';

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

    // Realizando a ordenação incluindo todas as colunas relevantes
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8,
              },
              sortSpecs: [
                {
                  dimensionIndex: 1,
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

async function invalidateCache(sheetName) {
  const cacheKey = `sheet_${sheetName}_A:H`;
  cache.delete(cacheKey); // Remover o cache após cada operação de modificação para garantir que os dados sejam atualizados
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
    // Obtendo todos os usuários antes de realizar operações de PUT e DELETE
    const allRows = await getSheetValues(sheetName, 'A:H');

    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando usuários...');
        if (allRows && allRows.length > 1) {
          const users = allRows.slice(1).map((row) => ({
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
        ], true); // Passar 'true' para adicionar checkboxes

        // Ordenar usuários após a adição
        await sortUsersByName(sheetName);

        // Invalida o cache após adicionar um novo usuário
        await invalidateCache(sheetName);

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

        // Buscar o índice da linha do usuário para atualização
        const updateRowIndex = allRows.findIndex(row => row[0] === updatedUser.id);
        if (updateRowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Atualizar informações do usuário na planilha
        await updateSheetRow(sheetName, updateRowIndex + 2, [
          updatedUser.id,
          updatedUser.name,
          updatedUser.email,
          updatedUser.profile,
          updatedUser.squad,
          updatedUser.chamado ? 'TRUE' : 'FALSE',
          updatedUser.telefone ? 'TRUE' : 'FALSE',
          updatedUser.chat ? 'TRUE' : 'FALSE',
        ]);

        // Ordenar usuários após a atualização
        await sortUsersByName(sheetName);

        // Invalida o cache após a atualização de um usuário
        await invalidateCache(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de atualização no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'update_user', 'Usuário', {
            userId: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          }, null, 'manage-user');
          console.log('Ação de atualização registrada com sucesso.');
        }

        return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo usuário...');
        const deleteUserId = req.query.id;

        if (!deleteUserId) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        // Buscar índice da linha do usuário para exclusão
        const deleteRowIndex = allRows.findIndex(row => row[0] === deleteUserId);
        if (deleteRowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Excluir o usuário da planilha
        await deleteSheetRow(sheetName, deleteRowIndex + 2);

        // Ordenar usuários após a exclusão
        await sortUsersByName(sheetName);

        // Invalida o cache após excluir um usuário
        await invalidateCache(sheetName);

        if (isUserValid) {
          console.log('Registrando ação de exclusão no Firebase...');
          await logAction(req.user.id, req.user.name, req.user.role, 'delete_user', 'Usuário', {
            userId: deleteUserId,
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