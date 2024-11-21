import { cache } from '../../utils/cache';
import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Middleware de autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.WEBHOOK_AUTH_TOKEN) {
    return res.status(403).json({ error: 'Token de autenticação inválido.' });
  }

  try {
    const { sheetName, range } = req.body;
    if (!sheetName || !range) {
      return res.status(400).json({ error: 'Nome da aba e intervalo são obrigatórios.' });
    }

    const cacheKey = `sheet_${sheetName}_${range}`;

    // Atualiza o cache para o intervalo específico que foi modificado
    await cache.updateCache(cacheKey, () => getSheetValues(sheetName, range), CACHE_TIMES.SHEET_VALUES);

    return res.status(200).json({ message: 'Cache atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar cache:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cache.' });
  }
}