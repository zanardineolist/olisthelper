// pages/api/update-cache.js
import { cache, CACHE_TIMES } from '../../utils/cache';
import { getSheetValues } from '../../utils/googleSheets';

// Função para processar atualizações em fila
const updateQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || updateQueue.length === 0) return;
  isProcessing = true;

  while (updateQueue.length > 0) {
    const { sheetName, range, updatedData } = updateQueue.shift();
    try {
      const cacheKey = `sheet_${sheetName}_${range}`;
      const updatedValues = await getSheetValues(sheetName, range);

      // Atualiza no cache local
      cache.set(cacheKey, updatedValues, CACHE_TIMES.SHEET_VALUES);
    } catch (error) {
      console.error('Erro ao atualizar o cache para fila:', error);
    }
  }

  isProcessing = false;
}

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

    // Adicionar à fila de atualizações
    updateQueue.push({ sheetName, range, updatedData });
    processQueue();

    return res.status(200).json({ message: 'Cache atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar o cache:', error);
    return res.status(500).json({ error: 'Erro ao atualizar o cache' });
  }
}
