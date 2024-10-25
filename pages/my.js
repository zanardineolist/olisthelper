// pages/my.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Redis from 'ioredis';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default function MyPage({ session }) {
  const router = useRouter();
  const [helpRequests, setHelpRequests] = useState(null);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadMyData = async () => {
      try {
        setLoading(true);

        // Verificar no cache se já temos os dados de solicitações de ajuda
        let cachedHelpRequests = await redis.get(`helpRequests:${session.user.email}`);
        if (cachedHelpRequests) {
          console.log('Cache hit for help requests');
          setHelpRequests(JSON.parse(cachedHelpRequests));
        } else {
          console.log('Cache miss for help requests, fetching from API');
          const helpRequestsRes = await fetch(`/api/get-user-help-requests?userEmail=${session.user.email}`);
          cachedHelpRequests = await helpRequestsRes.json();
          // Armazenar os dados de solicitações de ajuda no cache por 10 minutos
          await redis.set(`helpRequests:${session.user.email}`, JSON.stringify(cachedHelpRequests), 'EX', 600);
          setHelpRequests(cachedHelpRequests);
        }

        // Verificar no cache se já temos o ranking de categorias
        let cachedCategoryRanking = await redis.get(`categoryRanking:${session.id}`);
        if (cachedCategoryRanking) {
          console.log('Cache hit for category ranking');
          setCategoryRanking(JSON.parse(cachedCategoryRanking).categories);
        } else {
          console.log('Cache miss for category ranking, fetching from API');
          const categoryRankingRes = await fetch(`/api/get-user-category-ranking?userEmail=${session.user.email}`);
          cachedCategoryRanking = await categoryRankingRes.json();
          // Armazenar o ranking de categorias no cache por 10 minutos
          await redis.set(`categoryRanking:${session.id}`, JSON.stringify(cachedCategoryRanking), 'EX', 600);
          setCategoryRanking(cachedCategoryRanking.categories);
        }

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMyData();
  }, [session.id, session.user.email]);

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
        <title>Minha Página</title>
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
            <button onClick={() => router.push('/my')} className={commonStyles.menuButton}>
              Página Inicial
            </button>
            {session.role === 'user' && (
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
          <h2 className={styles.pageTitle}>Bem-vindo, {session.user.name}</h2>

          <div className={styles.section}>
            <h3>Suas Solicitações de Ajuda</h3>
            {helpRequests ? (
              <div className={styles.helpRequests}>
                <p>Ajuda Solicitada este mês: {helpRequests.currentMonth}</p>
                <p>Ajuda Solicitada no mês passado: {helpRequests.lastMonth}</p>
              </div>
            ) : (
              <p>Nenhuma solicitação de ajuda encontrada.</p>
            )}
          </div>

          <div className={styles.section}>
            <h3>Ranking de Categorias</h3>
            <ul>
              {categoryRanking.length > 0 ? (
                categoryRanking.map((category, index) => (
                  <li key={index}>
                    Categoria: {category.name}, Chamados: {category.count}
                  </li>
                ))
              ) : (
                <p>Nenhum dado de ranking de categorias encontrado.</p>
              )}
            </ul>
          </div>
        </div>

        <Footer />
      </div>
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
    props: { session },
  };
}
