// pages/api/auth/permissions.js
// API segura para buscar permissões do usuário

import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { getUserPermissions } from '../../../utils/supabase/supabaseClient';
const securityLogger = require('../../../utils/securityLogger');

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

    // Buscar permissões do usuário
    const permissions = await getUserPermissions(session.id);
    
    if (!permissions) {
      securityLogger.logAuthError('Falha ao buscar permissões', { 
        userId: session.id, 
        context: 'PERMISSIONS_API' 
      });
      return res.status(500).json({ error: 'Erro ao buscar permissões' });
    }

    // Log de acesso bem-sucedido
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    securityLogger.logRouteAccess('/api/auth/permissions', session.id, clientIP, true);

    // Retornar apenas permissões necessárias (sem dados sensíveis)
    return res.status(200).json({
      profile: permissions.profile,
      can_ticket: permissions.can_ticket,
      can_phone: permissions.can_phone,
      can_chat: permissions.can_chat,
      can_register_help: permissions.can_register_help,
      can_remote_access: permissions.can_remote_access,
      admin: permissions.admin
    });

  } catch (error) {
    securityLogger.logAuthError(error, { 
      context: 'PERMISSIONS_API',
      errorType: 'PERMISSIONS_FETCH_ERROR'
    });
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
