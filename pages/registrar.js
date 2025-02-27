// pages/registrar.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import Swal from 'sweetalert2';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import Footer from '../components/Footer';

export default function RegistrarPage({ session }) {
  const router = useRouter();
  const [analysts, setAnalysts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    analyst: null,
    category: null,
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

  const handleChange = (selectedOption, actionMeta) => {
    const { name } = actionMeta;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption,
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
          analyst: formData.analyst ? formData.analyst.value : '',
          category: formData.category ? formData.category.value : '',
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
        setFormData({ analyst: null, category: null, description: '' });
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
      backgroundColor: state.isFocused
        ? '#333'
        : state.isSelected
        ? '#F0A028'
        : '#1e1e1e',
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
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#fff',
    }),
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
          <button
            onClick={() => setMenuOpen((prevMenuOpen) => !prevMenuOpen)}
            className={commonStyles.menuToggle}
          >
            ☰
          </button>
        </nav>

        {menuOpen && (
          <div className={commonStyles.menu}>
            <button onClick={() => router.push('/profile')} className={commonStyles.menuButton}>
              Meu Perfil
            </button>
            {session.role === 'support' && (
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
                <Select
                  id="analyst"
                  name="analyst"
                  options={analysts.map((analyst) => ({
                    value: analyst.id,
                    label: analyst.name,
                  }))}
                  value={formData.analyst}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione o analista"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="category">Tema da dúvida</label>
                <Select
                  id="category"
                  name="category"
                  options={categories.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  value={formData.category}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um tema"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição da dúvida</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descreva brevemente sua dúvida..."
                  required
                  rows="4"
                  className={`${styles.formTextarea} ${styles.formFieldHover}`}
                />
              </div>

              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar'}
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
  if (!session || session.role !== 'support') {
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
