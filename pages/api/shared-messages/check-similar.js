// pages/api/shared-messages/check-similar.js
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';
import stringSimilarity from 'string-similarity';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, content } = req.body;

  try {
    // Buscar todas as mensagens públicas
    const { data: messages, error } = await supabaseAdmin
      .from('shared_responses')
      .select('id, title, content')
      .eq('is_public', true);

    if (error) throw error;

    // Calcular similaridade
    const similar = messages
      .map(msg => ({
        ...msg,
        similarity: Math.max(
          stringSimilarity.compareTwoStrings(title.toLowerCase(), msg.title.toLowerCase()),
          stringSimilarity.compareTwoStrings(content.toLowerCase(), msg.content.toLowerCase())
        ) * 100
      }))
      .filter(msg => msg.similarity > 70) // Mostrar apenas >70% similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Mostrar top 3 mais similares

    return res.json({ similar });
  } catch (error) {
    console.error('Erro ao verificar similaridade:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}