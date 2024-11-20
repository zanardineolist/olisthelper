// pages/api/update-cache.js
import { cache, CACHE_TIMES } from '../../utils/cache';
import { setEdgeConfig } from '@vercel/edge-config';
import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Controle de Acesso no Webhook - Verificar Token
    const authToken = req.headers['x-auth-token'];
    if (!authToken || authToken !== process.env.WEBHOOK_AUTH_TOKEN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Validar Dados no Payload
    const { sheetName, range, updatedData } = req.body;
    if (!sheetName || !range) {
      return res.status(400).json({ error: 'Nome da aba e intervalo são obrigatórios' });
    }

    // Limitar Atualizações Desnecessárias (Debounce)
    if (cache.get(`debounce_${sheetName}_${range}`)) {
      return res.status(429).json({ error: 'Solicitação de atualização muito frequente' });
    }
    cache.set(`debounce_${sheetName}_${range}`, true, 5000); // Debounce de 5 segundos

    // Atualizar o cache para a aba específica
    const cacheKey = `sheet_${sheetName}_${range}`;
    const updatedValues = await getSheetValues(sheetName, range);

    // Atualiza no cache local e também no Edge Config
    cache.set(cacheKey, updatedValues, CACHE_TIMES.SHEET_VALUES);
    await setEdgeConfig(cacheKey, updatedValues, { ttl: CACHE_TIMES.SHEET_VALUES / 1000 });

    return res.status(200).json({ message: 'Cache atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar o cache:', error);
    return res.status(500).json({ error: 'Erro ao atualizar o cache' });
  }
}