import { getAllCategories, getAllActiveUsers } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  try {
    // Obter categorias do Supabase
    const categories = await getAllCategories();
    
    // Obter analistas do Supabase (usuários com perfil 'analyst' ou 'tax')
    const allUsers = await getAllActiveUsers();
    const analysts = allUsers
      .filter((user) => user.profile === 'analyst' || user.profile === 'tax')
      .map((user) => ({
        id: user.id,
        name: user.name,
      }));
    
    // Formatar categorias para manter compatibilidade com o frontend
    const formattedCategories = categories.map(category => category.name);

    res.status(200).json({ analysts, categories: formattedCategories });
  } catch (error) {

    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}