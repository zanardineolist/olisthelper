import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';

export default function MyPage({ user }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });

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
  const color = percentageChange < 0 ? 'green' : 'red';
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
                <div>
                  <p>Mês Atual: <strong>{currentMonth}</strong></p>
                  <p>Mês Anterior: <strong>{lastMonth}</strong></p>
                </div>
                <div className={styles.percentageChange} style={{ color }}>
                  {percentageChange < 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={styles.arrowIcon} viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M8 12a.5.5 0 0 1-.5-.5V4.707L3.854 9.854a.5.5 0 0 1-.708-.708l5-5a.5.5 0 0 1 .708 0l5 5a.5.5 0 0 1-.708.708L8.5 4.707V11.5a.5.5 0 0 1-.5.5z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={styles.arrowIcon} viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v6.793l4.646-4.647a.5.5 0 1 1 .708.708l-5 5a.5.5 0 0 1-.708 0l-5-5a.5.5 0 1 1 .708-.708L7.5 11.293V4.5A.5.5 0 0 1 8 4z"/>
                    </svg>
                  )}
                  {formattedPercentage}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
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
