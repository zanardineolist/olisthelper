import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtendo os valores diretamente da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const rows = await getSheetValues('Usuários', 'A2:I');  // Incluindo a coluna I para permissões

    if (rows && rows.length > 0) {
      const users = rows.map(row => {
        const remoteAccess = row[8]?.toString().trim().toLowerCase() === 'TRUE';

        return {
          id: row[0],
          name: row[1],
          email: row[2],
          role: row[3],
          squad: row[4],
          chamado: row[5],
          telefone: row[6],
          chat: row[7],
          remoteAccess: remoteAccess // True se "Sim", False caso contrário
        };
      });

      // Log para verificar os usuários carregados e suas permissões
      console.log("Usuários carregados:", users);

      return res.status(200).json({ users });
    }

    return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
