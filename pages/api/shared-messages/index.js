// pages/api/shared-messages/index.js
import {
    getAllResponses,
    getUserResponses,
    addResponse,
    updateResponse,
    deleteResponse
  } from '../../../utils/supabase/sharedResponsesQueries';
  
  export default async function handler(req, res) {
    // Extrair informações do usuário dos cookies
    const userId = req.cookies['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
  
    const { method } = req;
    const { searchTerm, tags } = req.query;
    const tagsArray = tags ? tags.split(',') : [];
  
    try {
      switch (method) {
        case 'GET':
          const messages = await getAllResponses(userId, searchTerm, tagsArray);
          return res.status(200).json({ messages });
  
        case 'POST':
          const { title, content, isPublic } = req.body;
          const messageTags = req.body.tags || [];
  
          if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
          }
  
          const newMessage = await addResponse({
            userId,
            title,
            content,
            tags: messageTags,
            isPublic
          });
  
          return res.status(201).json(newMessage);
  
        default:
          res.setHeader('Allow', ['GET', 'POST']);
          return res.status(405).end(`Method ${method} Not Allowed`);
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  // pages/api/shared-messages/[id].js
  export async function handler(req, res) {
    const userId = req.cookies['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
  
    const { id } = req.query;
    const { method } = req;
  
    try {
      switch (method) {
        case 'PUT':
          const { title, content, isPublic, tags } = req.body;
          
          if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
          }
  
          const updatedMessage = await updateResponse(id, {
            title,
            content,
            tags,
            isPublic
          });
  
          return res.status(200).json(updatedMessage);
  
        case 'DELETE':
          const success = await deleteResponse(id);
          if (!success) {
            return res.status(404).json({ error: 'Mensagem não encontrada' });
          }
          return res.status(200).json({ message: 'Mensagem excluída com sucesso' });
  
        default:
          res.setHeader('Allow', ['PUT', 'DELETE']);
          return res.status(405).end(`Method ${method} Not Allowed`);
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  // pages/api/shared-messages/user.js
  export async function handler(req, res) {
    const userId = req.cookies['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
  
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    try {
      const { searchTerm, tags } = req.query;
      const tagsArray = tags ? tags.split(',') : [];
      
      const messages = await getUserResponses(userId, searchTerm, tagsArray);
      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  // pages/api/shared-messages/favorite.js
  export async function handler(req, res) {
    const userId = req.cookies['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
  
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    try {
      const { messageId } = req.body;
      
      if (!messageId) {
        return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
      }
  
      const currentState = await isFavorite(userId, messageId);
      const success = await toggleFavorite(userId, messageId, !currentState);
  
      if (!success) {
        return res.status(400).json({ error: 'Erro ao atualizar favorito' });
      }
  
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }