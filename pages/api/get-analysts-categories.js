import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Obter categorias
    const categoriesResponse = await getSheetValues('Categorias', 'A2:A');
    const categories = categoriesResponse.flat();

    // Obter analistas
    const rows = await getSheetValues('Usuários', 'A:D');
    const analysts = rows
      .filter((row) => row[3] === 'analyst')
      .map((row) => ({
        id: row[0],
        name: row[1],
      }));

    res.status(200).json({ analysts, categories });
  } catch (error) {
    console.error('Erro ao obter analistas e categorias:', error);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}