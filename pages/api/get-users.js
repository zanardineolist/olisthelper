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
        const remotoValue = row[8] && row[8].toString().trim().toUpperCase() === 'TRUE';

        return {
          id: row[0],
          name: row[1],
          email: row[2],
          role: row[3],
          squad: row[4] || null,
          chamado: row[5] && row[5].toString().trim().toUpperCase() === 'TRUE',
          telefone: row[6] && row[6].toString().trim().toUpperCase() === 'TRUE',
          chat: row[7] && row[7].toString().trim().toUpperCase() === 'TRUE',
          remoto: remotoValue,
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
