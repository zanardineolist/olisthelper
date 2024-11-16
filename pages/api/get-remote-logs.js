import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userId, role } = req.query;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetName = 'Remoto';

    // Buscar todos os registros na aba "Remoto"
    const rows = await getSheetValues(sheetName, 'A2:E');

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum registro encontrado.' });
    }

    // Transformar os registros em objetos
    const registros = rows.map(row => ({
      data: row[0],
      hora: row[1],
      usuario: row[2],
      chamado: row[3],
      tema: row[4],
    }));

    // Filtrar os registros com base no perfil do usuário
    let registrosFiltrados;
    if (role === 'super') {
      // Perfil "super" pode ver todos os registros
      registrosFiltrados = registros;
    } else {
      // Outros perfis só podem ver seus próprios registros
      registrosFiltrados = registros.filter(registro => registro.usuario === userId);
    }

    return res.status(200).json({ registros: registrosFiltrados });
  } catch (error) {
    console.error('Erro ao buscar registros remotos:', error);
    return res.status(500).json({ error: 'Erro ao buscar registros. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}
