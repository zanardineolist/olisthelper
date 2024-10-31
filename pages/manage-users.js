import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/ManageUsers.module.css';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Modal from 'react-modal';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

export default function ManageUsersPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
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
    // Obter a sessão do usuário
    const checkSession = async () => {
      const userSession = await getSession();
      if (!userSession || !['analyst', 'super', 'tax'].includes(userSession.role)) {
        router.push('/'); // Redirecionar para a página inicial se a sessão não for válida
      } else {
        setSession(userSession);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (session) {
      loadUsers();
    }
  }, [session]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/manage-user');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
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

      setUsers(users.filter((user) => user.id !== userId));

      Swal.fire('Excluído!', 'O usuário foi excluído com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      Swal.fire('Erro', 'Erro ao deletar usuário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/manage-user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error('Erro ao salvar usuário');

      const updatedUser = await res.json();
      if (isEditing) {
        setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      } else {
        setUsers([...users, { ...newUser, id: updatedUser.id }]);
      }

      setNewUser({ name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
      setIsEditing(false);
      setModalIsOpen(false);

      Swal.fire('Sucesso!', isEditing ? 'Usuário atualizado com sucesso.' : 'Usuário adicionado com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      Swal.fire('Erro', 'Erro ao salvar usuário.', 'error');
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

  if (!session) {
    return null; // Não renderizar nada até que a sessão seja verificada
  }

  return (
    <>
      <Head>
        <title>Gerenciamento de Usuários</title>
      </Head>

      <Navbar /> {/* Incluindo a Navbar */}

      <main className={styles.main}>
        <h1>Gerenciamento de Usuários</h1>

        {/* Modal para adicionar/editar usuário */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={handleCloseModal}
          contentLabel="Adicionar/Editar Usuário"
          className={styles.modal}
          overlayClassName={styles.overlay}
          ariaHideApp={false}
        >
          <h2 className={styles.modalTitle}>{isEditing ? 'Editar Usuário' : 'Adicionar Usuário'}</h2>
          <div className={styles.formContainer}>
            <input
              type="text"
              name="name"
              value={newUser.name}
              placeholder="Nome"
              className={styles.inputField}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              value={newUser.email}
              placeholder="E-mail"
              className={styles.inputField}
              onChange={handleInputChange}
              required
            />
            <Select
              options={profileOptions}
              value={profileOptions.find((opt) => opt.value === newUser.profile)}
              onChange={handleSelectChange}
              placeholder="Perfil"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#222',
                  borderColor: '#333',
                  color: '#fff',
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#fff',
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#333',
                }),
                option: (provided, state) => ({
                  ...provided,
                  color: state.isSelected ? '#f57c00' : '#fff',
                  backgroundColor: state.isFocused ? '#444' : '#333',
                }),
              }}
              required
            />
            <input
              type="text"
              name="squad"
              value={newUser.squad}
              placeholder="Squad"
              className={styles.inputField}
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
            <button onClick={handleSaveUser} disabled={loading} className={`${styles.saveButton} ${commonStyles.button}`}>
              {isEditing ? 'Atualizar Usuário' : 'Adicionar Usuário'}
            </button>
            <button onClick={handleCloseModal} className={`${styles.cancelButton} ${commonStyles.button}`}>
              Cancelar
            </button>
          </div>
        </Modal>

        {/* Tabela simplificada de usuários */}
        <div className={styles.cardContainer}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Lista de Usuários</h2>
            <button onClick={handleOpenModal} className={`${styles.addButton} ${commonStyles.button}`}>
              <FontAwesomeIcon icon={faPlus} /> Adicionar Novo Usuário
            </button>
          </div>
          <div className={styles.usersTable}>
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
                    <td className={styles.actionButtons}>
                      <button onClick={() => handleEditUser(user)} className={styles.editButton}>
                        <FontAwesomeIcon icon={faPencilAlt} /> Editar
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className={styles.deleteButton}>
                        <FontAwesomeIcon icon={faTrash} /> Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
