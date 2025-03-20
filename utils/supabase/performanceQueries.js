// utils/supabase/performanceQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Formata o tempo para exibição
 * @param {string} time - Tempo a ser formatado
 * @returns {string} Tempo formatado
 */
const formatTime = (time) => {
  if (!time) return "-";
  return time;
};

/**
 * Formata horas para exibição
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado com 'h'
 */
const formatHours = (value) => {
  if (value === null) {
    return "-";
  }
  return `${value}h`;
};

/**
 * Determina a cor com base no valor e limite
 * @param {number} value - Valor a ser avaliado
 * @param {number} threshold - Limite para comparação
 * @param {boolean} isGreaterBetter - Se valores maiores são melhores
 * @returns {string} Código de cor
 */
const getColorForValue = (value, threshold, isGreaterBetter = true) => {
  if (value === null || isNaN(value)) {
    return 'var(--box-color3)';
  }
  return (isGreaterBetter ? value >= threshold : value <= threshold) ? '#779E3D' : '#E64E36';
};

/**
 * Busca os dados de performance de um usuário pelo email
 * @param {string} userEmail - Email do usuário
 * @returns {Promise<Object>} Dados de performance do usuário
 */
export async function getUserPerformance(userEmail) {
  try {
    // Buscar dados do usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (userError || !user) {
      throw new Error('Usuário não encontrado.');
    }

    const userProfile = user.profile.toLowerCase();

    // Verificar se o perfil do usuário é "support", "analyst" ou "tax"
    if (!['support', 'support+', 'analyst', 'tax'].includes(userProfile)) {
      throw new Error('Usuário não autorizado a visualizar os dados de desempenho.');
    }

    // Buscar dados de desempenho
    const { data: performance, error: performanceError } = await supabaseAdmin
      .from('user_performance')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (performanceError) {
      console.error('Erro ao buscar desempenho:', performanceError);
      throw new Error('Nenhum dado de desempenho encontrado.');
    }

    const hasChamado = (userProfile === 'support' || userProfile === 'support+' || userProfile === 'tax') ? user.can_ticket : true;
    const hasTelefone = user.can_phone;
    const hasChat = user.can_chat;

    // Estrutura de retorno dos dados de desempenho
    const responsePayload = {
      squad: user.squad,
      chamado: hasChamado,
      telefone: hasTelefone,
      chat: hasChat,
      atualizadoAte: performance?.atualizado_ate || "Data não disponível",
      // Novos campos de dias trabalhados e absenteísmo
      diasTrabalhados: performance?.dias_trabalhados || 0,
      diasUteis: performance?.dias_uteis || 0,
      absenteismo: performance?.absente_percentage || 0,
    };

    if (hasChamado && performance) {
      responsePayload.chamados = {
        totalChamados: performance.total_chamados,
        mediaPorDia: performance.chamados_media_dia,
        tma: formatHours(performance.chamados_tma),
        csat: performance.chamados_csat,
        colors: {
          mediaPorDia: getColorForValue(performance.chamados_media_dia, 25),
          tma: getColorForValue(performance.chamados_tma, 30, false),
          csat: getColorForValue(performance.chamados_csat, 95),
        }
      };
    }

    if (hasTelefone && performance) {
      responsePayload.telefone = {
        totalTelefone: performance.total_telefone,
        mediaPorDia: performance.telefone_media_dia,
        tma: formatTime(performance.telefone_tma),
        csat: performance.telefone_csat,
        perdidas: performance.telefone_perdidas,
        colors: {
          tma: getColorForValue(performance.telefone_tma, 15, false),
          csat: getColorForValue(performance.telefone_csat, 3.7),
        }
      };
    }

    if (hasChat && performance) {
      responsePayload.chat = {
        totalChats: performance.total_chats,
        mediaPorDia: performance.chat_media_dia,
        tma: formatTime(performance.chat_tma),
        csat: performance.chat_csat !== null ? performance.chat_csat : "-",
        colors: {
          tma: getColorForValue(performance.chat_tma, 20, false),
          csat: getColorForValue(performance.chat_csat, 95),
        }
      };
    }

    return responsePayload;
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    throw error;
  }
}