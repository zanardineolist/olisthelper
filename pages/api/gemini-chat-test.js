import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Test API - Iniciando...');
    
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Test API - Session:', session ? 'OK' : 'NÃO AUTORIZADO');
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Verificar se a API key está configurada
    console.log('Test API - GEMINI_API_KEY configurada:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('Test API - GEMINI_API_KEY não encontrada');
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    console.log('Test API - Importando GoogleGenerativeAI...');
    
    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    console.log('Test API - Inicializando Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('Test API - Gerando conteúdo...');
    const result = await model.generateContent('Responda apenas: "Teste funcionando"');
    const response = await result.response;
    const text = response.text();

    console.log('Test API - Resposta gerada com sucesso');

    return res.status(200).json({
      success: true,
      response: text,
      session: {
        user: session.user?.email,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Test API - Erro detalhado:', error);
    console.error('Test API - Stack trace:', error.stack);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 