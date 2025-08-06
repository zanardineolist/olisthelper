import { getSession } from 'next-auth/react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    
    console.log('Test API - Session:', session);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Teste simples do Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Responda apenas: "Teste funcionando"');
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      response: text,
      session: {
        user: session.user?.email,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Erro no teste:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 