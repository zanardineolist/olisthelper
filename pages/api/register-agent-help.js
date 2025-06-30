import { supabaseAdmin, getUserWithPermissions } from '../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session?.id) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar permissão can_register_help
  const helperUser = await getUserWithPermissions(session.id);
  if (!helperUser?.can_register_help) {
    return res.status(403).json({ error: 'Você não tem permissão para registrar ajuda entre agentes' });
  }

  const { helpedAgentId, category, description } = req.body;

  // Validar campos obrigatórios
  if (!helpedAgentId || !category || !description) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar se o agente ajudado existe e é um agente válido
    const { data: helpedAgent, error: helpedAgentError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, profile')
      .eq('id', helpedAgentId)
      .eq('active', true)
      .single();

    if (helpedAgentError || !helpedAgent) {
      return res.status(400).json({ error: 'Agente não encontrado ou inativo' });
    }

    // Verificar se é um perfil de agente válido
    const validAgentProfiles = ['analyst', 'tax', 'super', 'quality', 'dev'];
    if (!validAgentProfiles.includes(helpedAgent.profile)) {
      return res.status(400).json({ error: 'O usuário selecionado não é um agente válido' });
    }

    // Buscar o ID da categoria pelo nome
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', category)
      .eq('active', true)
      .single();
    
    if (categoryError || !categoryData) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }

    // Verificar se não está tentando registrar ajuda para si mesmo
    if (session.id === helpedAgentId) {
      return res.status(400).json({ error: 'Você não pode registrar ajuda para si mesmo' });
    }

    // Registrar a ajuda entre agentes
    const { error: insertError } = await supabaseAdmin
      .from('agent_help_records')
      .insert([{
        helper_agent_id: session.id,
        helped_agent_id: helpedAgentId,
        category_id: categoryData.id,
        description: description.trim()
      }]);

    if (insertError) {
      console.error('Erro ao inserir registro de ajuda:', insertError);
      throw insertError;
    }

    res.status(200).json({ 
      message: 'Ajuda registrada com sucesso.',
      data: {
        helpedAgent: helpedAgent.name,
        category: category,
        description: description.trim()
      }
    });

  } catch (error) {
    console.error('Erro ao registrar ajuda entre agentes:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Por favor, tente novamente.' });
  }
} 