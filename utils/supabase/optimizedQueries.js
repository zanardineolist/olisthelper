// utils/supabase/optimizedQueries.js
// QUERIES OTIMIZADAS PARA SUPABASE - OLIST HELPER
// ================================================

import { supabase } from './supabaseClient'; // Usar cliente normal, não admin
import { applyDateFilters, formatDateBR, formatTimeBR } from './dateUtils';

// =============================================================
// 1. SISTEMA DE CACHE SIMPLES
// =============================================================

class SimpleCache {
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// =============================================================
// 2. HELP RECORDS - QUERIES OTIMIZADAS
// =============================================================

/**
 * Versão otimizada do getAnalystRecords
 * - Reduz queries N+1
 * - Usa cache inteligente
 * - Melhora performance de agregações
 */
export async function getAnalystRecordsOptimized(analystId, options = {}) {
  const {
    days = 30,
    mode = 'standard',
    startDate = null,
    endDate = null,
    useCache = true
  } = options;

  const cacheKey = `analyst_${analystId}_${mode}_${days}_${startDate}_${endDate}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    // Query otimizada com join eficiente
    let query = supabase
      .from('help_records')
      .select(`
        id,
        analyst_id,
        requester_name,
        requester_email,
        description,
        created_at,
        categories!inner(id, name)
      `)
      .eq('analyst_id', analystId)
      .order('created_at', { ascending: false });

    // Aplicar filtros de data apenas se necessário
    if (mode !== 'profile') {
      if (startDate && endDate) {
        query = query
          .gte('created_at', new Date(startDate).toISOString())
          .lte('created_at', new Date(endDate).toISOString());
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        query = query.gte('created_at', daysAgo.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    let result;
    if (mode === 'profile') {
      result = await processProfileModeOptimized(data, analystId);
    } else {
      result = processStandardModeOptimized(data);
    }

    if (useCache) {
      cache.set(cacheKey, result);
    }

    return { ...result, fromCache: false };

  } catch (error) {
    console.error('Erro ao buscar registros otimizados:', error);
    throw error;
  }
}

/**
 * Processamento otimizado para modo profile
 */
async function processProfileModeOptimized(data, analystId) {
  // Usar função RPC se disponível para contagem do dia
  let todayCount = 0;
  try {
    const { data: rpcResult } = await supabase.rpc('get_today_help_count', {
      analyst_id: analystId
    });
    todayCount = rpcResult || 0;
  } catch {
    // Fallback para contagem no cliente
    const today = new Date().toDateString();
    todayCount = data.filter(r => 
      new Date(r.created_at).toDateString() === today
    ).length;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Processamento otimizado usando reduce
  const { currentMonthCount, lastMonthCount } = data.reduce((acc, record) => {
    const date = new Date(record.created_at);
    const month = date.getMonth();
    const year = date.getFullYear();

    if (month === currentMonth && year === currentYear) {
      acc.currentMonthCount++;
    } else if (
      (month === (currentMonth === 0 ? 11 : currentMonth - 1)) &&
      (year === (currentMonth === 0 ? currentYear - 1 : currentYear))
    ) {
      acc.lastMonthCount++;
    }
    return acc;
  }, { currentMonthCount: 0, lastMonthCount: 0 });

  return {
    currentMonth: currentMonthCount,
    lastMonth: lastMonthCount,
    today: todayCount,
    rows: data.map(formatRowData)
  };
}

/**
 * Processamento otimizado para modo standard
 */
function processStandardModeOptimized(data) {
  // Usar Map para melhor performance que Object
  const dateGroups = new Map();
  
  data.forEach(record => {
    const date = formatDateBR(record.created_at);
    dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
  });

  return {
    count: data.length,
    dates: Array.from(dateGroups.keys()),
    counts: Array.from(dateGroups.values()),
    rows: data.map(formatRowData)
  };
}

/**
 * Formato otimizado de dados
 */
function formatRowData(row) {
  return [
    formatDateBR(row.created_at),
    formatTimeBR(row.created_at),
    row.requester_name || '',
    row.requester_email || '',
    row.categories?.name || '',
    row.description || ''
  ];
}

// =============================================================
// 3. SHARED RESPONSES - QUERIES OTIMIZADAS
// =============================================================

/**
 * Busca respostas com cache e paginação otimizada
 */
export async function getAllResponsesOptimized(userId, options = {}) {
  const {
    searchTerm = '',
    tags = [],
    page = 1,
    pageSize = 25,
    useCache = true
  } = options;

  const cacheKey = `responses_${userId}_${searchTerm}_${tags.join(',')}_${page}_${pageSize}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    // Query otimizada com less joins
    let query = supabase
      .from('shared_responses')
      .select(`
        id,
        title,
        content,
        tags,
        user_id,
        is_public,
        copy_count,
        created_at,
        updated_at,
        users!inner(name)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Paginação
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error } = await query;
    if (error) throw error;

    // Buscar favoritos em paralelo
    const favoriteIds = await getUserFavoriteIds(userId);

    const result = {
      data: data.map(item => ({
        ...item,
        author_name: item.users?.name || 'Usuário desconhecido',
        isFavorite: favoriteIds.has(item.id)
      })),
      pagination: {
        page,
        pageSize,
        hasMore: data.length === pageSize
      }
    };

    if (useCache) {
      cache.set(cacheKey, result);
    }

    return { ...result, fromCache: false };

  } catch (error) {
    console.error('Erro ao buscar respostas otimizadas:', error);
    throw error;
  }
}

/**
 * Cache de favoritos do usuário
 */
async function getUserFavoriteIds(userId) {
  const cacheKey = `favorites_${userId}`;
  let cached = cache.get(cacheKey);
  
  if (!cached) {
    const { data } = await supabase
      .from('user_favorites')
      .select('response_id')
      .eq('user_id', userId);
    
    cached = new Set((data || []).map(f => f.response_id));
    cache.set(cacheKey, cached);
  }
  
  return cached;
}

// =============================================================
// 4. VIDEO LIBRARY - QUERIES OTIMIZADAS
// =============================================================

/**
 * Busca vídeos com filtros e paginação otimizada
 */
export async function getVideosOptimized(options = {}) {
  const {
    searchTerm = '',
    category = '',
    tags = [],
    orderBy = 'created_at',
    orderDirection = 'desc',
    page = 1,
    pageSize = 20,
    useCache = true
  } = options;

  const cacheKey = `videos_${searchTerm}_${category}_${tags.join(',')}_${orderBy}_${orderDirection}_${page}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    let query = supabase
      .from('video_library')
      .select(`
        id,
        title,
        description,
        video_url,
        thumbnail_url,
        tags,
        category,
        file_size,
        view_count,
        created_at,
        updated_at,
        users!inner(name)
      `)
      .eq('is_active', true)
      .order(orderBy, { ascending: orderDirection === 'asc' });

    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Paginação
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error } = await query;
    if (error) throw error;

    const result = {
      data: data.map(video => ({
        ...video,
        author_name: video.users?.name || 'Usuário desconhecido'
      })),
      pagination: {
        page,
        pageSize,
        hasMore: data.length === pageSize
      }
    };

    if (useCache) {
      cache.set(cacheKey, result);
    }

    return { ...result, fromCache: false };

  } catch (error) {
    console.error('Erro ao buscar vídeos otimizados:', error);
    throw error;
  }
}

// =============================================================
// 5. PERFORMANCE QUERIES - OTIMIZADAS
// =============================================================

/**
 * Busca performance com cache e menos joins
 */
export async function getUserPerformanceOptimized(userEmail, useCache = true) {
  const cacheKey = `performance_${userEmail}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    // Query otimizada sem joins desnecessários
    const [performanceResult, userResult, targetsResult] = await Promise.all([
      supabase
        .from('performance_indicators')
        .select('*')
        .eq('user_email', userEmail.toLowerCase())
        .single(),
      
      supabase
        .from('users')
        .select('can_ticket, can_phone, can_chat, profile')
        .eq('email', userEmail.toLowerCase())
        .single(),
      
      supabase
        .from('channel_targets')
        .select('*')
        .eq('is_active', true)
    ]);

    if (performanceResult.error) throw performanceResult.error;
    if (userResult.error) throw userResult.error;
    if (targetsResult.error) throw targetsResult.error;

    const performance = performanceResult.data;
    const user = userResult.data;
    const targets = targetsResult.data.reduce((acc, target) => {
      acc[target.channel_name] = target;
      return acc;
    }, {});

    const result = buildPerformanceResponse(performance, user, targets);

    if (useCache) {
      cache.set(cacheKey, result);
    }

    return { ...result, fromCache: false };

  } catch (error) {
    console.error('Erro ao buscar performance otimizada:', error);
    throw error;
  }
}

/**
 * Constrói resposta de performance otimizada
 */
function buildPerformanceResponse(performance, user, targets) {
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

  // Adicionar dados por canal de forma otimizada
  if (user.can_ticket && targets.chamados) {
    response.chamados = buildChannelData(performance, targets.chamados, 'chamados');
  }

  if (user.can_phone && targets.telefone) {
    response.telefone = buildChannelData(performance, targets.telefone, 'telefone');
  }

  if (user.can_chat && targets.chat) {
    response.chat = buildChannelData(performance, targets.chat, 'chat');
  }

  return response;
}

/**
 * Constrói dados do canal de forma otimizada
 */
function buildChannelData(performance, target, channel) {
  return {
    total: performance[`${channel}_total`],
    mediaDia: performance[`${channel}_media_dia`],
    tma: performance[`${channel}_tma_hours`] || performance[`${channel}_tma_time`],
    csat: performance[`${channel}_csat_percent`] || performance[`${channel}_csat_rating`],
    target: {
      quantity: target.target_quantity,
      tma: target.target_tma,
      csat: target.target_csat,
      quality: target.target_quality
    }
  };
}

// =============================================================
// 6. UTILITÁRIOS PARA LIMPEZA DE CACHE
// =============================================================

/**
 * Limpa cache por padrão
 */
export function clearCache(pattern = null) {
  if (pattern) {
    const keys = Array.from(cache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.cache.delete(key);
      }
    });
  } else {
    cache.clear();
  }
}

/**
 * Invalida cache específico de usuário
 */
export function invalidateUserCache(userId) {
  clearCache(userId);
}

// =============================================================
// 7. MONITORAMENTO SIMPLES
// =============================================================

export function getCacheStats() {
  return {
    size: cache.cache.size,
    keys: Array.from(cache.cache.keys())
  };
}

// =============================================================
// EXPORTS
// =============================================================

export default {
  getAnalystRecordsOptimized,
  getAllResponsesOptimized,
  getVideosOptimized,
  getUserPerformanceOptimized,
  clearCache,
  invalidateUserCache,
  getCacheStats
}; 