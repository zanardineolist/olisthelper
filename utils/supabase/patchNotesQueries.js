// utils/supabase/patchNotesQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Cria um novo patch note
 * @param {Object} patchNoteData - Dados do patch note
 * @param {string} patchNoteData.title - Título do patch note
 * @param {string} patchNoteData.content - Conteúdo HTML do patch note
 * @param {string} patchNoteData.summary - Resumo do patch note
 * @param {string} patchNoteData.version - Versão (opcional)
 * @param {string} patchNoteData.created_by - UUID do usuário criador
 * @param {boolean} patchNoteData.published - Se está publicado (padrão: true)
 * @param {boolean} patchNoteData.featured - Se está em destaque (padrão: false)
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function createPatchNote(patchNoteData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .insert([{
        title: patchNoteData.title,
        content: patchNoteData.content,
        summary: patchNoteData.summary,
        version: patchNoteData.version || null,
        created_by: patchNoteData.created_by,
        published: patchNoteData.published !== undefined ? patchNoteData.published : true,
        featured: patchNoteData.featured || false
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar patch note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca patch notes publicados
 * @param {number} limit - Limite de resultados (padrão: 20)
 * @param {number} offset - Offset para paginação (padrão: 0)
 * @param {boolean} featuredOnly - Se deve buscar apenas destacados (padrão: false)
 * @returns {Promise<Array>} - Lista de patch notes
 */
export async function getPublishedPatchNotes(limit = 20, offset = 0, featuredOnly = false) {
  try {
    let query = supabaseAdmin
      .from('patch_notes')
      .select(`
        *,
        users!patch_notes_created_by_fkey (
          name
        )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (featuredOnly) {
      query = query.eq('featured', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Adicionar nome do criador
    const patchNotesWithCreator = data?.map(patchNote => ({
      ...patchNote,
      creator_name: patchNote.users?.name || 'Sistema'
    })) || [];

    return patchNotesWithCreator;
  } catch (error) {
    console.error('Erro ao buscar patch notes:', error);
    return [];
  }
}

/**
 * Busca um patch note específico por ID
 * @param {string} patchNoteId - UUID do patch note
 * @returns {Promise<Object|null>} - Patch note ou null
 */
export async function getPatchNoteById(patchNoteId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .select(`
        *,
        users!patch_notes_created_by_fkey (
          name
        )
      `)
      .eq('id', patchNoteId)
      .eq('published', true)
      .single();

    if (error) throw error;

    return {
      ...data,
      creator_name: data.users?.name || 'Sistema'
    };
  } catch (error) {
    console.error('Erro ao buscar patch note:', error);
    return null;
  }
}

/**
 * Atualiza um patch note existente
 * @param {string} patchNoteId - UUID do patch note
 * @param {Object} updateData - Dados para atualizar
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function updatePatchNote(patchNoteId, updateData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .update(updateData)
      .eq('id', patchNoteId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar patch note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deleta um patch note
 * @param {string} patchNoteId - UUID do patch note
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function deletePatchNote(patchNoteId) {
  try {
    const { error } = await supabaseAdmin
      .from('patch_notes')
      .delete()
      .eq('id', patchNoteId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar patch note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca estatísticas de patch notes para admin
 * @returns {Promise<Object>} - Estatísticas dos patch notes
 */
export async function getPatchNoteStats() {
  try {
    // Total de patch notes
    const { count: totalPatchNotes } = await supabaseAdmin
      .from('patch_notes')
      .select('*', { count: 'exact', head: true });

    // Patch notes publicados
    const { count: publishedPatchNotes } = await supabaseAdmin
      .from('patch_notes')
      .select('*', { count: 'exact', head: true })
      .eq('published', true);

    // Patch notes em destaque
    const { count: featuredPatchNotes } = await supabaseAdmin
      .from('patch_notes')
      .select('*', { count: 'exact', head: true })
      .eq('featured', true);

    // Patch notes recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentPatchNotes } = await supabaseAdmin
      .from('patch_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      total_patch_notes: totalPatchNotes || 0,
      published_patch_notes: publishedPatchNotes || 0,
      featured_patch_notes: featuredPatchNotes || 0,
      recent_patch_notes: recentPatchNotes || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de patch notes:', error);
    return {
      total_patch_notes: 0,
      published_patch_notes: 0,
      featured_patch_notes: 0,
      recent_patch_notes: 0
    };
  }
}

/**
 * Busca patch notes para administração (incluindo rascunhos)
 * @param {number} limit - Limite de resultados (padrão: 20)
 * @param {number} offset - Offset para paginação (padrão: 0)
 * @returns {Promise<Array>} - Lista de patch notes para admin
 */
export async function getAllPatchNotesForAdmin(limit = 20, offset = 0) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .select(`
        *,
        users!patch_notes_created_by_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Adicionar nome do criador
    const patchNotesWithCreator = data?.map(patchNote => ({
      ...patchNote,
      creator_name: patchNote.users?.name || 'Sistema'
    })) || [];

    return patchNotesWithCreator;
  } catch (error) {
    console.error('Erro ao buscar patch notes para admin:', error);
    return [];
  }
}

/**
 * Alterna o status de destaque de um patch note
 * @param {string} patchNoteId - UUID do patch note
 * @param {boolean} featured - Novo status de destaque
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function togglePatchNoteFeatured(patchNoteId, featured) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .update({ featured })
      .eq('id', patchNoteId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao alterar status de destaque:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Alterna o status de publicação de um patch note
 * @param {string} patchNoteId - UUID do patch note
 * @param {boolean} published - Novo status de publicação
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function togglePatchNotePublished(patchNoteId, published) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patch_notes')
      .update({ published })
      .eq('id', patchNoteId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao alterar status de publicação:', error);
    return { success: false, error: error.message };
  }
}