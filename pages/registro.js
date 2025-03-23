// pages/registro.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import Swal from 'sweetalert2';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function RegistroPage({ user }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ today: 0 });
  const [recentHelps, setRecentHelps] = useState([]);
  const [formData, setFormData] = useState({
    user: null,
    category: null,
    description: '',
  });

  // Carregar usuários e categorias
  useEffect(() => {
    const loadUsersAndCategories = async () => {
      try {
        setLoading(true);
        const usersRes = await fetch('/api/get-users');
        const usersData = await usersRes.json();
        setUsers(usersData.users);

        const categoriesRes = await fetch('/api/get-analysts-categories');
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories);

        // Buscar dados de ajudas prestadas
        await fetchHelpRequests();
        
        // Buscar registros recentes
        await fetchRecentHelps();
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsersAndCategories();
  }, [user.id]);

  // Função para buscar ajudas prestadas
  const fetchHelpRequests = async () => {
    try {
      // Usando filter=1 para obter dados do dia atual
      const helpResponse = await fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile&filter=1`);
      if (helpResponse.ok) {
        const helpData = await helpResponse.json();
        setHelpRequests({
          today: helpData.today || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar ajudas prestadas:', err);
    }
  };
  
  // Função para buscar os registros recentes
  const fetchRecentHelps = async () => {
    try {
      const recentResponse = await fetch(`/api/get-recent-helps?analystId=${user.id}`);
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentHelps(recentData.recentHelps || []);
      }
    } catch (err) {
      console.error('Erro ao buscar registros recentes:', err);
    }
  };

  // Gerenciar alterações no formulário
  const handleChange = (selectedOption, actionMeta) => {
    const { name } = actionMeta;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submeter o formulário de registro de ajuda
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedUser = formData.user;
      const userName = selectedUser ? selectedUser.label : '';
      const userEmail = selectedUser ? selectedUser.email : '';

      const response = await fetch('/api/register-analyst-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userEmail,
          category: formData.category ? formData.category.value : '',
          description: formData.description,
          analystId: user.id,
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
        
        // Atualizar o contador de ajudas e registros recentes após o registro bem-sucedido
        await fetchHelpRequests();
        await fetchRecentHelps();
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

  // Estilos personalizados para o React-Select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--labels-bg)',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
    color: 'var(--text-color)',
    borderRadius: '5px',
    padding: '5px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--color-primary)',
    },
    outline: 'none',
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
    caretColor: 'var(--text-color)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--labels-bg)',
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
      background: 'var(--scroll-bg)',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--scroll)',
      borderRadius: '10px',
      border: '2px solid var(--scroll-bg)',
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? 'var(--color-trodd)'
      : state.isSelected
      ? 'var(--color-primary)'
      : 'var(--box-color)',
    color: 'var(--text-color)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'var(--color-trodd)',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-color2)',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: 'var(--color-border)',
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

      <Navbar user={user} />

      <main className={styles.mainContent}>
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
                classNamePrefix="react-select"
                noOptionsMessage={() => "Sem resultados"}
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
                classNamePrefix="react-select"
                noOptionsMessage={() => "Sem resultados"}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Descrição da ajuda</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descreva brevemente sua dúvida."
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
        
        {/* Seção de estatísticas e registros recentes */}
        <div className={styles.statsContainer}>
          {/* Contador de ajudas prestadas no dia */}
          <div className={styles.helpCounter}>
            <div className={styles.counterHeader}>
              <h3>Ajudas prestadas hoje</h3>
              <span className={styles.refreshButton} onClick={() => fetchHelpRequests()}>
                <i className="fa-solid fa-arrows-rotate"></i>
              </span>
            </div>
            <div className={styles.counterValue}>{helpRequests.today || 0}</div>
          </div>
          
          {/* Lista de registros recentes */}
          <div className={styles.recentHelpsContainer}>
            <div className={styles.recentHelpsHeader}>
              <h3>Últimos registros</h3>
              <span className={styles.refreshButton} onClick={() => fetchRecentHelps()}>
                <i className="fa-solid fa-arrows-rotate"></i>
              </span>
            </div>
            
            <div className={styles.recentHelpsList}>
              {recentHelps.length > 0 ? (
                recentHelps.map((help) => (
                  <div key={help.id} className={styles.recentHelpCard}>
                    <div className={styles.recentHelpHeader}>
                      <div className={styles.recentHelpCategory}>
                        <i className="fa-solid fa-tag"></i> {help.category}
                      </div>
                      <div className={styles.recentHelpTime}>
                        <i className="fa-regular fa-clock"></i> {help.formattedDate} • {help.formattedTime}
                      </div>
                    </div>
                    <div className={styles.recentHelpUser}>
                      <i className="fa-regular fa-user"></i> {help.requesterName}
                    </div>
                    <div className={styles.recentHelpDescription}>
                      <div className={styles.descriptionLabel}>Descrição:</div>
                      <div className={styles.descriptionText}>{help.description}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noRecentHelps}>
                  <i className="fa-solid fa-clipboard-list"></i>
                  <p>Nenhum registro recente encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
      },
    },
  };
}
