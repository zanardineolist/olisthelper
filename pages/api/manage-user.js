import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar operações de CRUD na tabela de usuários
 */
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getUsers(req, res);
      break;

    case 'POST':
      await createUser(req, res);
      break;

    case 'PUT':
      await updateUser(req, res);
      break;

    case 'DELETE':
      await deleteUser(req, res);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido.`);
  }
}

// Listar todos os usuários
async function getUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    return res.status(200).json({ users: data });
  } catch (error) {
    console.error('[GET USERS] Erro ao listar usuários:', error.message);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
}

// Criar novo usuário
async function createUser(req, res) {
  const { name, email, role, squad, chamado, telefone, chat, remote } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
  }

  try {
    // Verificar se o e-mail já está cadastrado
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já cadastrado.' });
    }

    // Inserir o novo usuário
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, role, squad, chamado, telefone, chat, remote }]);

    if (error) throw error;

    return res.status(201).json({ message: 'Usuário criado com sucesso.', user: data });
  } catch (error) {
    console.error('[CREATE USER] Erro ao criar usuário:', error.message);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

// Atualizar usuário existente
async function updateUser(req, res) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Usuário atualizado com sucesso.', user: data });
  } catch (error) {
    console.error('[UPDATE USER] Erro ao atualizar usuário:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

// Deletar usuário
async function deleteUser(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Usuário deletado com sucesso.' });
  } catch (error) {
    console.error('[DELETE USER] Erro ao deletar usuário:', error.message);
    return res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
}
