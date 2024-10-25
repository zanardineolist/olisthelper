// pages/dashboard-analyst.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Redis from 'ioredis';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/DashboardAnalyst.module.css';
import Footer from '../components/Footer';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default function DashboardAnalystPage({ session }) {
  const router = useRouter();
  const [performanceData, setPerformanceData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [categoryRankingData, setCategoryRankingData] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Verificar no cache se já temos os dados de desempenho do analista
        let cachedPerformanceData = await redis.get(`analystPerformance:${session.id}`);
        if (cachedPerformanceData) {
          console.log('Cache hit for analyst performance data');
          setPerformanceData(JSON.parse(cachedPerformanceData));
        } else {
          console.log('Cache miss for analyst performance data, fetching from API');
          const performanceRes = await fetch(`/api/get-user-performance?userEmail=${session.user.email}`);
          cachedPerformanceData = await performanceRes.json();
          // Armazenar os dados de desempenho no cache por 10 minutos
          await redis.set(`analystPerformance:${session.id}`, JSON.stringify(cachedPerformanceData), 'EX', 600);
          setPerformanceData(cachedPerformanceData);
        }

        // Verificar no cache se já temos os dados do leaderboard
        let cachedLeaderboardData = await redis.get(`analystLeaderboard:${session.id}`);
        if (cachedLeaderboardData) {
          console.log('Cache hit for analyst leaderboard data');
          setLeaderboardData(JSON.parse(cachedLeaderboardData).rows);
        } else {
          console.log('Cache miss for analyst leaderboard data, fetching from API');
          const leaderboardRes = await fetch(`/api/get-analyst-leaderboard?analystId=${session.id}`);
          cachedLeaderboardData = await leaderboardRes.json();
          // Armazenar os dados do leaderboard no cache por 10 minutos
          await redis.set(`analystLeaderboard:${session.id}`, JSON.stringify(cachedLeaderboardData), 'EX', 600);
          setLeaderboardData(cachedLeaderboardData.rows);
        }

        // Verificar no cache se já temos o ranking de categorias
        let cachedCategoryRankingData = await redis.get(`categoryRanking:${session.id}`);
        if (cachedCategoryRankingData) {
          console.log('Cache hit for category ranking data');
          setCategoryRankingData(JSON.parse(cachedCategoryRankingData).categories);
        } else {
          console.log('Cache miss for category ranking data, fetching from API');
          const categoryRankingRes = await fetch(`/api/get-category-ranking?analystId=${session.id}`);
          cachedCategoryRankingData = await categoryRankingRes.json();
          // Armazenar o ranking de categorias no cache por 10 minutos
          await redis.set(`categoryRanking:${session.id}`, JSON.stringify(cachedCategoryRankingData), 'EX', 600);
          setCategoryRankingData(cachedCategoryRankingData.categories);
        }

      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
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
        <title>Dashboard Analista</title>
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
          <h2 className={styles.pageTitle}>Dashboard do Analista</h2>

          <div className={styles.section}>
            <h3>Desempenho Atual</h3>
            {performanceData ? (
              <div className={styles.performance}>
                <p>Total de Chamados: {performanceData.totalChamados}</p>
                <p>Média por Dia: {performanceData.mediaPorDia}</p>
                <p>TMA: {performanceData.tma}</p>
                <p>CSAT: {performanceData.csat}</p>
                <p>Atualizado Até: {performanceData.atualizadoAte}</p>
              </div>
            ) : (
              <p>Nenhum dado de desempenho encontrado.</p>
            )}
          </div>

          <div className={styles.section}>
            <h3>Leaderboard</h3>
            <ul>
              {leaderboardData.length > 0 ? (
                leaderboardData.map((row, index) => (
                  <li key={index}>Analista: {row[3]}, Total de Chamados: {row[4]}</li>
                ))
              ) : (
                <p>Nenhum dado de leaderboard encontrado.</p>
              )}
            </ul>
          </div>

          <div className={styles.section}>
            <h3>Ranking de Categorias</h3>
            <ul>
              {categoryRankingData.length > 0 ? (
                categoryRankingData.map((category, index) => (
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
