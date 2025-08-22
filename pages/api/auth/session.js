// pages/api/auth/session.js
// Endpoint específico para a extensão verificar a sessão do usuário

import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[DEBUG] Verificando sessão...');
    console.log('[DEBUG] Headers:', req.headers.cookie ? 'Cookies presentes' : 'Sem cookies');
    
    // Obter a sessão do usuário
    const session = await getServerSession(req, res, authOptions);
    
    console.log('[DEBUG] Sessão obtida:', session ? 'Sessão válida' : 'Sem sessão');
    
    if (!session) {
      console.log('[DEBUG] Retornando 401 - Não autenticado');
      return res.status(401).json({ error: 'Não autenticado' });
    }

    console.log('[DEBUG] Sessão válida para usuário:', session.user?.email);
    
    // Retornar dados da sessão no formato esperado pela extensão
    return res.status(200).json({
      user: {
        id: session.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        profile: session.user.profile || session.role
      },
      expires: session.expires,
      accessToken: session.accessToken || null
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}