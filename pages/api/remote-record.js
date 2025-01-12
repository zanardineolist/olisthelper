import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar operações de CRUD na tabela de acessos remotos
 */
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getRemoteRecords(req, res);
      break;

    case 'POST':
      await createRemoteRecord(req, res);
      break;

    case 'PUT':
      await updateRemoteRecord(req, res);
      break;

    case 'DELETE':
      await deleteRemoteRecord(req, res);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido.`);
  }
}

// Listar todos os registros de acesso remoto
async function getRemoteRecords(req, res) {
  try {
    const { data, error } = await supabase
      .from('remote_access')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nenhum registro de acesso remoto encontrado.' });
    }

    return res.status(200).json({ records: data });
  } catch (error) {
    console.error('[GET REMOTE RECORDS] Erro ao listar registros:', error.message);
    return res.status(500).json({ error: 'Erro ao listar registros de acesso remoto.' });
  }
}

// Criar novo registro de acesso remoto
async function createRemoteRecord(req, res) {
  const { user_id, chamado, tema, description, date, time } = req.body;

  if (!user_id || !chamado || !tema || !description || !date || !time) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase
      .from('remote_access')
      .insert([{ user_id, chamado, tema, description, date, time }]);

    if (error) throw error;

    return res.status(201).json({ message: 'Registro de acesso remoto criado com sucesso.', record: data });
  } catch (error) {
    console.error('[CREATE REMOTE RECORD] Erro ao criar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao criar registro de acesso remoto.' });
  }
}

// Atualizar registro de acesso remoto existente
async function updateRemoteRecord(req, res) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do registro não fornecido.' });
  }

  try {
    const { data, error } = await supabase
      .from('remote_access')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Registro de acesso remoto atualizado com sucesso.', record: data });
  } catch (error) {
    console.error('[UPDATE REMOTE RECORD] Erro ao atualizar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar registro de acesso remoto.' });
  }
}

// Deletar registro de acesso remoto
async function deleteRemoteRecord(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do registro não fornecido.' });
  }

  try {
    const { error } = await supabase
      .from('remote_access')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Registro de acesso remoto deletado com sucesso.' });
  } catch (error) {
    console.error('[DELETE REMOTE RECORD] Erro ao deletar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao deletar registro de acesso remoto.' });
  }
}
