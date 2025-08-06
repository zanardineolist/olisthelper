import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Teste simples sem autenticação
    console.log('Simple API - Testando Gemini...');
    
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Teste simples do Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Responda em português: ${message}`);
    const response = await result.response;
    const text = response.text();

    console.log('Simple API - Resposta gerada com sucesso');

    return res.status(200).json({
      success: true,
      response: text,
      message: 'Teste simples funcionando'
    });

  } catch (error) {
    console.error('Erro no teste simples:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 