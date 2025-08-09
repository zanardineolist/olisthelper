import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter o nome da categoria dos dados do request
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }

    // Verificar a sessão do usuário (requerida)
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

      // Buscar a categoria no banco de dados pelo nome (insensível a caixa)
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, active')
      .ilike('name', name.trim())
      .single();

    if (error && error.code !== 'PGRST116') { // Código para "Nenhum resultado encontrado"
      console.error('Erro ao verificar categoria:', error);
      return res.status(500).json({ error: 'Erro ao verificar categoria' });
    }

    // Retornar o resultado da verificação
    if (data) {
      return res.status(200).json({
        exists: true,
        active: data.active,
        id: data.id,
        name: data.name
      });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 