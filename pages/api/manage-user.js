// pages/api/manage-user.js
import { createClient } from '@supabase/supabase-js';
import { logAction } from '../../utils/firebase/firebaseLogging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];
  const userRole = req.cookies['user-role'];

  const reqUser = {
    id: userId,
    name: userName,
    role: userRole,
  };

  const isUserValid = reqUser && reqUser.id && reqUser.name && reqUser.role;

  try {
    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando usuários...');
        const { data: users, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .order('name');

        if (fetchError) throw fetchError;

        // Mapear dados para manter compatibilidade com o frontend
        const mappedUsers = users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          profile: user.profile,
          squad: user.squad,
          chamado: user.can_ticket,
          telefone: user.can_phone,
          chat: user.can_chat,
          active: user.active
        }));
        
        return res.status(200).json({ users: mappedUsers });

      case 'POST':
        console.log('Método POST chamado - Adicionando novo usuário...');
        const newUser = req.body;

        // Verificar email duplicado
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', newUser.email)
          .single();

        if (existingUser) {
          return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        // Inserir novo usuário
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            name: newUser.name,
            email: newUser.email,
            profile: newUser.profile,
            squad: newUser.squad || null,
            can_ticket: newUser.chamado,
            can_phone: newUser.telefone,
            can_chat: newUser.chat,
            active: true
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        if (isUserValid) {
          await logAction(reqUser.id, reqUser.name, reqUser.role, 'create_user', 'Usuário', null, {
            userId: insertedUser.id,
            name: insertedUser.name,
            email: insertedUser.email,
          }, 'manage-user');
        }

        return res.status(201).json({ message: 'Usuário adicionado com sucesso.', id: insertedUser.id });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando usuário...');
        const updatedUser = req.body;
        const originalEmail = updatedUser.originalEmail; // E-mail original

        if (!updatedUser.id) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        // Verificar se usuário existe
        const { data: existingUserToUpdate } = await supabase
          .from('users')
          .select('*')
          .eq('id', updatedUser.id)
          .single();

        if (!existingUserToUpdate) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Iniciar transação para atualizar usuário e registros relacionados
        let emailChanged = existingUserToUpdate.email !== updatedUser.email;
        
        // Atualizar usuário
        const { data: updatedRecord, error: updateError } = await supabase
          .from('users')
          .update({
            name: updatedUser.name,
            email: updatedUser.email,
            profile: updatedUser.profile,
            squad: updatedUser.squad || null,
            can_ticket: updatedUser.chamado,
            can_phone: updatedUser.telefone,
            can_chat: updatedUser.chat,
            updated_at: new Date()
          })
          .eq('id', updatedUser.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Se o e-mail foi alterado, atualizar registros relacionados
        if (emailChanged && originalEmail) {
          // Atualizar email em help_records
          const { error: helpRecordsError } = await supabase
            .from('help_records')
            .update({ requester_email: updatedUser.email })
            .eq('requester_email', originalEmail);

          if (helpRecordsError) {
            console.error('Erro ao atualizar email em help_records:', helpRecordsError);
          }

          // Atualizar outros registros que possam ter referência ao e-mail do usuário
          // Exemplo: Se houver outras tabelas que usam o e-mail como referência

          // Registrar operação de atualização de email
          if (isUserValid) {
            await logAction(
              reqUser.id, 
              reqUser.name, 
              reqUser.role, 
              'update_email', 
              'Usuário', 
              { email: originalEmail }, 
              { email: updatedUser.email },
              'update-email'
            );
          }
        }

        if (isUserValid) {
          await logAction(reqUser.id, reqUser.name, reqUser.role, 'update_user', 'Usuário', {
            userId: existingUserToUpdate.id,
            name: existingUserToUpdate.name,
            email: existingUserToUpdate.email,
          }, {
            userId: updatedRecord.id,
            name: updatedRecord.name,
            email: updatedRecord.email,
          }, 'manage-user');
        }

        return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });

      case 'DELETE':
        console.log('Método DELETE chamado - Inativando usuário...');
        const deleteUserId = req.query.id;

        if (!deleteUserId) {
          return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }
      
        // Verificar se usuário existe
        const { data: userToDelete } = await supabase
          .from('users')
          .select('*')
          .eq('id', deleteUserId)
          .single();

        if (!userToDelete) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Marcar como inativo (soft delete)
        const { error: deleteError } = await supabase
          .from('users')
          .update({ 
            active: false, 
            updated_at: new Date() 
          })
          .eq('id', deleteUserId);

        if (deleteError) throw deleteError;

        if (isUserValid) {
          await logAction(reqUser.id, reqUser.name, reqUser.role, 'inactivate_user', 'Usuário', {
            userId: userToDelete.id,
            name: userToDelete.name,
            email: userToDelete.email,
            active: true
          }, {
            userId: userToDelete.id,
            name: userToDelete.name,
            email: userToDelete.email,
            active: false
          }, 'manage-user');
        }

        return res.status(200).json({ message: 'Usuário inativado com sucesso.' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${method} não permitido.`);
  }
} catch (error) {
  console.error('Erro ao processar requisição de usuário:', error);
  return res.status(500).json({ error: 'Erro ao processar requisição.' });
}
}