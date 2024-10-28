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
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user: null,
    category: null,
    description: '',
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUsersAndCategories = async () => {
      try {
        setLoading(true);

        // Obter lista de usuários de suporte
        const usersRes = await fetch('/api/data/get-support-users-data');
        const usersData = await usersRes.json();
        setUsers(usersData.users);

        // Obter lista de categorias
        const categoriesRes = await fetch('/api/data/get-analyst-categories-data');
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
      const selectedUser = formData.user;
      const userName = selectedUser ? selectedUser.label : '';
      const userEmail = selectedUser ? selectedUser.email : '';

      const response = await fetch('/api/data/register-user-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userEmail,
          category: formData.category ? formData.category.value : '',
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
        setFormData({ user: null, category: null, description: '' });
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

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#222',
      borderColor: '#444',
      color: '#fff',
      borderRadius: '5px',
      padding: '5px',
      '&:hover': {
        borderColor: '#F0A028',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: '#fff',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1e1e1e',
    }),
    singleValue: (provided) => ({
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
        <title>Registrar Ajuda</title>
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
            <button onClick={() => router.push('/profile-analyst')} className={commonStyles.menuButton}>
              Meu Perfil
            </button>
            <button onClick={() => router.push('/registrar')} className={commonStyles.menuButton}>
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
                <Select
                  id="user"
                  name="user"
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                    email: user.email,
                  }))}
                  value={formData.user}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um usuário"
                  styles={customSelectStyles}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="category">Tema da ajuda</label>
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
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição da ajuda</label>
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
