import { getChannelTargets } from '../../utils/supabase/performanceQueriesNew';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Buscar metas dos canais
    const targets = await getChannelTargets();
    
    if (!targets) {
      return res.status(404).json({ message: 'Metas não encontradas' });
    }

    // Formatar as metas para o frontend
    const formattedTargets = {
      chamados: targets.chamados ? {
        quantity: targets.chamados.target_quantity || 600,
        tma_hours: parseFloat(targets.chamados.target_tma?.split(':')[0]) || 30,
        csat_percent: targets.chamados.target_csat || 90,
        quality_percent: targets.chamados.target_quality || 80
      } : null,
      
      telefone: targets.telefone ? {
        tma_minutes: targets.telefone.target_tma || '15:00',
        csat_rating: targets.telefone.target_csat || 4.5,
        quality_percent: targets.telefone.target_quality || 80
      } : null,
      
      chat: targets.chat ? {
        quantity: targets.chat.target_quantity || 32,
        tma_minutes: targets.chat.target_tma || '15:00',
        csat_score: targets.chat.target_csat || 95,
        quality_percent: targets.chat.target_quality || 80
      } : null
    };

    res.status(200).json({
      success: true,
      targets: formattedTargets
    });

  } catch (error) {

    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 