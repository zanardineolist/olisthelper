// utils/supabase/dateUtils.js

/**
 * Utilitários para padronizar o tratamento de datas nas consultas ao Supabase
 */

/**
 * Ajusta uma data para o início do dia (00:00:00.000)
 * @param {Date|string} date - Data a ser ajustada
 * @returns {Date} Data ajustada para o início do dia
 */
export function setStartOfDay(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Data inválida: ${date}`);
  }
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Ajusta uma data para o final do dia (23:59:59.999)
 * @param {Date|string} date - Data a ser ajustada
 * @returns {Date} Data ajustada para o final do dia
 */
export function setEndOfDay(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Data inválida: ${date}`);
  }
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Calcula a data de início do mês atual considerando o fuso horário do Brasil
 * @returns {Date} Data de início do mês atual
 */
export function getStartOfCurrentMonth() {
  const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const now = new Date(brtDate);
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Calcula a data de início do mês anterior considerando o fuso horário do Brasil
 * @returns {Date} Data de início do mês anterior
 */
export function getStartOfLastMonth() {
  const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const now = new Date(brtDate);
  return new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
}

/**
 * Calcula a data de início do próximo mês considerando o fuso horário do Brasil
 * @returns {Date} Data de início do próximo mês
 */
export function getStartOfNextMonth() {
  const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const now = new Date(brtDate);
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

/**
 * Calcula a data de N dias atrás considerando o fuso horário do Brasil
 * @param {number} days - Número de dias para subtrair da data atual
 * @returns {Date} Data de N dias atrás
 */
export function getDaysAgo(days) {
  const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const date = new Date(brtDate);
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Aplica filtros de data a uma consulta do Supabase
 * @param {Object} query - Consulta do Supabase
 * @param {string} dateField - Nome do campo de data na tabela
 * @param {string|Date} startDate - Data inicial (opcional)
 * @param {string|Date} endDate - Data final (opcional)
 * @param {number} defaultDays - Número de dias padrão para filtro se não houver datas (opcional)
 * @returns {Object} Consulta do Supabase com filtros aplicados
 */
export function applyDateFilters(query, dateField, startDate = null, endDate = null, defaultDays = 30) {
  if (startDate && endDate) {
    try {
      const start = setStartOfDay(startDate);
      const end = setEndOfDay(endDate);
      
      return query
        .gte(dateField, start.toISOString())
        .lte(dateField, end.toISOString());
    } catch (error) {
      console.error('Erro ao processar datas:', error);
      // Fallback para o comportamento padrão
      return query.gte(dateField, getDaysAgo(defaultDays).toISOString());
    }
  } else {
    // Comportamento padrão - filtrar pelos últimos N dias
    return query.gte(dateField, getDaysAgo(defaultDays).toISOString());
  }
}

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY) considerando o fuso horário do Brasil
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDateBR(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

/**
 * Formata uma hora para o formato brasileiro (HH:MM:SS) considerando o fuso horário do Brasil
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Hora formatada
 */
export function formatTimeBR(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Hora inválida';
    }
    return dateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (error) {
    console.error('Erro ao formatar hora:', error);
    return 'Hora inválida';
  }
}