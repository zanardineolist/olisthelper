import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const fetchData = async () => {
      try {
        const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-user-help-requests?userEmail=${user.email}`),
          fetch(`/api/get-user-category-ranking?userEmail=${user.email}`),
          user.role === 'user' ? fetch(`/api/get-user-performance?userEmail=${user.email}`) : Promise.resolve({ json: () => null })
        ]);

        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);

        if (user.role === 'user') {
          const performanceData = await performanceResponse.json();
          setPerformanceData(performanceData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.email, user.role]);

  const handleNavigation = (path) => {
    router.push(path);
  };

  if (!user) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0];
  const { currentMonth, lastMonth } = helpRequests;
  let percentageChange = 0;

  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
  }
  const arrowClass = percentageChange < 0 ? 'fa-circle-down' : 'fa-circle-up';
  const arrowColor = percentageChange < 0 ? 'green' : 'red';
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);

  return (
    <>
      <Head>
        <title>Meus Dados</title>
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
            <button onClick={() => handleNavigation('/my')} className={commonStyles.menuButton}>
              Página Inicial
            </button>
            {user.role === 'user' && (
              <button onClick={() => handleNavigation('/registrar')} className={commonStyles.menuButton}>
                Registrar Dúvida
              </button>
            )}
            {user.role === 'analyst' && (
              <>
                <button onClick={() => handleNavigation('/registro')} className={commonStyles.menuButton}>
                  Registrar Ajuda
                </button>
                <button onClick={() => handleNavigation('/dashboard-analyst')} className={commonStyles.menuButton}>
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

      <main className={styles.main}>
        <h1 className={styles.greeting}>Olá, {greeting} {firstName}!</h1>

        <div className={styles.profileContainerWrapper}>
          {/* Caixa de Perfil */}
          <div className={styles.profileContainer}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          {/* Caixa de Ajudas Solicitadas */}
          <div className={styles.profileContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className="standardBoxLoader"></div>
              </div>
            ) : (
              <div className={styles.profileInfo}>
                <h2>Ajudas Solicitadas</h2>
                <div className={styles.helpRequestsInfo}>
                  <div className={styles.monthsInfo}>
                    <p><strong>Mês Atual:</strong> {currentMonth}</p>
                    <p><strong>Mês Anterior:</strong> {lastMonth}</p>
                  </div>
                  <div className={styles.percentageChange} style={{ color: arrowColor }}>
                    <i className={`fa-regular ${arrowClass}`} style={{ color: arrowColor }}></i>
                    <span>{formattedPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caixa de Desempenho */}
          {user.role === 'user' && (
            <div className={styles.performanceContainer}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <>
                  <h2>Desempenho</h2>
                  <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte}</p>
                  <div className={styles.performanceInfo}>
                    <div className={styles.performanceItem}>
                      <span>Chamados:</span>
                      <span>{performanceData?.totalChamados}</span>
                    </div>
                    <div className={styles.performanceItem}>
                      <span>Média/Dia:</span>
                      <span>{performanceData?.mediaPorDia}</span>
                    </div>
                    <div className={styles.performanceItem}>
                      <span>TMA:</span>
                      <span>{performanceData?.tma}</span>
                    </div>
                    <div className={styles.performanceItem}>
                      <span>CSAT:</span>
                      <span>{performanceData?.csat}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Seção de Ranking de Categorias */}
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
                  <div
                    className={styles.progressBarCategory}
                    style={{
                      width: `${category.count * 10}px`,
                      backgroundColor: category.count > 10 ? 'orange' : '',
                    }}
                  />
                  <span className={styles.count}>
                    {category.count} pedidos de ajuda
                    {category.count > 10 && (
                      <div className="tooltip">
                        <i
                          className="fa-solid fa-circle-exclamation"
                          style={{ color: 'orange', cursor: 'pointer' }}
                          onClick={() => window.open('https://forms.clickup.com/30949570/f/xgg62-18893/6O57E8S7WVNULVS5HO', '_blank')}
                        ></i>
                        <span className="tooltipText">
                          Você já pediu ajuda para este tema mais de 10 vezes. Que tal agendar um Tiny Class com nossos analistas? Clique no ícone abaixo.
                        </span>
                      </div>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.noData}>
              Nenhum dado disponível no momento.
            </div>
          )}
        </div>
      </main>
      <Footer />
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
    props: {
      user: {
        ...session.user,
        role: session.role,
      },
    },
  };
}
