// pages/api/sync-performance.js
import syncPerformanceData from '../../utils/syncPerformanceData';

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificação mais robusta do token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização ausente ou inválido' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const startTime = Date.now();
    console.log('Iniciando sincronização:', new Date().toISOString());

    const result = await syncPerformanceData();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (result.success) {
      console.log(`Sincronização concluída em ${duration}s:`, result);
      res.status(200).json({
        message: 'Sincronização realizada com sucesso',
        details: result,
        duration: `${duration}s`
      });
    } else {
      console.error('Falha na sincronização:', result.error);
      res.status(500).json({
        error: 'Erro durante a sincronização',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}