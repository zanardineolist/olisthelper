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
        
        // Log para depuração - isso ajuda a ver o que realmente está sendo retornado da célula.
        console.log("Valor da célula 'Remoto':", remoteAccessRaw);

        // Tratamento flexível para determinar se o valor do checkbox está marcado.
        const remoteAccess = (
          remoteAccessRaw === true ||                // Valor é booleano verdadeiro
          remoteAccessRaw === 'TRUE' ||              // Valor é string 'TRUE' (maiúsculo)
          remoteAccessRaw === 'true' ||              // Valor é string 'true' (minúsculo)
          remoteAccessRaw === 'VERDADEIRO' ||        // Valor é string 'VERDADEIRO' (em português)
          remoteAccessRaw === 1 ||                   // Valor é numérico 1 (algumas planilhas retornam checkbox assim)
          (typeof remoteAccessRaw === 'string' && remoteAccessRaw.trim().toUpperCase() === 'VERDADEIRO') // Variações de string
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
