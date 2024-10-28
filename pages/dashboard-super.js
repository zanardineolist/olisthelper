// pages/dashboard-super.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/DashboardSuper.module.css';
import Footer from '../components/Footer';

export default function DashboardSuperPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [categoryRanking, setCategoryRanking] = useState([]);

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

  useEffect(() => {
    if (selectedUser) {
      const loadUserData = async () => {
        try {
          setLoading(true);
          const [performanceRes, helpRes, categoryRes] = await Promise.all([
            fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`),
            fetch(`/api/get-user-help-requests?userEmail=${selectedUser.email}`),
            fetch(`/api/get-user-category-ranking?userEmail=${selectedUser.email}`),
          ]);

          const performanceData = await performanceRes.json();
          const helpData = await helpRes.json();
          const categoryData = await categoryRes.json();

          setUserData({ ...performanceData, helpRequests: helpData });
          setCategoryRanking(categoryData.categories || []);
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }
  }, [selectedUser]);

  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption);
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
        <title>Dashboard Supervisor</title>
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
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}

        <div className={styles.mainContent}>
          <h2 className={styles.title}>Dashboard Supervisor</h2>
          <Select
            options={users.map((user) => ({ value: user, label: user.name }))}
            value={selectedUser}
            onChange={handleUserSelect}
            isClearable
            placeholder="Selecione um colaborador"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            noOptionsMessage={() => "Sem resultados"}
          />

          {selectedUser && userData && (
            <div className={styles.userInfoContainer}>
              {/* Container para Desempenho */}
              <div className={styles.performanceContainer}>
                <h3>Indicadores de Desempenho - {selectedUser.label}</h3>
                <div className={styles.performanceDetails}>
                  <p><strong>Squad:</strong> {userData.squad || '-'}</p>
                  <p><strong>Chamados:</strong> {userData.chamado ? 'Sim' : 'Não'}</p>
                  <p><strong>Telefone:</strong> {userData.telefone ? 'Sim' : 'Não'}</p>
                  <p><strong>Chat:</strong> {userData.chat ? 'Sim' : 'Não'}</p>
                  <p><strong>Ajudas Solicitadas - Mês Atual:</strong> {userData.helpRequests.currentMonth}</p>
                  <p><strong>Ajudas Solicitadas - Mês Anterior:</strong> {userData.helpRequests.lastMonth}</p>
                </div>
              </div>

              {/* Container para Ranking de Categorias */}
              <div className={styles.categoryRankingContainer}>
                <h3>Top 5 e 10 - Temas de Maior Dúvida</h3>
                {categoryRanking.length > 0 ? (
                  <ul className={styles.list}>
                    {categoryRanking.slice(0, 10).map((category, index) => (
                      <li key={index} className={styles.listItem}>
                        <span className={styles.rank}>{index + 1}.</span>
                        <span className={styles.categoryName}>{category.name}</span>
                        <span className={styles.count}>{category.count} pedidos de ajuda</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.noData}>
                    Nenhum dado disponível no momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'super') {
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
