import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import Modal from 'react-modal';
import styles from '../styles/ManageUsers.module.css';
import generalStyles from '../styles/Manager.module.css'; // Importando o estilo geral
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import stringSimilarity from 'string-similarity'; // Importar a biblioteca de similaridade

export default function ManageUsers({ user }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    profile: '',
    squad: '',
    chamado: false,
    telefone: false,
    chat: false,
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const profileOptions = [
    { value: 'support', label: 'Suporte' },
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
      setLoading(true);
      const res = await fetch('/api/manage-user');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar usuários.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
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
    setIsEditing(true);
    setModalIsOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    const isConfirmed = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: true,
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/manage-user?id=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar usuário');

      await loadUsers();

      Swal.fire({
        icon: 'success',
        title: 'Excluído!',
        text: 'O usuário foi excluído com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao deletar usuário.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      setLoading(true);

      // Validação: verificar se o nome ou e-mail já existem
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
        setLoading(false);
        return;
      }

      // Verificar similaridade de nomes usando string-similarity
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
          setLoading(false);
          return;
        }
      }

      // Caso não existam conflitos, prosseguir com o salvamento
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/manage-user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error('Erro ao salvar usuário');

      await loadUsers();

      setNewUser({ name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
      setIsEditing(false);
      setModalIsOpen(false);

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
        text: 'Erro ao salvar usuário.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setNewUser({ name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
    setIsEditing(false);
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#222',
      borderColor: state.isFocused ? '#F0A028' : '#444',
      color: '#fff',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#F0A028',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: '#fff',
      caretColor: '#fff',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1e1e1e',
      maxHeight: '220px',
      overflowY: 'auto',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '220px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#121212',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#555',
        borderRadius: '10px',
        border: '2px solid #121212',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#333' : state.isSelected ? '#F0A028' : '#1e1e1e',
      color: '#fff',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#333',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#fff',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#aaa',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#fff',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#444',
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
          />
          <input
            type="email"
            name="email"
            value={newUser.email}
            placeholder="Informe um e-mail ou use um generico."
            className={generalStyles.inputField}
            onChange={handleInputChange}
            required
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
        <div className={styles.itemsTable}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
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
      </div>
    </div>
  );
}