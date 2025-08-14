// pages/api/security/stats.js
// API para estatísticas de segurança

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
const securityMonitor = require('../../../utils/securityMonitor');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar sessão
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar se é admin
    if (session.role !== 'super' && session.role !== 'dev') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Obter estatísticas
    const stats = securityMonitor.getStats();
    
    // Log de acesso
    securityMonitor.logEvent('STATS_ACCESS', {
      userId: session.id,
      userEmail: session.user.email,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de segurança:', error);
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
