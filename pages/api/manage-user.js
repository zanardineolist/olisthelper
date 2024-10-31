import { getSheetValues, addSheetRow, updateSheetRow, deleteSheetRow, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';

async function sortUsersByName(sheetName) {
  const sheets = await getAuthenticatedGoogleSheets();
  const sheetId = process.env.SHEET_ID;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          sortRange: {
            range: {
              sheetId: 0, // Atualize conforme necessário
              startRowIndex: 1, // Ignorar a linha de cabeçalho
              endRowIndex: null, // Até o final
              startColumnIndex: 0,
              endColumnIndex: 8,
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
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    const sheetName = 'Usuários';

    switch (method) {
      case 'GET':
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
        const newUser = req.body;
        const allRows = await getSheetValues(sheetName, 'A:H');
        let userId;
        do {
          userId = Math.floor(1000 + Math.random() * 9000).toString();
        } while (allRows.some(row => row[0] === userId));

        await addSheetRow(sheetName, [
          userId,
          newUser.name,
          newUser.email,
          newUser.profile,
          newUser.squad,
          newUser.chamado ? 'TRUE' : 'FALSE',
          newUser.telefone ? 'TRUE' : 'FALSE',
          newUser.chat ? 'TRUE' : 'FALSE',
        ]);
        await sortUsersByName(sheetName);
        return res.status(201).json({ message: 'Usuário adicionado com sucesso.', id: userId });

      case 'PUT':
        const updatedUser = req.body;
        const allRowsUpdate = await getSheetValues(sheetName, 'A:H');

        const rowIndex = allRowsUpdate.findIndex((row) => row[0] === updatedUser.id);
        if (rowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        await updateSheetRow(sheetName, rowIndex + 1, [
          updatedUser.id,
          updatedUser.name,
          updatedUser.email,
          updatedUser.profile,
          updatedUser.squad,
          updatedUser.chamado ? 'TRUE' : 'FALSE',
          updatedUser.telefone ? 'TRUE' : 'FALSE',
          updatedUser.chat ? 'TRUE' : 'FALSE',
        ]);
        await sortUsersByName(sheetName);
        return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });

      case 'DELETE':
        const deleteUserId = req.query.id;

        if (!deleteUserId) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        const userRows = await getSheetValues(sheetName, 'A:H');
        const deleteRowIndex = userRows.findIndex((row) => row[0] === deleteUserId);
        if (deleteRowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        await deleteSheetRow(sheetName, deleteRowIndex + 1);
        await sortUsersByName(sheetName);
        return res.status(200).json({ message: 'Usuário excluído com sucesso.' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido.`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de usuário:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
