import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Autenticar e obter valores da planilha
    const sheets = await getAuthenticatedGoogleSheets();

    // Obter usuários
    const rows = await getSheetValues('Usuários', 'A:D');
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Filtrar usuários com perfil "support"
    const supportUsers = rows
      .filter(row => row[3]?.toLowerCase() === 'support')
      .map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
      }));

    return res.status(200).json({ users: supportUsers });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
