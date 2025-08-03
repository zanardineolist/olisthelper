// pages/api/admin/patch-notes.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getUserPermissions } from '../../../utils/supabase/supabaseClient';
import { getAllPatchNotesForAdmin, updatePatchNote, deletePatchNote } from '../../../utils/supabase/patchNotesQueries';

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

    if (req.method === 'GET') {
      // Buscar todos os patch notes (incluindo rascunhos)
      const patchNotes = await getAllPatchNotesForAdmin();
      
      res.status(200).json({ 
        patchNotes,
        total: patchNotes.length
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API admin/patch-notes:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}