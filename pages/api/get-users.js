import { getAuthenticatedGoogleSheets, getSheetValues } from '../../utils/googleSheets';
import { cache, CACHE_TIMES } from '../../utils/cache';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheKey = 'users_list';
    
    // Primeiro tenta buscar do cache (local ou Edge)
    const cachedUsers = await cache.get(cacheKey);
    if (cachedUsers) {
      return res.status(200).json({ users: cachedUsers });
    }

    // Autenticar no Google Sheets e buscar valores caso não estejam no cache
    const sheets = await getAuthenticatedGoogleSheets();
    const rows = await getSheetValues('Usuários', 'A2:H'); // Reduzido para A2:H

    if (rows && rows.length > 0) {
      const users = rows.map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
        role: row[3],
        squad: row[4] || null,
        chamado: row[5] === 'TRUE',
        telefone: row[6] === 'TRUE',
        chat: row[7] === 'TRUE',
      }));

      // Armazenar os usuários no cache local e no Edge Config para futuras requisições
      cache.set(cacheKey, users, CACHE_TIMES.USERS);

      return res.status(200).json({ users });
    }

    return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({
      error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.',
    });
  }
}