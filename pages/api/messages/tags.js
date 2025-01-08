import { supabase } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .order('name');

        if (error) throw error;

        return res.status(200).json(data);
      } catch (error) {
        console.error('Error fetching tags:', error);
        return res.status(500).json({ error: 'Erro ao buscar tags' });
      }

    case 'POST':
      try {
        const { name } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Nome da tag é obrigatório' });
        }

        // Verificar se a tag já existe
        const { data: existingTag } = await supabase
          .from('tags')
          .select()
          .ilike('name', name)
          .single();

        if (existingTag) {
          return res.status(200).json(existingTag);
        }

        // Criar nova tag
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert([{ name: name.trim() }])
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json(newTag);
      } catch (error) {
        console.error('Error creating tag:', error);
        return res.status(500).json({ error: 'Erro ao criar tag' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}