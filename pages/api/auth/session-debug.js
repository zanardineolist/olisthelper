// pages/api/auth/session-debug.js
// Endpoint de debug para verificar problemas de sessão

import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[DEBUG] === INÍCIO DEBUG SESSÃO ===');
    console.log('[DEBUG] Headers recebidos:', {
      cookie: req.headers.cookie ? 'Presente' : 'Ausente',
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer
    });
    
    // Método 1: getServerSession
    console.log('[DEBUG] Tentando getServerSession...');
    const session = await getServerSession(req, res, authOptions);
    console.log('[DEBUG] getServerSession resultado:', session ? 'Sessão encontrada' : 'Sem sessão');
    
    // Método 2: getToken
    console.log('[DEBUG] Tentando getToken...');
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log('[DEBUG] getToken resultado:', token ? 'Token encontrado' : 'Sem token');
    
    // Análise de cookies
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map(c => c.trim());
      const authCookies = cookies.filter(c => c.includes('next-auth'));
      console.log('[DEBUG] Cookies de auth encontrados:', authCookies.length);
      authCookies.forEach(cookie => {
        const [name] = cookie.split('=');
        console.log('[DEBUG] Cookie auth:', name);
      });
    }
    
    console.log('[DEBUG] === FIM DEBUG SESSÃO ===');
    
    if (session) {
      return res.status(200).json({
        success: true,
        method: 'getServerSession',
        user: {
          id: session.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          profile: session.user.profile || session.role
        },
        expires: session.expires
      });
    }
    
    if (token) {
      return res.status(200).json({
        success: true,
        method: 'getToken',
        user: {
          id: token.id,
          name: token.name,
          email: token.email,
          image: token.picture,
          profile: token.role
        }
      });
    }
    
    return res.status(401).json({ 
      error: 'Não autenticado',
      debug: {
        hasSession: !!session,
        hasToken: !!token,
        hasCookies: !!req.headers.cookie
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Erro ao verificar sessão:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      debug: error.message
    });
  }
}