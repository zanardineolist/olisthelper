// pages/dashboard-super.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Select from 'react-select';
import commonStyles from '../styles/commonStyles.module.css'; // Importando commonStyles para padronizar o menu
import styles from '../styles/DashboardSuper.module.css';
import Footer from '../components/Footer';

export default function DashboardSuperPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

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
          setLoadingData(true);
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
          setLoadingData(false);
        }
      };

      fetchData();
    }
  }, [selectedUser]);

  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption ? selectedOption.value : null);
  };

  const handleNavigation = (path) => {
    router.push(path);
    setMenuOpen(false);
  };

  // Estilos personalizados para o React-Select, ajustando para centralizar e diminuir a largura
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '500px',
      margin: '20px auto 20px auto',
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
      maxHeight: '250px',
      overflowY: 'auto',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '250px',
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

      {/* Navbar ajustada para utilizar commonStyles */}
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
            <button onClick={() => handleNavigation('/dashboard-super')} className={commonStyles.menuButton}>
              Dashboard Super
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
      </div>

      <main className={styles.mainContent}>
        <h1 className={styles.title}>Olá {greeting}, {session.user.name.split(' ')[0]}!</h1>

        {/* Container com informações do perfil do supervisor */}
        <div className={styles.userInfoContainer}>
          <div className={styles.profileContainer}>
            <img src={session.user.image} alt={session.user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{session.user.name}</h2>
              <p>{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Campo de Seleção do Colaborador */}
        <div className={styles.profileAndHelpContainer}>
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
            {/* Container para Indicadores de Desempenho e Ajudas Solicitadas */}
            <div className={styles.profileAndHelpContainer}>
              {/* Perfil do Usuário Selecionado */}
              <div className={styles.profileContainer}>
                <div className={styles.profileInfo}>
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.email}</p>
                  <div className={styles.tagsContainer}>
                    {performanceData?.chamado && (
                      <div className={styles.tag} style={{ backgroundColor: '#F0A028' }}>
                        #Chamado
                      </div>
                    )}
                    {performanceData?.telefone && (
                      <div className={styles.tag} style={{ backgroundColor: '#E64E36' }}>
                        #Telefone
                      </div>
                    )}
                    {performanceData?.chat && (
                      <div className={styles.tag} style={{ backgroundColor: '#779E3D' }}>
                        #Chat
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ajudas Solicitadas */}
              <div className={styles.profileContainer}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <div className={styles.profileInfo}>
                    <h2>Ajudas Solicitadas</h2>
                    <div className={styles.helpRequestsInfo}>
                      <div className={styles.monthsInfo}>
                        <p><strong>Mês Atual:</strong> {helpRequests.currentMonth}</p>
                        <p><strong>Mês Anterior:</strong> {helpRequests.lastMonth}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Container para Indicadores de Desempenho */}
            <div className={styles.performanceWrapper}>
              {loadingData ? (
                <>
                  <div className={styles.performanceContainer}>
                    <div className={styles.loadingContainer}>
                      <div className="standardBoxLoader"></div>
                    </div>
                  </div>
                  <div className={styles.performanceContainer}>
                    <div className={styles.loadingContainer}>
                      <div className="standardBoxLoader"></div>
                    </div>
                  </div>
                  <div className={styles.performanceContainer}>
                    <div className={styles.loadingContainer}>
                      <div className="standardBoxLoader"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {performanceData?.chamados && (
                    <div className={styles.performanceContainer}>
                      <h2>Indicadores Chamados</h2>
                      <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                      <div className={styles.performanceInfo}>
                        <div className={styles.performanceItem}>
                          <span>Total Chamados:</span>
                          <span>{performanceData.chamados.totalChamados}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.mediaPorDia || 'transparent' }}>
                          <span>Média/Dia:</span>
                          <span>{performanceData.chamados.mediaPorDia}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.tma || 'transparent' }}>
                          <span>TMA:</span>
                          <span>{performanceData.chamados.tma}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.csat || 'transparent' }}>
                          <span>CSAT:</span>
                          <span>{performanceData.chamados.csat}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {performanceData?.telefone && (
                    <div className={styles.performanceContainer}>
                      <h2>Indicadores Telefone</h2>
                      <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                      <div className={styles.performanceInfo}>
                        <div className={styles.performanceItem}>
                          <span>Total Ligações:</span>
                          <span>{performanceData.telefone.totalTelefone}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.mediaPorDia || 'transparent' }}>
                          <span>Média/Dia:</span>
                          <span>{performanceData.telefone.mediaPorDia}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.tma || 'transparent' }}>
                          <span>TMA:</span>
                          <span>{performanceData.telefone.tma}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.csat || 'transparent' }}>
                          <span>CSAT:</span>
                          <span>{performanceData.telefone.csat}</span>
                        </div>
                        <div className={styles.performanceItem}>
                          <span>Perdidas:</span>
                          <span>{performanceData.telefone.perdidas}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {performanceData?.chat && (
                    <div className={styles.performanceContainer}>
                      <h2>Indicadores Chat</h2>
                      <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                      <div className={styles.performanceInfo}>
                        <div className={styles.performanceItem}>
                          <span>Total Chats:</span>
                          <span>{performanceData.chat.totalChats}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.mediaPorDia || 'transparent' }}>
                          <span>Média/Dia:</span>
                          <span>{performanceData.chat.mediaPorDia}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.tma || 'transparent' }}>
                          <span>TMA:</span>
                          <span>{performanceData.chat.tma}</span>
                        </div>
                        <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.csat || 'transparent' }}>
                          <span>CSAT:</span>
                          <span>{performanceData.chat.csat}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Container para Ranking de Categorias */}
            <div className={styles.categoryRankingContainer}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  <h3>Top 10 - Temas de maior dúvida</h3>
                  {categoryRanking.length > 0 ? (
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
                    <div className={styles.noData}>Nenhum registro de tema localizado.</div>
                  )}
                </>
              )}
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