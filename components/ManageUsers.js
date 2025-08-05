import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import Modal from 'react-modal';
import styles from '../styles/ManageUsers.module.css';
import generalStyles from '../styles/Manager.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import stringSimilarity from 'string-similarity';
import { useApiLoader } from '../utils/apiLoader';
import { useLoading, ThreeDotsLoader } from './LoadingIndicator';

export default function ManageUsers({ user }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    profile: '',
    squad: '',
    // Mantendo os nomes antigos para compatibilidade com o resto da aplicação
    chamado: false,
    telefone: false,
    chat: false,
    // Novas permissões modulares
    registerHelp: false,
    remoteAccess: false,
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [originalEmail, setOriginalEmail] = useState(''); // Para rastrear o e-mail original durante a edição
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const { callApi } = useApiLoader();
  const { startLoading, stopLoading } = useLoading();

  const profileOptions = [
    { value: 'support', label: 'Suporte' },
    { value: 'analyst', label: 'Analista' },
    { value: 'super', label: 'Supervisor' },
    { value: 'tax', label: 'Fiscal' },
    { value: 'quality', label: 'Qualidade' },
    { value: 'dev', label: 'Desenvolvedor' },
    { value: 'partner', label: 'Parceiro' },
    { value: 'other', label: 'Outro' },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      startLoading({ 
        message: "Carregando usuários...",
        type: "local"
      });
      setLoading(true);
      setLoadingUsers(true);
      
      const data = await callApi('/api/manage-user', {}, {
        message: "Carregando usuários...",
        type: "local"
      });
      
      const activeUsers = data.users.filter(u => u.active === true);
      setUsers(activeUsers);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao carregar lista de usuários. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor ao carregar usuários. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Tentar novamente'
      });
    } finally {
      stopLoading();
      setLoading(false);
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (selectedOption) => {
    setNewUser((prev) => ({ ...prev, profile: selectedOption.value }));
  };

  const handleEditUser = (user) => {
    setNewUser(user);
    setOriginalEmail(user.email); // Salvar o e-mail original para comparação posterior
    setIsEditing(true);
    setModalIsOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    const isConfirmed = await Swal.fire({
      title: 'Confirmar inativação',
      text: 'Deseja realmente inativar este usuário? Ele não aparecerá mais na lista de usuários ativos, mas seus registros serão mantidos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, inativar!',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: true,
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      startLoading({ 
        message: "Inativando usuário...",
        type: "local"
      });
      setLoading(true);
      
      const result = await callApi(`/api/manage-user?id=${userId}`, {
        method: 'DELETE',
      }, {
        message: "Inativando usuário...",
        type: "local"
      });

      await loadUsers();

      Swal.fire({
        icon: 'success',
        title: 'Usuário inativado!',
        text: result.message || 'O usuário foi inativado com sucesso.',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao inativar usuário:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao inativar usuário. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('já está inativo')) {
          errorMessage = err.message;
        } else if (err.message.includes('Usuário não encontrado')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      startLoading({ 
        message: isEditing ? "Atualizando usuário..." : "Adicionando usuário...",
        type: "local"
      });
      setLoading(true);

      // Validações do frontend
      if (!newUser.name || !newUser.name.trim()) {
        await Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Nome do usuário é obrigatório. Por favor, preencha o campo "Nome".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!newUser.email || !newUser.email.trim()) {
        await Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'E-mail do usuário é obrigatório. Por favor, preencha o campo "E-mail".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      // Validar formato do e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email.trim())) {
        await Swal.fire({
          icon: 'error',
          title: 'E-mail inválido',
          text: 'Por favor, insira um e-mail válido (exemplo: usuario@empresa.com).',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!newUser.profile) {
        await Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Perfil do usuário é obrigatório. Por favor, selecione um perfil.',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!isEditing) {
        // Validações apenas para novos usuários
        const lowerCaseNewName = newUser.name.trim().toLowerCase();
        const lowerCaseNewEmail = newUser.email.trim().toLowerCase();

        // Verificar e-mails existentes
        const existingEmailUser = users.find(
          (user) => user.email.toLowerCase() === lowerCaseNewEmail
        );

        if (existingEmailUser) {
          await Swal.fire({
            icon: 'warning',
            title: 'E-mail já cadastrado',
            html: `O e-mail "<strong>${existingEmailUser.email}</strong>" já está cadastrado no nome "<strong>${existingEmailUser.name}</strong>".<br><br>Por favor, utilize um e-mail diferente ou edite o usuário existente.`,
            confirmButtonText: 'Entendi'
          });
          return;
        }

        // Verificar similaridade de nomes
        const userNames = users.map((user) => user.name.toLowerCase());
        const similarityThreshold = 0.7;
        const similarName = stringSimilarity.findBestMatch(lowerCaseNewName, userNames);

        if (similarName.bestMatch.rating >= similarityThreshold) {
          const similarUser = users.find(
            (user) => user.name.toLowerCase() === similarName.bestMatch.target
          );

          const result = await Swal.fire({
            icon: 'warning',
            title: 'Nome similar encontrado',
            html: `Existe um nome similar já cadastrado: "<strong>${similarUser.name}</strong>" com o e-mail "<strong>${similarUser.email}</strong>".<br><br>Deseja realmente prosseguir com o cadastro deste novo usuário?`,
            showCancelButton: true,
            confirmButtonText: 'Sim, adicionar',
            cancelButtonText: 'Cancelar',
            allowOutsideClick: true,
          });

          if (!result.isConfirmed) {
            return;
          }
        }
      } else if (isEditing && newUser.email !== originalEmail) {
        // Confirmação extra quando alterando e-mail durante edição
        const isEmailChangeConfirmed = await Swal.fire({
          icon: 'warning',
          title: 'Alteração de E-mail',
          html: `
            Você está alterando o e-mail de <strong>${originalEmail}</strong> para <strong>${newUser.email}</strong>.<br><br>
            Esta ação atualizará o e-mail em todos os registros relacionados ao usuário.<br><br>
            Deseja prosseguir com esta alteração?
          `,
          showCancelButton: true,
          confirmButtonText: 'Sim, alterar',
          cancelButtonText: 'Cancelar',
          allowOutsideClick: true,
        });

        if (!isEmailChangeConfirmed.isConfirmed) {
          return;
        }
      }

      // Lógica de cadastro/atualização
      const method = isEditing ? 'PUT' : 'POST';
      
      // Usando o novo método callApi
      const result = await callApi('/api/manage-user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUser,
          originalEmail: isEditing ? originalEmail : null,
        }),
      }, {
        message: isEditing ? "Atualizando usuário..." : "Adicionando usuário...",
        type: "local"
      });

      // Recarregar a lista após salvar
      await loadUsers();

      // Fechar modal e limpar formulário
      setModalIsOpen(false);
      resetForm();

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Usuário atualizado!' : 'Usuário adicionado!',
        text: result.message || (isEditing
          ? 'O usuário foi atualizado com sucesso.'
          : 'O usuário foi adicionado com sucesso.'),
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao salvar usuário. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('E-mail já cadastrado')) {
          errorMessage = err.message;
        } else if (err.message.includes('Nome do usuário é obrigatório')) {
          errorMessage = err.message;
        } else if (err.message.includes('E-mail do usuário é obrigatório')) {
          errorMessage = err.message;
        } else if (err.message.includes('Formato de e-mail inválido')) {
          errorMessage = err.message;
        } else if (err.message.includes('Perfil do usuário é obrigatório')) {
          errorMessage = err.message;
        } else if (err.message.includes('Usuário não encontrado')) {
          errorMessage = err.message;
        } else if (err.message.includes('já está inativo')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      profile: '',
      squad: '',
      chamado: false,
      telefone: false,
      chat: false,
      registerHelp: false,
      remoteAccess: false
    });
    setIsEditing(false);
    setOriginalEmail('');
  };

  const handleOpenModal = () => {
    resetForm();
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      caretColor: 'var(--text-color)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '220px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'var(--scroll-bg)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--scroll)',
        borderRadius: '10px',
        border: '2px solid var(--scroll-bg)',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--color-trodd)' : state.isSelected ? 'var(--color-primary)' : 'var(--box-color)',
      color: 'var(--text-color)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--color-trodd)',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border)',
    }),
  };

  return (
    <div className={generalStyles.main}>
      {/* Modal para adicionar/editar usuário */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Adicionar/Editar Usuário"
        className={generalStyles.modal}
        overlayClassName={generalStyles.overlay}
        ariaHideApp={false}
      >
        <h2 className={generalStyles.modalTitle}>{isEditing ? 'Editar Usuário' : 'Adicionar Usuário'}</h2>
        <div className={generalStyles.formContainer}>
          <input
            type="text"
            name="name"
            value={newUser.name}
            placeholder="Nome"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            required
            autoComplete="off"
          />
          <input
            type="email"
            name="email"
            value={newUser.email}
            placeholder="Informe um e-mail ou use um generico."
            className={generalStyles.inputField}
            onChange={handleInputChange}
            required
            autoComplete="off"
          />
          <Select
            options={profileOptions}
            value={profileOptions.find((opt) => opt.value === newUser.profile)}
            onChange={handleSelectChange}
            placeholder="Perfil"
            styles={customSelectStyles}
            required
          />
          <input
            type="text"
            name="squad"
            value={newUser.squad}
            placeholder="Squad"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            autoComplete="off"
          />
          <div className={styles.checkboxContainer}>
            <label>
              <input
                type="checkbox"
                name="chamado"
                checked={newUser.chamado}
                onChange={handleInputChange}
              />
              Chamado
            </label>
            <label>
              <input
                type="checkbox"
                name="telefone"
                checked={newUser.telefone}
                onChange={handleInputChange}
              />
              Telefone
            </label>
            <label>
              <input
                type="checkbox"
                name="chat"
                checked={newUser.chat}
                onChange={handleInputChange}
              />
              Chat
            </label>
            <label>
              <input
                type="checkbox"
                name="registerHelp"
                checked={newUser.registerHelp}
                onChange={handleInputChange}
              />
              Registrar Ajudas
            </label>
            <label>
              <input
                type="checkbox"
                name="remoteAccess"
                checked={newUser.remoteAccess}
                onChange={handleInputChange}
              />
              Acesso Remoto
            </label>
          </div>
          <button onClick={handleSaveUser} disabled={loading} className={generalStyles.saveButton}>
            {isEditing ? 'Atualizar Usuário' : 'Adicionar Usuário'}
          </button>
          <button onClick={handleCloseModal} className={generalStyles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Tabela de usuários */}
      <div className={`${generalStyles.cardContainer} ${styles.cardContainer}`}>
        <div className={generalStyles.cardHeader}>
          <h2 className={generalStyles.cardTitle}>Lista de Usuários</h2>
          <button onClick={handleOpenModal} className={generalStyles.addButton}>
            <FontAwesomeIcon icon={faPlus} /> Add Usuário
          </button>
        </div>
        
        {loadingUsers ? (
          <div className={styles.loadingContainer}>
            <ThreeDotsLoader message="Carregando usuários..." />
          </div>
        ) : (
          <div className={styles.itemsTable}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Chamado</th>
                  <th>Telefone</th>
                  <th>Chat</th>
                  <th>Ajudas</th>
                  <th>Remoto</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        checked={user.chamado}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        checked={user.telefone}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        checked={user.chat}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        checked={user.registerHelp}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        checked={user.remoteAccess}
                      />
                    </td>
                    <td className={generalStyles.actionButtons}>
                      <button onClick={() => handleEditUser(user)} className={generalStyles.actionButtonIcon}>
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className={generalStyles.actionButtonIcon}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}