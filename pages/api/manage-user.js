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
        const { data: users, error: fetchUsersError } = await supabase
          .from('users')
          .select('*')
          .order('name');

        if (fetchUsersError) {
          console.error('Erro ao buscar usuários:', fetchUsersError);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao carregar lista de usuários. Tente novamente em alguns instantes.' 
          });
        }

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
          registerHelp: user.can_register_help,
          remoteAccess: user.can_remote_access,
          active: user.active
        }));
        
        return res.status(200).json({ users: mappedUsers });

      case 'POST':
        const newUser = req.body;

        // Validações obrigatórias
        if (!newUser.name || !newUser.name.trim()) {
          return res.status(400).json({ 
            error: 'Nome do usuário é obrigatório. Por favor, preencha o campo "Nome".' 
          });
        }

        if (!newUser.email || !newUser.email.trim()) {
          return res.status(400).json({ 
            error: 'E-mail do usuário é obrigatório. Por favor, preencha o campo "E-mail".' 
          });
        }

        // Validar formato do e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
          return res.status(400).json({ 
            error: 'Formato de e-mail inválido. Por favor, insira um e-mail válido (exemplo: usuario@empresa.com).' 
          });
        }

        if (!newUser.profile) {
          return res.status(400).json({ 
            error: 'Perfil do usuário é obrigatório. Por favor, selecione um perfil.' 
          });
        }

        // Verificar email duplicado
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('email, name')
          .eq('email', newUser.email.trim().toLowerCase())
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Erro ao verificar e-mail duplicado:', checkError);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao verificar e-mail. Tente novamente.' 
          });
        }

        if (existingUser) {
          return res.status(400).json({ 
            error: `E-mail já cadastrado para o usuário "${existingUser.name}". Por favor, utilize um e-mail diferente ou edite o usuário existente.` 
          });
        }

        // Inserir novo usuário
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            name: newUser.name.trim(),
            email: newUser.email.trim().toLowerCase(),
            profile: newUser.profile,
            squad: newUser.squad?.trim() || null,
            can_ticket: newUser.chamado || false,
            can_phone: newUser.telefone || false,
            can_chat: newUser.chat || false,
            can_register_help: newUser.registerHelp || false,
            can_remote_access: newUser.remoteAccess || false,
            active: true
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Erro ao inserir usuário:', insertError);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao criar usuário. Tente novamente em alguns instantes.' 
          });
        }

        if (isUserValid) {
          await logAction(reqUser.id, reqUser.name, reqUser.role, 'create_user', 'Usuário', null, {
            userId: insertedUser.id,
            name: insertedUser.name,
            email: insertedUser.email,
          }, 'manage-user');
        }

        return res.status(201).json({ 
          message: `Usuário "${insertedUser.name}" adicionado com sucesso.`,
          id: insertedUser.id 
        });

      case 'PUT':
        const updatedUser = req.body;
        const originalEmail = updatedUser.originalEmail;

        // Validações obrigatórias
        if (!updatedUser.id) {
          return res.status(400).json({ 
            error: 'ID do usuário não fornecido. Erro interno do sistema.' 
          });
        }

        if (!updatedUser.name || !updatedUser.name.trim()) {
          return res.status(400).json({ 
            error: 'Nome do usuário é obrigatório. Por favor, preencha o campo "Nome".' 
          });
        }

        if (!updatedUser.email || !updatedUser.email.trim()) {
          return res.status(400).json({ 
            error: 'E-mail do usuário é obrigatório. Por favor, preencha o campo "E-mail".' 
          });
        }

        // Validar formato do e-mail
        if (!emailRegex.test(updatedUser.email)) {
          return res.status(400).json({ 
            error: 'Formato de e-mail inválido. Por favor, insira um e-mail válido (exemplo: usuario@empresa.com).' 
          });
        }

        if (!updatedUser.profile) {
          return res.status(400).json({ 
            error: 'Perfil do usuário é obrigatório. Por favor, selecione um perfil.' 
          });
        }

        // Verificar se usuário existe
        const { data: existingUserToUpdate, error: fetchUpdateError } = await supabase
          .from('users')
          .select('*')
          .eq('id', updatedUser.id)
          .single();

        if (fetchUpdateError) {
          console.error('Erro ao buscar usuário para atualização:', fetchUpdateError);
          return res.status(404).json({ 
            error: 'Usuário não encontrado. O usuário pode ter sido removido ou você não tem permissão para editá-lo.' 
          });
        }

        // Verificar se o novo e-mail já existe em outro usuário
        if (updatedUser.email.trim().toLowerCase() !== existingUserToUpdate.email.toLowerCase()) {
          const { data: emailExists, error: emailCheckError } = await supabase
            .from('users')
            .select('email, name')
            .eq('email', updatedUser.email.trim().toLowerCase())
            .neq('id', updatedUser.id)
            .single();

          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error('Erro ao verificar e-mail duplicado:', emailCheckError);
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao verificar e-mail. Tente novamente.' 
            });
          }

          if (emailExists) {
            return res.status(400).json({ 
              error: `E-mail já cadastrado para o usuário "${emailExists.name}". Por favor, utilize um e-mail diferente.` 
            });
          }
        }

        // Iniciar transação para atualizar usuário e registros relacionados
        let emailChanged = existingUserToUpdate.email.toLowerCase() !== updatedUser.email.trim().toLowerCase();
        
        // Atualizar usuário
        const { data: updatedRecord, error: updateError } = await supabase
          .from('users')
          .update({
            name: updatedUser.name.trim(),
            email: updatedUser.email.trim().toLowerCase(),
            profile: updatedUser.profile,
            squad: updatedUser.squad?.trim() || null,
            can_ticket: updatedUser.chamado || false,
            can_phone: updatedUser.telefone || false,
            can_chat: updatedUser.chat || false,
            can_register_help: updatedUser.registerHelp || false,
            can_remote_access: updatedUser.remoteAccess || false,
            updated_at: new Date()
          })
          .eq('id', updatedUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar usuário:', updateError);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao atualizar usuário. Tente novamente em alguns instantes.' 
          });
        }

        // Se o e-mail foi alterado, atualizar registros relacionados
        if (emailChanged && originalEmail) {
          try {
            // Atualizar email em help_records
            const { error: helpRecordsError } = await supabase
              .from('help_records')
              .update({ requester_email: updatedUser.email.trim().toLowerCase() })
              .eq('requester_email', originalEmail);

            if (helpRecordsError) {
              console.error('Erro ao atualizar e-mail em registros:', helpRecordsError);
              // Não falhar a operação, apenas logar o erro
            }

            // Registrar operação de atualização de email
            if (isUserValid) {
              await logAction(
                reqUser.id, 
                reqUser.name, 
                reqUser.role, 
                'update_email', 
                'Usuário', 
                { email: originalEmail }, 
                { email: updatedUser.email.trim().toLowerCase() },
                'update-email'
              );
            }
          } catch (error) {
            console.error('Erro ao atualizar e-mails relacionados:', error);
            // Não falhar a operação principal
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

        return res.status(200).json({ 
          message: `Usuário "${updatedRecord.name}" atualizado com sucesso.` 
        });

      case 'DELETE':
        const deleteUserId = req.query.id;

        if (!deleteUserId) {
          return res.status(400).json({ 
            error: 'ID do usuário não fornecido. Erro interno do sistema.' 
          });
        }
      
        // Verificar se usuário existe
        const { data: userToDelete, error: deleteFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', deleteUserId)
          .single();

        if (deleteFetchError) {
          console.error('Erro ao buscar usuário para inativação:', deleteFetchError);
          return res.status(404).json({ 
            error: 'Usuário não encontrado. O usuário pode ter sido removido anteriormente.' 
          });
        }

        // Verificar se o usuário já está inativo
        if (!userToDelete.active) {
          return res.status(400).json({ 
            error: `O usuário "${userToDelete.name}" já está inativo.` 
          });
        }

        // Marcar como inativo (soft delete)
        const { error: deleteError } = await supabase
          .from('users')
          .update({ 
            active: false, 
            updated_at: new Date() 
          })
          .eq('id', deleteUserId);

        if (deleteError) {
          console.error('Erro ao inativar usuário:', deleteError);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao inativar usuário. Tente novamente em alguns instantes.' 
          });
        }

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

        return res.status(200).json({ 
          message: `Usuário "${userToDelete.name}" inativado com sucesso.` 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Método ${method} não permitido. Use GET, POST, PUT ou DELETE.` 
        });
    }
  } catch (error) {
    console.error('Erro não tratado na API manage-user:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.' 
    });
  }
}