// pages/my.js
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

  useEffect(() => {
    // Obter a hora atual no fuso horário de Brasília (UTC-3)
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
    // Buscar os dados de ajuda solicitada do usuário para o mês atual e o anterior
    const fetchHelpRequests = async () => {
      try {
        const response = await fetch(`/api/get-user-help-requests?userEmail=${user.email}`);
        const data = await response.json();
        setHelpRequests({
          currentMonth: data.currentMonth,
          lastMonth: data.lastMonth,
        });
      } catch (error) {
        console.error('Erro ao buscar dados de ajudas solicitadas:', error);
      }
    };

    fetchHelpRequests();
  }, [user.email]);

  useEffect(() => {
    // Buscar as categorias mais solicitadas pelo usuário no mês atual
    const fetchCategoryRanking = async () => {
      try {
        const response = await fetch(`/api/get-user-category-ranking?userEmail=${user.email}`);
        const data = await response.json();
        setCategoryRanking(data.categories || []);
      } catch (error) {
        console.error('Erro ao buscar ranking das categorias:', error);
      }
    };

    fetchCategoryRanking();
  }, [user.email]);

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

  // Extrair o primeiro nome do usuário
  const firstName = user.name.split(' ')[0];

  // Calcular a porcentagem de aumento/queda
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
          <div className={styles.profileContainer}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          {/* Nova Caixa: Ajudas Solicitadas */}
          <div className={styles.profileContainer}>
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
          </div>
        </div>

        {/* Nova Seção: Top 10 Categorias */}
        <div className={styles.categoryRanking}>
          <h3>Top 10 - Temas de maior dúvida</h3>
          {categoryRanking.length > 0 ? (
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
                          Você já solicitou mais de 10 ajudas para este tema, recomendamos agendar um Tiny Class com nossos analistas.
                        </span>
                      </div>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.noData}>Nenhuma ajuda solicitada este mês.</div>
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
