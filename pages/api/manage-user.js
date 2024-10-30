import { getSheetValues, addSheetRow, updateSheetRow, deleteSheetRow } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const sheetName = 'Usuários';  // Certifique-se de usar o nome correto da aba

    switch (method) {
      case 'GET':
        // Obter todos os usuários
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
        // Adicionar novo usuário
        const newUser = req.body;
        await addSheetRow(sheetName, [
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.profile,
          newUser.squad,
          newUser.chamado ? 'TRUE' : 'FALSE',
          newUser.telefone ? 'TRUE' : 'FALSE',
          newUser.chat ? 'TRUE' : 'FALSE',
        ]);
        return res.status(201).json({ message: 'Usuário adicionado com sucesso.' });

      case 'PUT':
        // Editar um usuário existente
        const updatedUser = req.body;
        const allRows = await getSheetValues(sheetName, 'A:H');

        const rowIndex = allRows.findIndex((row) => row[0] === updatedUser.id);
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
        return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });

      case 'DELETE':
        // Excluir um usuário
        const { userId } = req.query;

        const userRows = await getSheetValues(sheetName, 'A:H');
        const deleteRowIndex = userRows.findIndex((row) => row[0] === userId);
        if (deleteRowIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        await deleteSheetRow(sheetName, deleteRowIndex + 1);
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
