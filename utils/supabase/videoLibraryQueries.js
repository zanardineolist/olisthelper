import { supabaseAdmin } from './supabaseClient';

/**
 * Busca todos os vídeos com filtros opcionais
 * @param {string} searchTerm - Termo de busca
 * @param {string} category - Categoria para filtrar
 * @param {string[]} tags - Tags para filtrar
 * @param {string} orderBy - Campo para ordenação
 * @param {string} orderDirection - Direção da ordenação
 * @returns {Promise<Array>} Lista de vídeos
 */
export async function getAllVideos(searchTerm = '', category = '', tags = [], orderBy = 'created_at', orderDirection = 'desc') {
  try {
    let query = supabaseAdmin
      .from('video_library')
      .select(`
        *,
        users (
          name
        )
      `)
      .eq('is_active', true)
      .order(orderBy, { ascending: orderDirection === 'asc' });

    // Aplicar filtro de busca
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Aplicar filtro de categoria
    if (category) {
      query = query.eq('category', category);
    }

    // Aplicar filtro de tags
    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(video => ({
      ...video,
      author_name: video.users?.name || video.author_name || 'Usuário desconhecido'
    }));
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return [];
  }
}

/**
 * Busca um vídeo específico por ID
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<Object|null>} Dados do vídeo
 */
export async function getVideoById(videoId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_library')
      .select(`
        *,
        users (
          name
        )
      `)
      .eq('id', videoId)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return {
      ...data,
      author_name: data.users?.name || data.author_name || 'Usuário desconhecido'
    };
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error);
    return null;
  }
}

/**
 * Cria um novo vídeo na biblioteca
 * @param {Object} videoData - Dados do vídeo
 * @returns {Promise<Object|null>} Vídeo criado
 */
export async function createVideo(videoData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_library')
      .insert([{
        title: videoData.title,
        description: videoData.description,
        video_url: videoData.videoUrl,
        thumbnail_url: videoData.thumbnailUrl || null,
        tags: videoData.tags || [],
        category: videoData.category || 'geral',

        file_size: videoData.fileSize || null,
        created_by: videoData.userId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar vídeo:', error);
    throw error;
  }
}

/**
 * Atualiza um vídeo existente
 * @param {string} videoId - ID do vídeo
 * @param {Object} updates - Dados para atualizar
 * @returns {Promise<Object|null>} Vídeo atualizado
 */
export async function updateVideo(videoId, updates) {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_library')
      .update({
        title: updates.title,
        description: updates.description,
        video_url: updates.videoUrl,
        thumbnail_url: updates.thumbnailUrl,
        tags: updates.tags,
        category: updates.category,

        file_size: updates.fileSize,
        updated_at: new Date()
      })
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar vídeo:', error);
    throw error;
  }
}

/**
 * Remove um vídeo (marca como inativo)
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function deleteVideo(videoId) {
  try {
    const { error } = await supabaseAdmin
      .from('video_library')
      .update({ is_active: false })
      .eq('id', videoId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar vídeo:', error);
    throw error;
  }
}

/**
 * Registra uma visualização de vídeo
 * @param {string} videoId - ID do vídeo
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function recordVideoView(videoId, userId) {
  try {
    const { error } = await supabaseAdmin.rpc(
      'increment_video_view_count',
      { 
        video_id_param: videoId,
        user_id_param: userId
      }
    );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao registrar visualização:', error);
    return false;
  }
}

/**
 * Busca estatísticas da biblioteca de vídeos
 * @returns {Promise<Object>} Estatísticas
 */
export async function getVideoLibraryStats() {
  try {
    // Total de vídeos ativos
    const { count: totalVideos, error: countError } = await supabaseAdmin
      .from('video_library')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) throw countError;

    // Vídeos por categoria
    const { data: categoryStats, error: categoryError } = await supabaseAdmin
      .from('video_library')
      .select('category')
      .eq('is_active', true);

    if (categoryError) throw categoryError;

    const categoryCounts = categoryStats.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});

    // Total de visualizações
    const { count: totalViews, error: viewsError } = await supabaseAdmin
      .from('video_views')
      .select('*', { count: 'exact', head: true });

    if (viewsError) throw viewsError;

    return {
      totalVideos: totalVideos || 0,
      totalViews: totalViews || 0,
      categoryCounts
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalVideos: 0,
      totalViews: 0,
      categoryCounts: {}
    };
  }
}

/**
 * Busca categorias disponíveis
 * @returns {Promise<Array>} Lista de categorias
 */
export async function getVideoCategories() {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_library')
      .select('category')
      .eq('is_active', true);

    if (error) throw error;

    const categories = [...new Set(data.map(video => video.category))];
    return categories.sort();
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

/**
 * Busca tags disponíveis
 * @returns {Promise<Array>} Lista de tags
 */
export async function getVideoTags() {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_library')
      .select('tags')
      .eq('is_active', true);

    if (error) throw error;

    const allTags = new Set();
    data.forEach(video => {
      video.tags?.forEach(tag => allTags.add(tag));
    });

    return [...allTags].sort();
  } catch (error) {
    console.error('Erro ao buscar tags:', error);
    return [];
  }
}

/**
 * Valida URL do Google Drive e converte para formato de embed
 * @param {string} url - URL do Google Drive
 * @returns {Object} Resultado da validação
 */
export function validateAndConvertGoogleDriveUrl(url) {
  try {
    // Padrões de URLs do Google Drive
    const patterns = [
      // Formato compartilhamento padrão
      /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/,
      // Formato de link direto
      /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      // Formato já em embed
      /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/preview/
    ];

    let fileId = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }

    if (!fileId) {
      return {
        isValid: false,
        error: 'URL do Google Drive inválida. Use o link de compartilhamento.'
      };
    }

    // URLs para diferentes propósitos
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`;
    const directUrl = `https://drive.google.com/file/d/${fileId}/view`;

    return {
      isValid: true,
      fileId,
      embedUrl,
      thumbnailUrl,
      directUrl,
      originalUrl: url
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erro ao processar URL'
    };
  }
} 