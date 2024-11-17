import { getAuthenticatedGoogleSheets } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const rows = await sheets.getRows();

    const userRow = rows.find(row => row.id === req.query.id);

    if (!userRow) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role,
      permissions: {
        manageUsers: userRow.manageUsers === 'TRUE',
        manageCategories: userRow.manageCategories === 'TRUE',
        manageRecords: userRow.manageRecords === 'TRUE',
      }
    };

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}
