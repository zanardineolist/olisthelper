import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { 
  getVideoById, 
  updateVideo, 
  deleteVideo, 
  recordVideoView,
  validateAndConvertGoogleDriveUrl
} from '../../../utils/supabase/videoLibraryQueries';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { method } = req;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do vídeo é obrigatório' });
    }

    switch (method) {
      case 'GET':
        return await handleGet(req, res, session, id);
      case 'PUT':
        return await handlePut(req, res, session, id);
      case 'DELETE':
        return await handleDelete(req, res, session, id);
      case 'POST':
        return await handlePost(req, res, session, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST']);
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API video-library/[id]:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handleGet(req, res, session, videoId) {
  try {
    const video = await getVideoById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    return res.status(200).json({ video });
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error);
    return res.status(500).json({ error: 'Erro ao buscar vídeo' });
  }
}

async function handlePut(req, res, session, videoId) {
  try {
    // Buscar vídeo para verificar permissões
    const existingVideo = await getVideoById(videoId);
    
    if (!existingVideo) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Verificar se o usuário pode editar (criador ou super)
    const userProfile = session.role || session.user?.profile;
    const canEdit = existingVideo.created_by === session.id || userProfile === 'super';
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Sem permissão para editar este vídeo' });
    }

    const { title, description, videoUrl, tags, category, fileSize, shareType } = req.body;

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

    // Validar shareType
    const validShareTypes = ['internal', 'shareable'];
    const finalShareType = validShareTypes.includes(shareType) ? shareType : 'internal';

    // Validar URL do Google Drive se foi alterada
    let finalVideoUrl = videoUrl.trim();
    let thumbnailUrl = existingVideo.thumbnail_url;

    if (videoUrl.trim() !== existingVideo.video_url) {
      const urlValidation = validateAndConvertGoogleDriveUrl(videoUrl.trim());
      if (!urlValidation.isValid) {
        return res.status(400).json({ error: urlValidation.error });
      }
      finalVideoUrl = urlValidation.embedUrl;
      thumbnailUrl = urlValidation.thumbnailUrl;
    }

    // Atualizar vídeo
    const updates = {
      title: title.trim(),
      description: description.trim(),
      videoUrl: finalVideoUrl,
      thumbnailUrl,
      tags: tags || [],
      category: category?.trim() || 'geral',
      shareType: finalShareType,
      fileSize: fileSize?.trim() || null
    };

    const updatedVideo = await updateVideo(videoId, updates);

    return res.status(200).json({ 
      message: 'Vídeo atualizado com sucesso!',
      video: updatedVideo
    });

  } catch (error) {
    console.error('Erro ao atualizar vídeo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar vídeo' });
  }
}

async function handleDelete(req, res, session, videoId) {
  try {
    // Buscar vídeo para verificar permissões
    const existingVideo = await getVideoById(videoId);
    
    if (!existingVideo) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Verificar se o usuário pode deletar (criador ou super)
    const userProfile = session.role || session.user?.profile;
    const canDelete = existingVideo.created_by === session.id || userProfile === 'super';
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Sem permissão para excluir este vídeo' });
    }

    await deleteVideo(videoId);

    return res.status(200).json({ message: 'Vídeo excluído com sucesso!' });

  } catch (error) {
    console.error('Erro ao excluir vídeo:', error);
    return res.status(500).json({ error: 'Erro ao excluir vídeo' });
  }
}

async function handlePost(req, res, session, videoId) {
  try {
    const { action } = req.body;

    switch (action) {
      case 'view':
        // Registrar visualização
        const success = await recordVideoView(videoId, session.id);
        
        if (success) {
          return res.status(200).json({ message: 'Visualização registrada' });
        } else {
          return res.status(500).json({ error: 'Erro ao registrar visualização' });
        }

      default:
        return res.status(400).json({ error: 'Ação não reconhecida' });
    }

  } catch (error) {
    console.error('Erro na ação do vídeo:', error);
    return res.status(500).json({ error: 'Erro ao processar ação' });
  }
} 