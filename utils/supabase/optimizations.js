// utils/supabase/optimizations.js
// ARQUIVO DE OTIMIZAÇÕES E MELHORIAS PARA O CÓDIGO SUPABASE
// =============================================================

import { supabase } from './supabaseClient'; // Usar cliente normal, não admin

// =============================================================
// 1. MELHORIAS NO SISTEMA DE CACHE
// =============================================================

/**
 * Sistema de cache simples para consultas frequentes
 */
class QueryCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutos padrão
    this.cache = new Map();
    this.ttl = ttl;
  }

  getKey(table, params) {
    return `${table}_${JSON.stringify(params)}`;
  }

  get(table, params) {
    const key = this.getKey(table, params);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  set(table, params, data) {
    const key = this.getKey(table, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

// =============================================================
// 2. WRAPPER PARA QUERIES OTIMIZADAS
// =============================================================

/**
 * Wrapper otimizado para queries do Supabase com cache automático
 */
export class SupabaseQueryOptimizer {
  constructor(client = supabase) {
    this.client = client;
    this.cache = queryCache;
  }

  /**
   * Query com cache automático
   */
  async cachedQuery(table, queryBuilder, cacheParams = {}, ttl = 5 * 60 * 1000) {
    const cacheKey = this.cache.getKey(table, cacheParams);
    let cached = this.cache.get(table, cacheParams);
    
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }

    const { data, error } = await queryBuilder(this.client.from(table));
    
    if (!error && data) {
      this.cache.set(table, cacheParams, data);
    }

    return { data, error, fromCache: false };
  }

  /**
   * Query com retry automático
   */
  async retryQuery(queryFunction, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await queryFunction();
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Query failed on attempt ${attempt}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  /**
   * Query com timeout
   */
  async timeoutQuery(queryFunction, timeoutMs = 10000) {
    return Promise.race([
      queryFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      )
    ]);
  }
}

export const queryOptimizer = new SupabaseQueryOptimizer();

// =============================================================
// 3. QUERIES OTIMIZADAS PARA HELP RECORDS
// =============================================================

/**
 * Versão otimizada do getAnalystRecords
 */
export async function getAnalystRecordsOptimized(analystId, filters = {}) {
  const {
    days = 30,
    mode = 'standard',
    startDate = null,
    endDate = null,
    includeUserDetails = false,
    includeCategoryDetails = true
  } = filters;

  try {
    // Query otimizada com aggregations no servidor
    const queryBuilder = (table) => {
      let query = table
        .select(`
          id,
          analyst_id,
          requester_name,
          requester_email,
          description,
          created_at,
          ${includeCategoryDetails ? 'categories:category_id(id,name)' : 'category_id'},
          ${includeUserDetails ? 'users:analyst_id(id,name,email)' : ''}
        `)
        .eq('analyst_id', analystId)
        .order('created_at', { ascending: false });

      // Aplicar filtros de data de forma mais eficiente
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

      return query;
    };

    const cacheParams = { analystId, mode, days, startDate, endDate };
    const { data, error, fromCache } = await queryOptimizer.cachedQuery(
      'help_records',
      queryBuilder,
      cacheParams
    );

    if (error) throw error;

    // Processamento otimizado
    if (mode === 'profile') {
      return await this.processProfileMode(data, analystId);
    }

    // Agrupar no servidor usando RPC function se disponível
    const processedData = this.processStandardMode(data);
    
    return {
      ...processedData,
      fromCache,
      totalRecords: data.length
    };

  } catch (error) {
    console.error('Erro ao buscar registros otimizados:', error);
    throw new Error(`Falha na consulta: ${error.message}`);
  }
}

/**
 * Processamento otimizado para modo profile
 */
async function processProfileMode(data, analystId) {
  // Usar RPC function para contagens se disponível
  try {
    const { data: counts, error } = await supabase.rpc('get_analyst_monthly_stats', {
      analyst_id: analystId
    });

    if (!error && counts) {
      return {
        ...counts[0],
        rows: data.map(formatRowData)
      };
    }
  } catch (rpcError) {
    console.warn('RPC function not available, falling back to client processing');
  }

  // Fallback para processamento no cliente (mais lento)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return {
    currentMonth: data.filter(r => {
      const date = new Date(r.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length,
    lastMonth: data.filter(r => {
      const date = new Date(r.created_at);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastYear;
    }).length,
    today: data.filter(r => {
      const date = new Date(r.created_at);
      return date.toDateString() === now.toDateString();
    }).length,
    rows: data.map(formatRowData)
  };
}

/**
 * Processamento otimizado para modo standard
 */
function processStandardMode(data) {
  // Usar Map para melhor performance
  const dateGroups = data.reduce((acc, record) => {
    const date = new Date(record.created_at).toLocaleDateString('pt-BR');
    acc.set(date, (acc.get(date) || 0) + 1);
    return acc;
  }, new Map());

  return {
    count: data.length,
    dates: Array.from(dateGroups.keys()),
    counts: Array.from(dateGroups.values()),
    rows: data.map(formatRowData)
  };
}

/**
 * Formatação otimizada de dados de linha
 */
function formatRowData(row) {
  return [
    new Date(row.created_at).toLocaleDateString('pt-BR'),
    new Date(row.created_at).toLocaleTimeString('pt-BR'),
    row.requester_name || '',
    row.requester_email || '',
    row.categories?.name || '',
    row.description || ''
  ];
}

// =============================================================
// 4. QUERIES OTIMIZADAS PARA SHARED RESPONSES
// =============================================================

/**
 * Versão otimizada com menos joins e melhor performance
 */
export async function getAllResponsesOptimized(userId, filters = {}) {
  const { searchTerm = '', tags = [], limit = 50, offset = 0 } = filters;

  try {
    const queryBuilder = (table) => {
      let query = table
        .select(`
          id,
          title,
          content,
          tags,
          is_public,
          created_at,
          updated_at,
          user_id,
          copy_count,
          users!inner(name),
          favorites_count:user_favorites(count)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.textSearch('fts', searchTerm);
      }

      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }

      return query;
    };

    const cacheParams = { userId, searchTerm, tags, limit, offset };
    const { data, error, fromCache } = await queryOptimizer.cachedQuery(
      'shared_responses',
      queryBuilder,
      cacheParams,
      2 * 60 * 1000 // 2 minutos cache
    );

    if (error) throw error;

    // Buscar favoritos do usuário em paralelo
    const favoritePromise = this.getUserFavorites(userId);
    const [favorites] = await Promise.all([favoritePromise]);

    const favoriteIds = new Set(favorites.map(f => f.response_id));

    return {
      data: data.map(item => ({
        ...item,
        author_name: item.users?.name || 'Usuário desconhecido',
        isFavorite: favoriteIds.has(item.id),
        favorites_count: item.favorites_count?.[0]?.count || 0
      })),
      fromCache,
      hasMore: data.length === limit
    };

  } catch (error) {
    console.error('Erro ao buscar respostas otimizadas:', error);
    throw error;
  }
}

/**
 * Cache de favoritos do usuário
 */
async function getUserFavorites(userId) {
  const cacheKey = `user_favorites_${userId}`;
  let cached = queryCache.get('user_favorites', { userId });
  
  if (cached) return cached;

  const { data, error } = await supabase
    .from('user_favorites')
    .select('response_id')
    .eq('user_id', userId);

  if (!error && data) {
    queryCache.set('user_favorites', { userId }, data);
  }

  return data || [];
}

// =============================================================
// 5. QUERY BUILDER OTIMIZADO PARA FILTROS COMPLEXOS
// =============================================================

export class OptimizedQueryBuilder {
  constructor(table) {
    this.table = table;
    this.query = supabase.from(table);
    this.filters = [];
    this.joinTables = [];
  }

  select(columns) {
    this.query = this.query.select(columns);
    return this;
  }

  filterBy(column, operator, value) {
    this.filters.push({ column, operator, value });
    return this;
  }

  dateRange(column, startDate, endDate) {
    if (startDate) {
      this.query = this.query.gte(column, startDate);
    }
    if (endDate) {
      this.query = this.query.lte(column, endDate);
    }
    return this;
  }

  searchText(column, searchTerm) {
    if (searchTerm) {
      this.query = this.query.ilike(column, `%${searchTerm}%`);
    }
    return this;
  }

  orderBy(column, ascending = false) {
    this.query = this.query.order(column, { ascending });
    return this;
  }

  paginate(page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    this.query = this.query.range(start, end);
    return this;
  }

  async execute() {
    // Aplicar todos os filtros
    this.filters.forEach(({ column, operator, value }) => {
      this.query = this.query[operator](column, value);
    });

    const { data, error } = await this.query;
    
    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return data;
  }
}

// =============================================================
// 6. BATCH OPERATIONS PARA MELHOR PERFORMANCE
// =============================================================

export class BatchOperations {
  constructor(batchSize = 100) {
    this.batchSize = batchSize;
  }

  /**
   * Inserção em lote otimizada
   */
  async batchInsert(table, records) {
    const batches = this.createBatches(records);
    const results = [];

    for (const batch of batches) {
      try {
        const { data, error } = await supabase
          .from(table)
          .insert(batch)
          .select();

        if (error) throw error;
        results.push(...(data || []));
      } catch (error) {
        console.error(`Batch insert failed for ${table}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Atualização em lote otimizada
   */
  async batchUpdate(table, updates, keyField = 'id') {
    const results = [];

    for (const update of updates) {
      try {
        const { data, error } = await supabase
          .from(table)
          .update(update.data)
          .eq(keyField, update[keyField])
          .select();

        if (error) throw error;
        results.push(...(data || []));
      } catch (error) {
        console.error(`Batch update failed for ${table}:`, error);
        throw error;
      }
    }

    return results;
  }

  createBatches(items) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }
}

export const batchOperations = new BatchOperations();

// =============================================================
// 7. HOOKS PARA REACT COM OTIMIZAÇÕES
// =============================================================

/**
 * Hook otimizado para queries com cache e revalidação
 */
export function useOptimizedQuery(key, queryFunction, options = {}) {
  const {
    enabled = true,
    refetchInterval = null,
    cacheTime = 5 * 60 * 1000,
    staleTime = 1 * 60 * 1000
  } = options;

  // Implementação simplificada - usar com react-query ou SWR
  return {
    data: null,
    error: null,
    isLoading: false,
    refetch: () => {},
    isStale: false
  };
}

// =============================================================
// 8. MONITORAMENTO E MÉTRICAS
// =============================================================

export class QueryMetrics {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(queryId) {
    this.metrics.set(queryId, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  endTimer(queryId) {
    const metric = this.metrics.get(queryId);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
    }
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([id, metric]) => ({
      queryId: id,
      duration: metric.duration,
      startTime: metric.startTime
    }));
  }

  getSlowQueries(threshold = 1000) {
    return this.getMetrics().filter(m => m.duration > threshold);
  }
}

export const queryMetrics = new QueryMetrics();

// =============================================================
// 9. CONFIGURAÇÕES DE PERFORMANCE
// =============================================================

export const PERFORMANCE_CONFIG = {
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000, // máximo de itens no cache
  },
  queries: {
    timeout: 10000, // 10 segundos
    retries: 3,
    batchSize: 100,
  },
  pagination: {
    defaultPageSize: 25,
    maxPageSize: 100,
  }
};

// =============================================================
// EXPORT DEFAULT COM TODAS AS OTIMIZAÇÕES
// =============================================================

export default {
  QueryCache,
  SupabaseQueryOptimizer,
  OptimizedQueryBuilder,
  BatchOperations,
  QueryMetrics,
  queryCache,
  queryOptimizer,
  batchOperations,
  queryMetrics,
  getAnalystRecordsOptimized,
  getAllResponsesOptimized,
  PERFORMANCE_CONFIG
}; 