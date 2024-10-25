// pages/registrar.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import Redis from 'ioredis';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import Footer from '../components/Footer';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default function RegistrarPage({ session }) {
  const router = useRouter();
  const [analysts, setAnalysts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    analyst: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    const loadAnalystsAndCategories = async () => {
      try {
        setLoading(true);

        // Verificar se já temos os analistas no cache
        let analystsData = await redis.get('analystsList');
        if (analystsData) {
          console.log('Cache hit for analysts list');
          analystsData = JSON.parse(analystsData);
        } else {
          console.log('Cache miss for analysts list, fetching from API');
          const analystsRes = await fetch('/api/get-users');
          analystsData = await analystsRes.json();
          // Armazenar os analistas no cache por 10 minutos
          await redis.set('analystsList', JSON.stringify(analystsData), 'EX', 600);
        }
        setAnalysts(analystsData.users.filter(user => user.role === 'analyst'));

        // Verificar se já temos as categorias no cache
        let categoriesData = await redis.get('analystsCategories');
        if (categoriesData) {
          console.log('Cache hit for categories list');
          categoriesData = JSON.parse(categoriesData);
        } else {
          console.log('Cache miss for categories list, fetching from API');
          const categoriesRes = await fetch('/api/get-analysts-categories');
          categoriesData = await categoriesRes.json();
          // Armazenar as categorias no cache por 10 minutos
          await redis.set('analystsCategories', JSON.stringify(categoriesData), 'EX', 600);
        }
        setCategories(categoriesData.categories);

      } catch (err) {
        console.error('Erro ao carregar analistas e categorias:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalystsAndCategories();
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
      const response = await fetch('/api/register-doubt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyst: formData.analyst,
          category: formData.category,
          description: formData.description,
          userName: session.user.name,
          userEmail: session.user.email,
        }),
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Dúvida registrada com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ analyst: '', category: '', description: '' });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar a dúvida',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar a dúvida',
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
        <title>Registrar Dúvida</title>
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
            <h2 className={styles.formTitle}>Registrar Dúvida</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="analyst">Selecione o analista</label>
                <select id="analyst" name="analyst" value={formData.analyst} onChange={handleChange} required>
                  <option value="">Selecione um analista</option>
                  {analysts.map((analyst) => (
                    <option key={analyst.id} value={analyst.id}>
                      {analyst.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="category">Categoria da dúvida</label>
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
                <label htmlFor="description">Descrição da dúvida</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="4"
                  className={styles.formTextarea}
                />
              </div>
              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Enviando...' : 'Enviar Dúvida'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
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