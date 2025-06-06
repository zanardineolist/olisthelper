import { supabaseAdmin } from './supabaseClient';

/**
 * Calcula o status de performance baseado em metas
 * @param {number} actual - Valor atual
 * @param {number} target - Meta a ser atingida
 * @param {string} type - Tipo de comparação: 'higher_better' ou 'lower_better'
 * @returns {string} Status: 'excellent', 'good', 'poor', 'neutral'
 */
const calculatePerformanceStatus = (actual, target, type = 'higher_better') => {
  if (!actual || !target || actual === 0) return 'neutral';
  
  if (type === 'lower_better') {
    // Para TMA - menor é melhor
    if (actual <= target) return 'excellent'; // Verde - Dentro da meta
    if (actual <= target * 1.5) return 'good'; // Amarelo - Até 50% acima da meta
    return 'poor'; // Vermelho - Muito acima da meta
  } else {
    // Para quantidade e CSAT - maior é melhor
    const percentage = (actual / target) * 100;
    if (percentage >= 100) return 'excellent'; // Verde - Meta atingida ou superada
    if (percentage >= 50) return 'good'; // Amarelo - Pelo menos 50% da meta
    return 'poor'; // Vermelho - Abaixo de 50% da meta
  }
};

/**
 * Converte tempo em formato HH:MM:SS para minutos
 * @param {string} timeString - Tempo no formato HH:MM:SS
 * @returns {number} Tempo em minutos
 */
const timeStringToMinutes = (timeString) => {
  if (!timeString || timeString === '00:00:00') return 0;
  
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  
  return hours * 60 + minutes + seconds / 60;
};

/**
 * Converte horas em formato numérico para minutos
 * @param {number} hours - Horas em formato decimal
 * @returns {number} Tempo em minutos
 */
const hoursToMinutes = (hours) => {
  return hours ? hours * 60 : 0;
};

/**
 * Formata tempo para exibição
 * @param {number} value - Valor a ser formatado
 * @param {string} format - Formato: 'hours' ou 'time'
 * @returns {string} Valor formatado
 */
const formatDisplayTime = (value, format = 'time') => {
  if (!value || value === 0) return '-';
  
  if (format === 'hours') {
    return `${value}h`;
  }
  
  return value; // Para formato HH:MM:SS já vem formatado
};

/**
 * Busca as metas dos canais
 * @returns {Promise<Object>} Metas organizadas por canal
 */
export async function getChannelTargets() {
  try {
    const { data, error } = await supabaseAdmin
      .from('channel_targets')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return data.reduce((acc, target) => {
      acc[target.channel_name] = target;
      return acc;
    }, {});
  } catch (error) {
    console.error('Erro ao buscar metas dos canais:', error);
    throw error;
  }
}

/**
 * Busca dados de performance de um usuário pelo email
 * @param {string} userEmail - Email do usuário
 * @returns {Promise<Object>} Dados de performance estruturados
 */
export async function getUserPerformanceByEmail(userEmail) {
  try {
    // Buscar dados de performance
    const { data: performance, error: performanceError } = await supabaseAdmin
      .from('performance_indicators')
      .select('*')
      .eq('user_email', userEmail.toLowerCase())
      .single();

    if (performanceError) {
      console.error('Erro ao buscar performance:', performanceError);
      throw new Error('Dados de performance não encontrados para este usuário.');
    }

    // Buscar permissões do usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('can_ticket, can_phone, can_chat, profile')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      throw new Error('Usuário não encontrado.');
    }

    // Verificar autorização
    const userProfile = user.profile.toLowerCase();
    if (!['support', 'support+', 'analyst', 'tax'].includes(userProfile)) {
      throw new Error('Usuário não autorizado a visualizar dados de performance.');
    }

    // Buscar metas dos canais
    const targets = await getChannelTargets();

    // Estruturar resposta base
    const response = {
      supervisor: performance.supervisor,
      diasTrabalhados: performance.dias_trabalhados,
      diasUteis: performance.dias_uteis,
      absenteismo: performance.absenteismo_percentage,
      atualizadoAte: performance.atualizado_ate,
      notaQualidade: performance.nota_qualidade,
      rfc: performance.rfc,
      canals: {
        chamado: user.can_ticket,
        telefone: user.can_phone,
        chat: user.can_chat
      }
    };

    // Adicionar dados de chamados se autorizado
    if (user.can_ticket && targets.chamados) {
      const chamadosTarget = targets.chamados;
      const tmaTargetMinutes = hoursToMinutes(parseFloat(chamadosTarget.target_tma.split(':')[0]));
      const actualTmaMinutes = hoursToMinutes(performance.chamados_tma_hours);

      response.chamados = {
        total: performance.chamados_total,
        mediaDia: performance.chamados_media_dia,
        tma: formatDisplayTime(performance.chamados_tma_hours, 'hours'),
        csat: performance.chamados_csat_percent,
        target: {
          quantity: chamadosTarget.target_quantity,
          tma: parseFloat(chamadosTarget.target_tma.split(':')[0]),
          csat: chamadosTarget.target_csat,
          quality: chamadosTarget.target_quality
        },
        status: {
          total: calculatePerformanceStatus(performance.chamados_total, chamadosTarget.target_quantity),
          tma: calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better'),
          csat: calculatePerformanceStatus(performance.chamados_csat_percent, chamadosTarget.target_csat),
          quality: calculatePerformanceStatus(performance.nota_qualidade, chamadosTarget.target_quality)
        },
        colors: {
          total: getStatusColor(calculatePerformanceStatus(performance.chamados_total, chamadosTarget.target_quantity)),
          tma: getStatusColor(calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better')),
          csat: getStatusColor(calculatePerformanceStatus(performance.chamados_csat_percent, chamadosTarget.target_csat))
        }
      };
    }

    // Adicionar dados de telefone se autorizado
    if (user.can_phone && targets.telefone) {
      const telefoneTarget = targets.telefone;
      const tmaTargetMinutes = timeStringToMinutes(telefoneTarget.target_tma);
      const actualTmaMinutes = timeStringToMinutes(performance.telefone_tma_time);

      response.telefone = {
        total: performance.telefone_total,
        mediaDia: performance.telefone_media_dia,
        tma: formatDisplayTime(performance.telefone_tma_time),
        csat: performance.telefone_csat_rating,
        perdidas: performance.telefone_perdidas,
        percentPerdidas: performance.telefone_percent_perdidas,
        target: {
          tma: telefoneTarget.target_tma,
          csat: telefoneTarget.target_csat,
          quality: telefoneTarget.target_quality
        },
        status: {
          tma: calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better'),
          csat: calculatePerformanceStatus(performance.telefone_csat_rating, telefoneTarget.target_csat),
          quality: calculatePerformanceStatus(performance.nota_qualidade, telefoneTarget.target_quality)
        },
        colors: {
          tma: getStatusColor(calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better')),
          csat: getStatusColor(calculatePerformanceStatus(performance.telefone_csat_rating, telefoneTarget.target_csat))
        }
      };
    }

    // Adicionar dados de chat se autorizado
    if (user.can_chat && targets.chat) {
      const chatTarget = targets.chat;
      const tmaTargetMinutes = timeStringToMinutes(chatTarget.target_tma);
      const actualTmaMinutes = timeStringToMinutes(performance.chat_tma_time);

      response.chat = {
        total: performance.chat_total,
        mediaDia: performance.chat_media_dia,
        tma: formatDisplayTime(performance.chat_tma_time),
        csat: performance.chat_csat_percent || '-',
        target: {
          quantity: chatTarget.target_quantity,
          tma: chatTarget.target_tma,
          csat: chatTarget.target_csat,
          quality: chatTarget.target_quality
        },
        status: {
          total: calculatePerformanceStatus(performance.chat_total, chatTarget.target_quantity),
          tma: calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better'),
          csat: performance.chat_csat_percent ? calculatePerformanceStatus(performance.chat_csat_percent, chatTarget.target_csat) : 'neutral',
          quality: calculatePerformanceStatus(performance.nota_qualidade, chatTarget.target_quality)
        },
        colors: {
          total: getStatusColor(calculatePerformanceStatus(performance.chat_total, chatTarget.target_quantity)),
          tma: getStatusColor(calculatePerformanceStatus(actualTmaMinutes, tmaTargetMinutes, 'lower_better')),
          csat: performance.chat_csat_percent ? getStatusColor(calculatePerformanceStatus(performance.chat_csat_percent, chatTarget.target_csat)) : 'var(--box-color3)'
        }
      };
    }

    return response;
  } catch (error) {
    console.error('Erro ao obter dados de performance:', error);
    throw error;
  }
}

/**
 * Converte status em cor
 * @param {string} status - Status da performance
 * @returns {string} Código da cor
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'excellent': return '#779E3D'; // Verde
    case 'good': return '#F0A028'; // Amarelo
    case 'poor': return '#E64E36'; // Vermelho
    default: return 'var(--box-color3)'; // Neutro
  }
};

/**
 * Busca todos os usuários com seus supervisores
 * @returns {Promise<Array>} Lista de usuários com supervisores
 */
export async function getUsersWithSupervisors() {
  try {
    const { data, error } = await supabaseAdmin
      .from('performance_indicators')
      .select('user_email, user_name, supervisor')
      .order('user_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuários com supervisores:', error);
    throw error;
  }
}

/**
 * Busca usuários por supervisor
 * @param {string} supervisor - Nome do supervisor
 * @returns {Promise<Array>} Lista de usuários do supervisor
 */
export async function getUsersBySupervisor(supervisor) {
  try {
    const { data, error } = await supabaseAdmin
      .from('performance_indicators')
      .select('user_email, user_name, supervisor')
      .eq('supervisor', supervisor)
      .order('user_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuários por supervisor:', error);
    throw error;
  }
} 