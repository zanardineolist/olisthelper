// pages/api/sync-performance.js
import syncPerformanceData from '../../utils/syncPerformanceData';

export default async function handler(req, res) {
  // Verificar se a requisição tem o header de autorização correto
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET_KEY}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const success = await syncPerformanceData();
    if (success) {
      res.status(200).json({ message: 'Sincronização realizada com sucesso' });
    } else {
      res.status(500).json({ error: 'Erro durante a sincronização' });
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}