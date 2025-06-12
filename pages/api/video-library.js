import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { 
  getAllVideos, 
  createVideo, 
  getVideoCategories, 
  getVideoTags,
  getVideoLibraryStats,
  validateAndConvertGoogleDriveUrl
} from '../../utils/supabase/videoLibraryQueries';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Session debug:', {
      hasSession: !!session,
      sessionId: session?.id,
      sessionRole: session?.role,
      userProfile: session?.user?.profile,
      userEmail: session?.user?.email
    });
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res, session);
      case 'POST':
        return await handlePost(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API video-library:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handleGet(req, res, session) {
  try {
    const { 
      search_term = '', 
      filter_category = '', 
      filter_tags = '', 
      order_by = 'created_at', 
      order_direction = 'desc',
      action = 'list'
    } = req.query;

    switch (action) {
      case 'categories':
        const categories = await getVideoCategories();
        return res.status(200).json({ categories });

      case 'tags':
        const tags = await getVideoTags();
        return res.status(200).json({ tags });

      case 'stats':
        const stats = await getVideoLibraryStats();
        return res.status(200).json({ stats });

      case 'list':
      default:
        const tags_array = filter_tags ? filter_tags.split(',').filter(tag => tag.trim()) : [];
        
        const videos = await getAllVideos(
          search_term,
          filter_category,
          tags_array,
          order_by,
          order_direction
        );

        return res.status(200).json({ 
          videos,
          total: videos.length
        });
    }
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
}

async function handlePost(req, res, session) {
  try {
    // Verificar permissões (apenas analyst e tax podem criar)
    const userProfile = session.role || session.user?.profile;
    if (!['analyst', 'tax', 'super'].includes(userProfile)) {
      return res.status(403).json({ 
        error: 'Apenas analistas e usuários tax podem adicionar vídeos' 
      });
    }

    const { title, description, videoUrl, tags, category, fileSize } = req.body;

    // Validação básica
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    if (!videoUrl || !videoUrl.trim()) {
      return res.status(400).json({ error: 'URL do vídeo é obrigatória' });
    }

    // Validar e converter URL do Google Drive
    const urlValidation = validateAndConvertGoogleDriveUrl(videoUrl.trim());
    if (!urlValidation.isValid) {
      return res.status(400).json({ error: urlValidation.error });
    }

    // Criar vídeo
    const videoData = {
      title: title.trim(),
      description: description.trim(),
      videoUrl: urlValidation.embedUrl,
      thumbnailUrl: urlValidation.thumbnailUrl,
      tags: tags || [],
      category: category?.trim() || 'geral',

      fileSize: fileSize?.trim() || null,
      userId: session.id
    };

    const newVideo = await createVideo(videoData);

    return res.status(201).json({ 
      message: 'Vídeo adicionado com sucesso!',
      video: newVideo,
      urlInfo: {
        embedUrl: urlValidation.embedUrl,
        thumbnailUrl: urlValidation.thumbnailUrl,
        directUrl: urlValidation.directUrl
      }
    });

  } catch (error) {
    console.error('Erro ao criar vídeo:', error);
    return res.status(500).json({ error: 'Erro ao adicionar vídeo' });
  }
} 