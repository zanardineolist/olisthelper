import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
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
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }));
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
            <button onClick={handleSaveUser} disabled={loading} className={`${styles.saveButton} ${commonStyles.button}`}>
              {isEditing ? 'Atualizar Usuário' : 'Adicionar Usuário'}
            </button>
            <button onClick={handleCloseModal} className={`${styles.cancelButton} ${commonStyles.button}`}>
              Cancelar
            </button>
          </div>
        </Modal>

        {/* Tabela simplificada de usuários */}
        <div className={styles.usersTable}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Nome</th>
                <th style={{ width: '40%' }}>E-mail</th>
                <th style={{ width: '30%' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
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
