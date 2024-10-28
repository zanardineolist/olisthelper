// pages/dashboard-super.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';

export default function DashboardSuperPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentHour = new Date(brtDate).getHours();
    let greetingMessage = '';

    if (currentHour >= 5 && currentHour < 12) {
      greetingMessage = 'Bom dia';
    } else if (currentHour >= 12 && currentHour < 18) {
      greetingMessage = 'Boa tarde';
    } else {
      greetingMessage = 'Boa noite';
    }

    setGreeting(greetingMessage);
  }, []);

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
      const fetchData = async () => {
        try {
          setLoading(true);
          const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
            fetch(`/api/get-user-help-requests?userEmail=${selectedUser.email}`),
            fetch(`/api/get-user-category-ranking?userEmail=${selectedUser.email}`),
            fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
          ]);

          const helpData = await helpResponse.json();
          setHelpRequests({
            currentMonth: helpData.currentMonth,
            lastMonth: helpData.lastMonth,
          });

          const categoryData = await categoryResponse.json();
          setCategoryRanking(categoryData.categories || []);

          const performanceData = await performanceResponse.json();
          setPerformanceData(performanceData);
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [selectedUser]);

  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption.value);
  };

  // Estilos personalizados para o React-Select, ajustando para centralizar e diminuir a largura
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '300px',
      margin: '0 auto',
    }),
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
      backgroundColor: state.isFocused ? '#333' : state.isSelected ? '#F0A028' : '#1e1e1e',
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
          <button onClick={() => setMenuOpen(!menuOpen)} className={commonStyles.menuToggle}>
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
      </div>

      <main className={styles.main}>
        <h1 className={styles.greeting}>{greeting}, {session.user.name.split(' ')[0]}!</h1>

        {/* Container com informações do perfil do supervisor */}
        <div className={styles.profileContainer}>
          <img src={session.user.image} alt={session.user.name} className={styles.profileImage} />
          <div className={styles.profileInfo}>
            <h2>{session.user.name}</h2>
            <p>{session.user.email}</p>
          </div>
        </div>

        {/* Campo de Seleção do Colaborador */}
        <div className={styles.selectUserContainer}>
          <Select
            options={users.map((user) => ({ value: user, label: user.name }))}
            onChange={handleUserSelect}
            isClearable
            placeholder="Selecione um colaborador"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            noOptionsMessage={() => "Sem resultados"}
          />
        </div>

        {selectedUser && (
          <>
            {/* Container principal com indicadores do usuário selecionado */}
            <div className={styles.performanceWrapper}>
              <div className={styles.profileInfoWrapper}>
                <div className={styles.profileContainer}>
                  <div className={styles.profileInfo}>
                    <h2>{selectedUser.name}</h2>
                    <p>{selectedUser.email}</p>
                  </div>
                </div>
                <div className={styles.indicatorsContainer}>
                  {/* Ajudas Solicitadas */}
                  <div className={styles.indicatorBox}>
                    <h3>Ajudas Solicitadas</h3>
                    <p>Mês Atual: {helpRequests.currentMonth}</p>
                    <p>Mês Anterior: {helpRequests.lastMonth}</p>
                  </div>
                  {/* Indicadores Chamados */}
                  {performanceData?.chamados && (
                    <div className={styles.indicatorBox} style={{ backgroundColor: performanceData.chamados.colors.mediaPorDia || 'transparent' }}>
                      <h3>Chamados</h3>
                      <p>Total Chamados: {performanceData.chamados.totalChamados}</p>
                      <p>Média/Dia: {performanceData.chamados.mediaPorDia}</p>
                      <p style={{ backgroundColor: performanceData.chamados.colors.tma || 'transparent' }}>TMA: {performanceData.chamados.tma}</p>
                      <p style={{ backgroundColor: performanceData.chamados.colors.csat || 'transparent' }}>CSAT: {performanceData.chamados.csat}</p>
                    </div>
                  )}
                  {/* Indicadores Telefone */}
                  {performanceData?.telefone && (
                    <div className={styles.indicatorBox} style={{ backgroundColor: performanceData.telefone.colors.tma || 'transparent' }}>
                      <h3>Telefone</h3>
                      <p>Total Telefonemas: {performanceData.telefone.totalTelefone}</p>
                      <p>Média/Dia: {performanceData.telefone.mediaPorDia}</p>
                      <p style={{ backgroundColor: performanceData.telefone.colors.tma || 'transparent' }}>TMA: {performanceData.telefone.tma}</p>
                      <p style={{ backgroundColor: performanceData.telefone.colors.csat || 'transparent' }}>CSAT: {performanceData.telefone.csat}</p>
                      <p>Perdidas: {performanceData.telefone.perdidas}</p>
                    </div>
                  )}
                  {/* Indicadores Chat */}
                  {performanceData?.chat && (
                    <div className={styles.indicatorBox} style={{ backgroundColor: performanceData.chat.colors.tma || 'transparent' }}>
                      <h3>Chat</h3>
                      <p>Total Chats: {performanceData.chat.totalChats}</p>
                      <p>Média/Dia: {performanceData.chat.mediaPorDia}</p>
                      <p style={{ backgroundColor: performanceData.chat.colors.tma || 'transparent' }}>TMA: {performanceData.chat.tma}</p>
                      <p style={{ backgroundColor: performanceData.chat.colors.csat || 'transparent' }}>CSAT: {performanceData.chat.csat}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Exibir ranking de categorias */}
              <div className={styles.categoryRanking}>
                <h3>Top 10 - Temas de maior dúvida</h3>
                {loading ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : categoryRanking.length > 0 ? (
                  <ul className={styles.list}>
                    {categoryRanking.map((category, index) => (
                      <li key={index} className={styles.listItem}>
                        <span className={styles.rank}>{index + 1}.</span>
                        <span className={styles.categoryName}>{category.name}</span>
                        <div className={styles.progressBarCategory} style={{ width: `${category.count * 10}px` }} />
                        <span className={styles.count}>{category.count} pedidos de ajuda</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.noData}>Nenhum dado disponível no momento.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
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
