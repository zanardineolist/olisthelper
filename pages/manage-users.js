import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/ManageUsers.module.css';
import Footer from '../components/Footer';
import Modal from 'react-modal';

export default function ManageUsersPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    id: '',
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
    { value: 'other', label: 'Outro' },
  ];

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/manage-user');
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        const data = await res.json();
        setUsers(data.users);
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

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
    try {
      setLoading(true);
      const res = await fetch(`/api/manage-user?id=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar usuário');
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
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
        setUsers([...users, updatedUser]);
      }

      setNewUser({ id: '', name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
      setIsEditing(false);
      setModalIsOpen(false);
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setNewUser({ id: '', name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
    setIsEditing(false);
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  return (
    <>
      <Head>
        <title>Gerenciamento de Usuários</title>
      </Head>

      <main className={styles.main}>
        <h1>Gerenciamento de Usuários</h1>
        <button onClick={handleOpenModal} className={`${styles.addButton} ${commonStyles.button}`}>Adicionar Novo Usuário</button>

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
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              value={newUser.email}
              placeholder="E-mail"
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
            />
            <input
              type="text"
              name="squad"
              value={newUser.squad}
              placeholder="Squad"
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

        {/* Tabela de usuários */}
        <div className={styles.usersTable}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '5%' }}>ID</th>
                <th style={{ width: '15%' }}>Nome</th>
                <th style={{ width: '20%' }}>E-mail</th>
                <th style={{ width: '10%' }}>Perfil</th>
                <th style={{ width: '10%' }}>Squad</th>
                <th style={{ width: '10%' }}>Chamado</th>
                <th style={{ width: '10%' }}>Telefone</th>
                <th style={{ width: '10%' }}>Chat</th>
                <th style={{ width: '10%' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.profile}</td>
                  <td>{user.squad}</td>
                  <td>{user.chamado ? '✔' : '✘'}</td>
                  <td>{user.telefone ? '✔' : '✘'}</td>
                  <td>{user.chat ? '✔' : '✘'}</td>
                  <td>
                    <button onClick={() => handleEditUser(user)} className={styles.editButton}>Editar</button>
                    <button onClick={() => handleDeleteUser(user.id)} className={styles.deleteButton}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['analyst', 'super'].includes(session.role)) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: { session },
  };
}
