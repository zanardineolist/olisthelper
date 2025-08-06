export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Simple API - Iniciando...');
    console.log('Simple API - GEMINI_API_KEY configurada:', !!process.env.GEMINI_API_KEY);
    
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Verificar se a API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      console.error('Simple API - GEMINI_API_KEY não encontrada');
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    console.log('Simple API - Importando GoogleGenerativeAI...');
    
    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    console.log('Simple API - Inicializando Gemini...');
    
    // Teste simples do Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    console.log('Simple API - Gerando conteúdo...');
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
    console.error('Simple API - Erro detalhado:', error);
    console.error('Simple API - Stack trace:', error.stack);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 