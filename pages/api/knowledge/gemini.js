// pages/api/knowledge/gemini.js
import { queryGeminiWithKnowledge } from '../../../utils/supabase/knowledgeQueries';

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Consulta não fornecida' });
    }

    // Usar a função atualizada do queryGeminiWithKnowledge
    const result = await queryGeminiWithKnowledge(userId, query);
    return res.status(200).json({ response: result.response });
  } catch (error) {
    console.error('Erro ao processar consulta Gemini:', error);
    return res.status(500).json({ error: 'Erro ao processar sua consulta' });
  }
}