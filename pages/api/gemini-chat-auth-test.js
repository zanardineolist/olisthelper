import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        message: 'Não autorizado',
        session: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Autenticação OK',
      session: {
        user: session.user?.email,
        role: session.role,
        name: session.user?.name
      }
    });

  } catch (error) {
    console.error('Erro no teste de auth:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 