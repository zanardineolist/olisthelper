import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar operações de CRUD na tabela de registros de ajuda
 */
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getHelpRecords(req, res);
      break;

    case 'POST':
      await createHelpRecord(req, res);
      break;

    case 'PUT':
      await updateHelpRecord(req, res);
      break;

    case 'DELETE':
      await deleteHelpRecord(req, res);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido.`);
  }
}

// Listar todos os registros de ajuda
async function getHelpRecords(req, res) {
  try {
    const { data, error } = await supabase
      .from('help_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nenhum registro de ajuda encontrado.' });
    }

    return res.status(200).json({ records: data });
  } catch (error) {
    console.error('[GET HELP RECORDS] Erro ao listar registros:', error.message);
    return res.status(500).json({ error: 'Erro ao listar registros de ajuda.' });
  }
}

// Criar novo registro de ajuda
async function createHelpRecord(req, res) {
  const { user_id, analyst_id, category_id, description, date, time } = req.body;

  if (!user_id || !analyst_id || !category_id || !date || !time) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    const { data, error } = await supabase
      .from('help_records')
      .insert([{ user_id, analyst_id, category_id, description, date, time }]);

    if (error) throw error;

    return res.status(201).json({ message: 'Registro de ajuda criado com sucesso.', record: data });
  } catch (error) {
    console.error('[CREATE HELP RECORD] Erro ao criar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao criar registro de ajuda.' });
  }
}

// Atualizar registro de ajuda existente
async function updateHelpRecord(req, res) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do registro não fornecido.' });
  }

  try {
    const { data, error } = await supabase
      .from('help_records')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Registro de ajuda atualizado com sucesso.', record: data });
  } catch (error) {
    console.error('[UPDATE HELP RECORD] Erro ao atualizar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar registro de ajuda.' });
  }
}

// Deletar registro de ajuda
async function deleteHelpRecord(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do registro não fornecido.' });
  }

  try {
    const { error } = await supabase
      .from('help_records')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Registro de ajuda deletado com sucesso.' });
  } catch (error) {
    console.error('[DELETE HELP RECORD] Erro ao deletar registro:', error.message);
    return res.status(500).json({ error: 'Erro ao deletar registro de ajuda.' });
  }
}
