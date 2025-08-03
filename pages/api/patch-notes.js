// pages/api/patch-notes.js
import { getPublishedPatchNotes, createPatchNote } from '../../utils/supabase/patchNotesQueries';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getUserPermissions } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Verificar autenticação
      const session = await getServerSession(req, res, authOptions);
      if (!session) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }

      const { limit: limitParam, offset: offsetParam, featured } = req.query;
      const limitValue = limitParam ? parseInt(limitParam, 10) : 20;
      const offsetValue = offsetParam ? parseInt(offsetParam, 10) : 0;
      const featuredOnly = featured === 'true';

      // Buscar patch notes publicados
      const patchNotes = await getPublishedPatchNotes(limitValue, offsetValue, featuredOnly);

      res.status(200).json({ 
        patchNotes,
        total: patchNotes.length,
        message: `${patchNotes.length} patch notes encontrados`
      });

    } catch (error) {
      console.error('Erro ao buscar patch notes:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  } else if (req.method === 'POST') {
    try {
      // Verificar autenticação
      const session = await getServerSession(req, res, authOptions);
      if (!session) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }

      // Verificar se é admin
      const userPermissions = await getUserPermissions(session.id);
      if (!userPermissions?.admin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar patch notes.' });
      }

      const { title, content, summary, version } = req.body;

      // Validações
      if (!title || !content || !summary) {
        return res.status(400).json({ error: 'Título, conteúdo e resumo são obrigatórios.' });
      }

      // Criar patch note
      const result = await createPatchNote({
        title,
        content,
        summary,
        version: version || null,
        created_by: session.id,
        published: true,
        featured: false
      });

      if (!result.success) {
        return res.status(500).json({ error: `Erro ao criar patch note: ${result.error}` });
      }

      res.status(201).json({ 
        message: 'Patch note criado com sucesso!',
        patchNote: result.data
      });

    } catch (error) {
      console.error('Erro ao criar patch note:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}