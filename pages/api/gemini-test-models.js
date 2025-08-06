export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Test Models API - Iniciando...');
    console.log('Test Models API - GEMINI_API_KEY configurada:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    console.log('Test Models API - Importando GoogleGenerativeAI...');
    
    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    console.log('Test Models API - Inicializando Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('Test Models API - Listando modelos...');
    
    // Tentar listar modelos disponíveis
    try {
      const models = await genAI.listModels();
      console.log('Test Models API - Modelos encontrados:', models);
      
      return res.status(200).json({
        success: true,
        models: models,
        message: 'Modelos listados com sucesso'
      });
    } catch (listError) {
      console.error('Test Models API - Erro ao listar modelos:', listError);
      
      // Tentar com modelo específico (gratuito)
      try {
        console.log('Test Models API - Testando modelo gemini-2.0-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Teste simples');
        const response = await result.response;
        const text = response.text();
        
        console.log('Test Models API - Teste com gemini-2.0-flash bem-sucedido');
        
        return res.status(200).json({
          success: true,
          message: 'Modelo gemini-2.0-flash funcionando',
          testResponse: text
        });
      } catch (modelError) {
        console.error('Test Models API - Erro com modelo:', modelError);
        
        return res.status(500).json({
          success: false,
          error: 'Erro ao testar modelo',
          details: modelError.message
        });
      }
    }

  } catch (error) {
    console.error('Test Models API - Erro detalhado:', error);
    console.error('Test Models API - Stack trace:', error.stack);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 