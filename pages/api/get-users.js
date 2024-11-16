import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const rows = await getSheetValues('Usuários', 'A2:I');

    if (rows && rows.length > 0) {
      const users = rows.map(row => {
        const roles = row[3] ? row[3].split(',').map(role => role.trim()) : [];
        
        return {
          id: row[0],
          name: row[1],
          email: row[2],
          roles, // Transforma a coluna de perfis em um array de strings
          squad: row[4] || null,
          hasChamado: row[5] && row[5].toString().trim().toUpperCase() === 'TRUE',
          hasTelefone: row[6] && row[6].toString().trim().toUpperCase() === 'TRUE',
          hasChat: row[7] && row[7].toString().trim().toUpperCase() === 'TRUE',
        };
      });
      return res.status(200).json({ users });
    }

    return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}