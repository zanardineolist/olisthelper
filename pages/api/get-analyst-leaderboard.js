// pages/api/get-analyst-leaderboard.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';
import { cache, CACHE_TIMES } from '../../utils/cache';
import edgeConfig from '../../utils/edgeConfig';
import { zonedTimeToUtc } from 'date-fns-tz';

const { setEdgeConfig, isEdgeConfigAvailable } = edgeConfig;

export default async function handler(req, res) {
  const { analystId } = req.query;

  // Verificar se o ID do analista foi fornecido
  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    const cacheKey = `leaderboard_${analystId}`;
    
    // Tentar buscar do cache (local ou Edge Config)
    const cachedLeaderboard = await cache.get(cacheKey);
    if (cachedLeaderboard) {
      return res.status(200).json({ rows: cachedLeaderboard });
    }

    // Autenticar e obter metadados da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();

    // Buscar a aba que corresponde ao ID do analista
    const sheetName = sheetMeta.data.sheets.find((sheet) => {
      return sheet.properties.title.startsWith(`#${analystId}`);
    })?.properties.title;

    if (!sheetName) {
      console.log(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    // Caso a aba seja encontrada, obter os valores
    const rows = await getSheetValues(sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado na aba especificada.');
      return res.status(200).json({ rows: [] });
    }

    // Filtro para dados do DIA ATUAL, últimos 7 dias e últimos 30 dias
    const currentDate = zonedTimeToUtc(new Date(), 'America/Sao_Paulo');
    const rowsFiltered = {
      today: [],
      last7Days: [],
      last30Days: [],
    };

    rows.forEach((row, index) => {
      if (index === 0) return; // Ignorar cabeçalho

      const [dateStr] = row;
      if (!dateStr || !dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        console.warn('Formato de data inválido em:', dateStr);
        return;
      }

      const [day, month, year] = dateStr.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);
      const diffInDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        rowsFiltered.today.push(row);
      }
      if (diffInDays >= 0 && diffInDays <= 7) {
        rowsFiltered.last7Days.push(row);
      }
      if (diffInDays >= 0 && diffInDays <= 30) {
        rowsFiltered.last30Days.push(row);
      }
    });

    // Armazenar no cache (local e Edge Config)
    cache.set(cacheKey, rowsFiltered, CACHE_TIMES.PERFORMANCE);

    // Verificar disponibilidade do Edge Config antes de definir
    if (isEdgeConfigAvailable) {
      await setEdgeConfig(cacheKey, rowsFiltered, { ttl: CACHE_TIMES.PERFORMANCE / 1000 });
    }

    return res.status(200).json({ rows: rowsFiltered });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}