import { supabase } from '../../utils/supabase';
import { logAction } from '../../utils/firebase/firebaseLogging';

export default async function handler(req, res) {
  const { method } = req;
  
  // Recuperar informações do usuário dos cookies
  const requesterId = req.cookies['user-id'];
  const requesterName = req.cookies['user-name'];
  const requesterRole = req.cookies['user-role'];

  if (!requesterId || !requesterName || !requesterRole) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar se o usuário tem permissão (super, analyst, tax)
  if (!['super', 'analyst', 'tax'].includes(requesterRole)) {
    return res.status(403).json({ error: 'Permissão negada' });
  }

  try {
    switch (method) {
      case 'GET':
        const { data: users, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .order('name');

        if (fetchError) throw fetchError;

        return res.status(200).json({ users });

      case 'POST':
        const newUser = req.body;

        // Verificar se o email já existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', newUser.email)
          .single();

        if (existingUser) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Criar novo usuário
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([{
            name: newUser.name,
            email: newUser.email,
            role: newUser.profile,
            squad: newUser.squad || null,
            chamado: newUser.chamado || false,
            telefone: newUser.telefone || false,
            chat: newUser.chat || false,
            active: true
          }])
          .select()
          .single();

        if (createError) throw createError;

        // Registrar ação
        await logAction(
          requesterId,
          requesterName,
          requesterRole,
          'create_user',
          'Usuário',
          null,
          { name: newUser.name, email: newUser.email },
          'manage-user'
        );

        return res.status(201).json(createdUser);

      case 'PUT':
        const updatedUser = req.body;

        // Verificar se o usuário existe
        const { data: currentUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', updatedUser.id)
          .single();

        if (userError) throw userError;

        // Atualizar usuário
        const { data: updatedData, error: updateError } = await supabase
          .from('users')
          .update({
            name: updatedUser.name,
            role: updatedUser.profile,
            squad: updatedUser.squad || null,
            chamado: updatedUser.chamado || false,
            telefone: updatedUser.telefone || false,
            chat: updatedUser.chat || false
          })
          .eq('id', updatedUser.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Registrar ação
        await logAction(
          requesterId,
          requesterName,
          requesterRole,
          'update_user',
          'Usuário',
          currentUser,
          updatedData,
          'manage-user'
        );

        return res.status(200).json(updatedData);

      case 'DELETE':
        const { id } = req.query;

        // Verificar se o usuário existe
        const { data: userToDelete, error: deleteCheckError } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (deleteCheckError) throw deleteCheckError;

        // Soft delete (marcar como inativo)
        const { error: deleteError } = await supabase
          .from('users')
          .update({ active: false })
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Registrar ação
        await logAction(
          requesterId,
          requesterName,
          requesterRole,
          'delete_user',
          'Usuário',
          userToDelete,
          null,
          'manage-user'
        );

        return res.status(200).json({ message: 'Usuário desativado com sucesso' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar requisição. Verifique suas credenciais e a configuração do Supabase.' 
    });
  }
}