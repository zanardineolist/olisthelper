import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();

    // Nome da planilha: 'Usuários', intervalo: todas as colunas necessárias
    const rows = await getSheetValues('Usuários', 'A2:L'); // Considerando que A2:L são os intervalos de colunas desejados

    if (rows && rows.length > 0) {
      // Encontrar a linha do usuário correspondente ao ID fornecido
      const userRow = rows.find(row => row[0] === req.query.id); // Considerando que a coluna A (índice 0) é a ID

      if (!userRow) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Criar o objeto de dados do usuário a partir da linha encontrada
      const userData = {
        id: userRow[0],
        name: userRow[1],
        role: userRow[3],
        permissions: {
          manageUsers: userRow[9] === 'TRUE' || userRow[9] === true,
          manageCategories: userRow[10] === 'TRUE' || userRow[10] === true,
          manageRecords: userRow[11] === 'TRUE' || userRow[11] === true,
        }
      };

      return res.status(200).json(userData);
    } else {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
