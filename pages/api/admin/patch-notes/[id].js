// pages/api/admin/patch-notes/[id].js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getUserPermissions } from '../../../../utils/supabase/supabaseClient';
import { updatePatchNote, deletePatchNote } from '../../../../utils/supabase/patchNotesQueries';

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    // Verificar permissões de admin
    const userPermissions = await getUserPermissions(session.id);
    if (!userPermissions?.admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar patch notes.' });
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      // Atualizar patch note
      const { title, content, summary, version } = req.body;

      if (!title || !content || !summary) {
        return res.status(400).json({ error: 'Título, conteúdo e resumo são obrigatórios.' });
      }

      const result = await updatePatchNote(id, {
        title,
        content,
        summary,
        version: version || null
      });

      if (!result.success) {
        return res.status(500).json({ error: `Erro ao atualizar patch note: ${result.error}` });
      }

      res.status(200).json({ 
        message: 'Patch note atualizado com sucesso!',
        patchNote: result.data
      });

    } else if (req.method === 'DELETE') {
      // Deletar patch note
      const result = await deletePatchNote(id);

      if (!result.success) {
        return res.status(500).json({ error: `Erro ao deletar patch note: ${result.error}` });
      }

      res.status(200).json({ 
        message: 'Patch note deletado com sucesso!'
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API admin/patch-notes/[id]:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}