import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';

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
        const res = await fetch('/api/get-analysts-categories');
        const data = await res.json();
        setAnalysts(data.analysts);
        setCategories(data.categories);
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
          ...formData,
          userName: session.user.name,
          userEmail: session.user.email,
        }),
      });
      if (response.ok) {
        alert('Dúvida registrada com sucesso!');
        setFormData({ analyst: '', category: '', description: '' });
      } else {
        alert('Erro ao registrar a dúvida, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      alert('Erro ao registrar a dúvida, tente novamente.');
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
            <button onClick={() => router.push('/registrar')} className={commonStyles.menuButton}>
              Registrar Dúvida
            </button>
            {session.role === 'analyst' && (
              <button onClick={() => router.push('/dashboard-analyst')} className={commonStyles.menuButton}>
                Dashboard do Analista
              </button>
            )}
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}
      </div>
  
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
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar Dúvida'}
          </button>
        </form>
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