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

  // Comparar ajudas solicitadas no mês atual e anterior
  const arrow = helpRequests.currentMonth < helpRequests.lastMonth ? '⬇️' : '⬆️';
  const color = helpRequests.currentMonth < helpRequests.lastMonth ? 'green' : 'red';

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
        <h1>Olá, {greeting} {firstName}!</h1>

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
            <p>
              Mês Atual: {helpRequests.currentMonth}
            </p>
            <p>
              Mês Anterior: {helpRequests.lastMonth}
            </p>
            <p style={{ color }}>
              Comparativo: {arrow} {helpRequests.currentMonth - helpRequests.lastMonth} solicitações
            </p>
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
