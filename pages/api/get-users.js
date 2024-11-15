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
        const remoteAccessRaw = row[8];

        // Log para depuração do valor da coluna "Remoto"
        console.log("Valor da célula 'Remoto':", remoteAccessRaw);

        // Lógica atualizada para determinar o acesso remoto
        const remoteAccess = ['TRUE', 'VERDADEIRO', 'true', 'verdadeiro', 1].includes(
          remoteAccessRaw?.toString().trim().toUpperCase()
        );

        return {
          id: row[0],
          name: row[1],
          email: row[2],
          role: row[3],
          remoteAccess: remoteAccess,
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
