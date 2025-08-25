import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getUserPermissions } from '../../utils/supabase/supabaseClient';
import { createRemoteAccess } from '../../utils/supabase/remoteAccessQueries';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  // Verificar permissões - usuário deve ter permissão de acesso remoto
  const userPermissions = await getUserPermissions(session.id);
  if (!userPermissions?.remoteAccess) {
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para registrar acessos remotos.' });
  }

  const { date, time, name, email, chamado, tema, description } = req.body;

  if (!date || !time || !name || !email || !chamado || !tema) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios, exceto a descrição.' });
  }

  try {
    // Adicionar registro ao Supabase
    await createRemoteAccess({
      date,
      time, 
      name, 
      email, 
      chamado, 
      tema, 
      description: description || ''
    });
    
    res.status(200).json({ message: 'Registro adicionado com sucesso.' });
  } catch (error) {
    console.error('Erro ao adicionar registro:', error);
    res.status(500).json({ error: 'Erro ao adicionar registro. Tente novamente.' });
  }
}