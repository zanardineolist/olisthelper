import { cache, CACHE_TIMES } from '../../utils/cache';
import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Método não permitido: ', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Middleware de autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Erro de autenticação: header não fornecido');
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.WEBHOOK_AUTH_TOKEN) {
    console.log('Token inválido: ', token);
    return res.status(403).json({ error: 'Token de autenticação inválido.' });
  }

  try {
    const { sheetName, range } = req.body;
    console.log('Dados recebidos: ', req.body);

    if (!sheetName || !range) {
      console.log('Erro: Nome da aba ou intervalo ausente');
      return res.status(400).json({ error: 'Nome da aba e intervalo são obrigatórios.' });
    }

    const cacheKey = `sheet_${sheetName}_A:H`;
    console.log('Atualizando cache com chave:', cacheKey);

    // Atualiza o cache para a aba inteira que foi modificada
    await cache.updateCache(cacheKey, () => getSheetValues(sheetName, 'A:H'), CACHE_TIMES.SHEET_VALUES);

    console.log('Cache atualizado com sucesso.');
    return res.status(200).json({ message: 'Cache atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar cache:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar cache.' });
  }
}
