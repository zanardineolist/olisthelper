import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Autenticar e obter valores da planilha
    const sheets = await getAuthenticatedGoogleSheets();

    // Obter categorias
    const categories = await getSheetValues('Categorias', 'A2:A');
    const formattedCategories = categories.flat();

    // Obter analistas
    const rows = await getSheetValues('Usuários', 'A:D');
    const analysts = rows
      .filter(row => row[3] === 'analyst')
      .map(row => ({
        id: row[0],
        name: row[1],
      }));

    return res.status(200).json({ analysts, categories: formattedCategories });
  } catch (error) {
    console.error('Erro ao obter analistas e categorias:', error);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}
