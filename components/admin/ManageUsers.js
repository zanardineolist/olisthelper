import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import Modal from 'react-modal';
import styles from '../../styles/ManageUsers.module.css';
import generalStyles from '../../styles/Manager.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import stringSimilarity from 'string-similarity';
import { useApiLoader } from '../../utils/apiLoader';
import { useLoading, ThreeDotsLoader } from '../ui';

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
    { value: 'support+', label: 'Suporte Remoto' },
    { value: 'analyst', label: 'Analista' },
    { value: 'super', label: 'Supervisor' },
    { value: 'tax', label: 'Fiscal' },
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
        type: "local" // Usando loading local 
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
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
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
      title: 'Tem certeza?',
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
        type: "local" // Usando loading local 
      });
      setLoading(true);
      
      await callApi(`/api/manage-user?id=${userId}`, {
        method: 'DELETE',
      }, {
        message: "Inativando usuário...",
        type: "local"
      });

      await loadUsers();

      Swal.fire({
        icon: 'success',
        title: 'Inativado!',
        text: 'O usuário foi inativado com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao inativar usuário:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
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
        type: "local" // Usando loading local 
      });
      setLoading(true);

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
            html: `O e-mail "<strong>${existingEmailUser.email}</strong>" já está cadastrado no nome "<strong>${existingEmailUser.name}</strong>". Por favor, verifique antes de prosseguir.`,
            showConfirmButton: true,
            allowOutsideClick: true,
          });
          stopLoading();
          setLoading(false);
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
            html: `Existe um nome similar já cadastrado: "<strong>${similarUser.name}</strong>" com o e-mail "<strong>${similarUser.email}</strong>". Deseja realmente prosseguir com o cadastro deste novo usuário?`,
            showCancelButton: true,
            confirmButtonText: 'Sim, adicionar',
            cancelButtonText: 'Cancelar',
            allowOutsideClick: true,
          });

          if (!result.isConfirmed) {
            stopLoading();
            setLoading(false);
            return;
          }
        }
      } else {
        // Para edição, verificar se o e-mail foi alterado e se já existe
        if (newUser.email.toLowerCase() !== originalEmail.toLowerCase()) {
          const existingEmailUser = users.find(
            (user) => user.email.toLowerCase() === newUser.email.toLowerCase() && user.email.toLowerCase() !== originalEmail.toLowerCase()
          );

          if (existingEmailUser) {
            await Swal.fire({
              icon: 'warning',
              title: 'E-mail já cadastrado',
              html: `O e-mail "<strong>${existingEmailUser.email}</strong>" já está cadastrado no nome "<strong>${existingEmailUser.name}</strong>". Por favor, verifique antes de prosseguir.`,
              showConfirmButton: true,
              allowOutsideClick: true,
            });
            stopLoading();
            setLoading(false);
            return;
          }
        }
      }

      // Salvar no Supabase
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { ...newUser, originalEmail }
        : newUser;

      await callApi('/api/manage-user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }, {
        message: isEditing ? "Atualizando usuário..." : "Adicionando usuário...",
        type: "local"
      });

      await loadUsers();

      setNewUser({
        name: '',
        email: '',
        profile: '',
        squad: '',
        chamado: false,
        telefone: false,
        chat: false,
      });
      setIsEditing(false);
      setModalIsOpen(false);
      setOriginalEmail('');

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: isEditing ? 'Usuário atualizado com sucesso.' : 'Usuário adicionado com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setNewUser({
      name: '',
      email: '',
      profile: '',
      squad: '',
      chamado: false,
      telefone: false,
      chat: false,
    });
    setIsEditing(false);
    setOriginalEmail('');
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
    setNewUser({
      name: '',
      email: '',
      profile: '',
      squad: '',
      chamado: false,
      telefone: false,
      chat: false,
    });
    setIsEditing(false);
    setOriginalEmail('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newUser.name.trim() && newUser.email.trim() && newUser.profile) {
      handleSaveUser();
    }
  };

  const getProfileLabel = (role) => {
    const profile = profileOptions.find(p => p.value === role);
    return profile ? profile.label : role;
  };

  const getProfileColor = (role) => {
    const colors = {
      'support': '#007bff',
      'support+': '#17a2b8',
      'analyst': '#28a745',
      'super': '#dc3545',
      'tax': '#6f42c1',
      'partner': '#fd7e14',
      'other': '#6c757d',
    };
    return colors[role] || '#6c757d';
  };

  const getChannelLabels = (user) => {
    const channels = [];
    if (user.chamado) channels.push('Chamado');
    if (user.telefone) channels.push('Telefone');
    if (user.chat) channels.push('Chat');
    return channels.join(', ') || 'Nenhum';
  };

  const selectedProfile = profileOptions.find(option => option.value === newUser.profile);

  return (
    <div className={generalStyles.managerContainer}>
      <div className={generalStyles.managerHeader}>
        <h2 className={generalStyles.managerTitle}>Gerenciar Usuários</h2>
        <button 
          className={generalStyles.addButton} 
          onClick={handleOpenModal}
        >
          <FontAwesomeIcon icon={faPlus} /> Novo Usuário
        </button>
      </div>

      <div className={generalStyles.managerContent}>
        {loadingUsers ? (
          <div className={styles.loadingContainer}>
            <ThreeDotsLoader message="Carregando usuários..." />
          </div>
        ) : (
          <div className={styles.usersList}>
            {users.length === 0 ? (
              <p className={styles.noUsersMessage}>Nenhum usuário cadastrado.</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.userInfo}>
                    <div className={styles.userHeader}>
                      <h3 className={styles.userName}>{user.name}</h3>
                      <span 
                        className={styles.userProfile}
                        style={{ backgroundColor: getProfileColor(user.profile) }}
                      >
                        {getProfileLabel(user.profile)}
                      </span>
                    </div>
                    
                    <div className={styles.userDetails}>
                      <p className={styles.userEmail}>
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p className={styles.userSquad}>
                        <strong>Squad:</strong> {user.squad || 'Não informado'}
                      </p>
                      <p className={styles.userChannels}>
                        <strong>Canais:</strong> {getChannelLabels(user)}
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.userActions}>
                    <button
                      onClick={() => handleEditUser(user)}
                      className={styles.editButton}
                      title="Editar usuário"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className={styles.deleteButton}
                      title="Inativar usuário"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <div className={styles.modalContent}>
          <h3 className={styles.modalTitle}>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSubmit} className={styles.userForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome *</label>
                <input
                  type="text"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>E-mail *</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Perfil *</label>
                <Select
                  value={selectedProfile}
                  onChange={handleSelectChange}
                  options={profileOptions}
                  placeholder="Selecione um perfil"
                  className={styles.selectInput}
                  classNamePrefix="select"
                  isSearchable={false}
                  theme={(theme) => ({
                    ...theme,
                    colors: {
                      ...theme.colors,
                      primary: 'var(--color-primary)',
                      primary25: 'var(--bg-light)',
                      neutral0: 'var(--bg-color)',
                      neutral80: 'var(--text-color)',
                    },
                  })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Squad</label>
                <input
                  type="text"
                  name="squad"
                  value={newUser.squad}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ex: Seller Experience"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Canais de Atendimento</label>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="chamado"
                    checked={newUser.chamado}
                    onChange={handleInputChange}
                  />
                  <span className={styles.checkmark}></span>
                  Chamado
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="telefone"
                    checked={newUser.telefone}
                    onChange={handleInputChange}
                  />
                  <span className={styles.checkmark}></span>
                  Telefone
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="chat"
                    checked={newUser.chat}
                    onChange={handleInputChange}
                  />
                  <span className={styles.checkmark}></span>
                  Chat
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={styles.saveButton}
                disabled={loading || !newUser.name.trim() || !newUser.email.trim() || !newUser.profile}
              >
                {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
} 