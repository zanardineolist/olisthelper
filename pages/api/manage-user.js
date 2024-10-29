import { getAuthenticatedGoogleSheets, getSheetValues, updateSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    if (method === 'GET') {
      // Obtém todos os usuários
      const rows = await getSheetValues(sheetId, 'Usuários', 'A:H');
      if (rows.length > 0) {
        const users = rows.map(row => ({
          id: row[0],
          name: row[1],
          email: row[2],
          role: row[3],
          squad: row[4],
          chamado: row[5] === 'TRUE',
          telefone: row[6] === 'TRUE',
          chat: row[7] === 'TRUE'
        }));
        return res.status(200).json({ users });
      } else {
        return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
      }
    } else if (method === 'POST') {
      // Adiciona um novo usuário
      const { name, email, role, squad, chamado, telefone, chat } = req.body;
      await updateSheetValues(sheetId, 'Usuários', [
        [name, email, role, squad, chamado ? 'TRUE' : 'FALSE', telefone ? 'TRUE' : 'FALSE', chat ? 'TRUE' : 'FALSE']
      ]);
      return res.status(201).json({ message: 'Usuário adicionado com sucesso.' });
    } else if (method === 'PUT') {
      // Atualiza um usuário existente
      const { id, name, email, role, squad, chamado, telefone, chat } = req.body;
      const rows = await getSheetValues(sheetId, 'Usuários', 'A:H');
      const userIndex = rows.findIndex(row => row[0] == id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      rows[userIndex] = [id, name, email, role, squad, chamado ? 'TRUE' : 'FALSE', telefone ? 'TRUE' : 'FALSE', chat ? 'TRUE' : 'FALSE'];
      await updateSheetValues(sheetId, 'Usuários', rows);
      return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
    } else if (method === 'DELETE') {
      // Remove um usuário existente
      const { id } = req.query;
      const rows = await getSheetValues(sheetId, 'Usuários', 'A:H');
      const userIndex = rows.findIndex(row => row[0] == id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      rows.splice(userIndex, 1);
      await updateSheetValues(sheetId, 'Usuários', rows);
      return res.status(200).json({ message: 'Usuário removido com sucesso.' });
    } else {
      return res.status(405).json({ error: 'Método não permitido.' });
    }
  } catch (error) {
    console.error('Erro ao gerenciar usuário:', error);
    return res.status(500).json({ error: 'Erro ao gerenciar usuário. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
