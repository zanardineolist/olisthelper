// pages/manage-users.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/ManageUsers.module.css';
import Footer from '../components/Footer';

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
        const res = await fetch('/api/get-users');
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

      const updatedUsers = await res.json();
      setUsers(updatedUsers);
      setNewUser({ id: '', name: '', email: '', profile: '', squad: '', chamado: false, telefone: false, chat: false });
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/manage-user?id=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar usuário');

      const updatedUsers = await res.json();
      setUsers(updatedUsers);
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Gerenciamento de Usuários</title>
      </Head>

      <main className={styles.main}>
        <h1>Gerenciamento de Usuários</h1>

        {/* Formulário para adicionar/editar usuário */}
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
          <button onClick={handleSaveUser} disabled={loading} className={styles.saveButton}>
            {isEditing ? 'Atualizar' : 'Adicionar'} Usuário
          </button>
        </div>

        {/* Tabela de usuários */}
        <div className={styles.usersTable}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Squad</th>
                <th>Chamado</th>
                <th>Telefone</th>
                <th>Chat</th>
                <th>Ações</th>
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
                    <button onClick={() => handleEditUser(user)}>Editar</button>
                    <button onClick={() => handleDeleteUser(user.id)}>Excluir</button>
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