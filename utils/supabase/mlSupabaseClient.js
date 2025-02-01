import { createClient } from '@supabase/supabase-js';

// Validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('As variáveis de ambiente do Supabase não estão configuradas.');
}

// Criar cliente Supabase específico para ML
export const mlSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente admin para operações que requerem mais privilégios
export const mlSupabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Busca categorias por texto ou ID
 */
export async function searchMLCategories(searchTerm) {
  try {
    const { data, error } = await mlSupabase
      .from('ml_categories')
      .select('*')
      .or(`id.ilike.%${searchTerm}%,hierarchy_complete.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

/**
 * Busca detalhes de uma categoria específica
 */
export async function getMLCategoryDetails(categoryId) {
  try {
    const { data, error } = await mlSupabase
      .from('ml_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar detalhes da categoria:', error);
    return null;
  }
}

/**
 * Atualiza informações da categoria
 */
export async function updateMLCategory(categoryId, updates) {
  try {
    const { data, error } = await mlSupabaseAdmin
      .from('ml_categories')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return null;
  }
}

/**
 * Sincroniza categoria com API do ML
 */
export async function syncMLCategory(categoryId) {
  try {
    // Buscar dados da API do ML
    const [detailsResponse, specsResponse] = await Promise.all([
      fetch(`https://api.mercadolibre.com/categories/${categoryId}`),
      fetch(`https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`)
    ]);

    if (!detailsResponse.ok || !specsResponse.ok) {
      throw new Error('Erro ao buscar dados da API do ML');
    }

    const details = await detailsResponse.json();
    const specs = await specsResponse.json();

    // Atualizar no Supabase
    const updates = {
      hierarchy_complete: details.path_from_root.map(p => p.name).join(' > '),
      is_last_level: !details.children_categories || details.children_categories.length === 0,
      status: details.status || 'enabled',
      listing_allowed: details.settings?.listing_allowed?.allowed || true,
      technical_specs: specs,
      last_sync_at: new Date()
    };

    return await updateMLCategory(categoryId, updates);
  } catch (error) {
    console.error('Erro ao sincronizar categoria:', error);
    return null;
  }
}

/**
 * Busca últimas categorias sincronizadas
 */
export async function getRecentMLCategories() {
  try {
    const { data, error } = await mlSupabase
      .from('ml_categories')
      .select('*')
      .order('last_sync_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar categorias recentes:', error);
    return [];
  }
}