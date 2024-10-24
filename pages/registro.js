// pages/registro.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';

export default function RegistroPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user: '',
    category: '',
    description: '',
  });

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
      const response = await fetch('/api/register-analyst-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          analystId: session.id,
          analystName: session.user.name,
        }),
      });
      if (response.ok) {
        alert('Nota registrada com sucesso!');
        setFormData({ user: '', category: '', description: '' });
      } else {
        alert('Erro ao registrar a nota, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      alert('Erro ao registrar a nota, tente novamente.');
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
        <title>Registrar Nota</title>
      </Head>

      <div className={commonStyles.container}>
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
      </div>

      <div className={styles.formContainerWithSpacing}>
        <h2 className={styles.formTitle}>Registrar Nota</h2>
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
            <label htmlFor="category">Categoria da nota</label>
            <select id="category" name="category" value={formData.category} onChange={handleChange} required>
              <option value="">Selecione uma categoria</option>
              <option value="Feedback">Feedback</option>
              <option value="Reclamação">Reclamação</option>
              <option value="Melhoria">Melhoria</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="description">Descrição da nota</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar Nota'}
          </button>
        </form>
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
