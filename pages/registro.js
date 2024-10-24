// pages/registro.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import Footer from '../components/Footer';

export default function RegistroPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    const loadUsersAndCategories = async () => {
      try {
        setLoading(true);

        // Carregar usuários
        const usersRes = await fetch('/api/get-users');
        const usersData = await usersRes.json();
        setUsers(usersData.users);

        // Carregar categorias
        const categoriesRes = await fetch('/api/get-analysts-categories');
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories);

      } catch (err) {
        console.error('Erro ao carregar usuários e categorias:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsersAndCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Buscar o nome e email do usuário selecionado a partir do estado `users`
      const selectedUser = users.find((user) => user.id === formData.user);
      const userName = selectedUser ? selectedUser.name : '';
      const userEmail = selectedUser ? selectedUser.email : '';
  
      const response = await fetch('/api/register-analyst-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userEmail,
          category: formData.category,
          description: formData.description,
          analystId: session.id,
        }),
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Ajuda registrada com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ user: '', category: '', description: '' });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar a ajuda',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar a ajuda',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSubmitting(false);
    }
  };  

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Registrar Ajuda</title>
      </Head>

      <div className={styles.container}>
        <nav className={commonStyles.navbar}>
          <div className={commonStyles.logo}>
            <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className={commonStyles.menuToggle}>
            ☰
          </button>
        </nav>

        {menuOpen && (
          <div className={commonStyles.menu}>
            <button onClick={() => router.push('/my')} className={commonStyles.menuButton}>
              Página Inicial
            </button>
            {session.role === 'user' && (
              <button onClick={() => router.push('/registrar')} className={commonStyles.menuButton}>
                Registrar Dúvida
              </button>
            )}
            {session.role === 'analyst' && (
              <>
                <button onClick={() => router.push('/registro')} className={commonStyles.menuButton}>
                  Registrar Ajuda
                </button>
                <button onClick={() => router.push('/dashboard-analyst')} className={commonStyles.menuButton}>
                  Dashboard Analista
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={commonStyles.menuButton}
                >
                  Database
                </a>
              </>
            )}
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}

        <div className={styles.mainContent}>
          <div className={styles.formContainerWithSpacing}>
            <h2 className={styles.formTitle}>Registrar Ajuda</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="user">Selecione o usuário</label>
                <select id="user" name="user" value={formData.user} onChange={handleChange} required>
                  <option value="">Selecione um usuário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="category">Categoria da ajuda</label>
                <select id="category" name="category" value={formData.category} onChange={handleChange} required>
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição da ajuda</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="4"
                  className={styles.formTextarea} // Adicionando a classe para estilização
                />
              </div>
              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar Ajuda'}
              </button>
            </form>
          </div>
        </div>

        <Footer /> {/* Adicionando o rodapé no final da página */}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'analyst') {
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
