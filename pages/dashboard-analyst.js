// pages/dashboard-analyst.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/DashboardAnalyst.module.css';
import Footer from '../components/Footer';

export default function DashboardAnalystPage({ session }) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [analystRecords, setAnalystRecords] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const analystId = session.id;

        // Obter dados do leaderboard do analista
        const leaderboardRes = await fetch(`/api/data/get-analyst-leaderboard-data?analystId=${analystId}`);
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard);

        // Obter registros do analista
        const recordsRes = await fetch(`/api/data/get-analyst-records-data?analystId=${analystId}`);
        const recordsData = await recordsRes.json();
        setAnalystRecords(recordsData.records);

        // Obter ranking de categorias do analista
        const categoryRankingRes = await fetch(`/api/data/get-category-ranking-data?analystId=${analystId}`);
        const categoryRankingData = await categoryRankingRes.json();
        setCategoryRanking(categoryRankingData.categories);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [session]);

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
          <button
            onClick={() => setMenuOpen((prevMenuOpen) => !prevMenuOpen)}
            className={commonStyles.menuToggle}
          >
            ☰
          </button>
        </nav>

        {menuOpen && (
          <div className={commonStyles.menu}>
            <button onClick={() => router.push('/profile-analyst')} className={commonStyles.menuButton}>
              Meu Perfil
            </button>
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
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}

        <div className={styles.mainContent}>
          <h2>Dashboard do Analista</h2>

          <div className={styles.leaderboardSection}>
            <h3>Leaderboard</h3>
            {leaderboard.length > 0 ? (
              <ul>
                {leaderboard.map((item, index) => (
                  <li key={index}>
                    <strong>Nome:</strong> {item.name} - <strong>Pontuação:</strong> {item.score}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma informação disponível no leaderboard.</p>
            )}
          </div>

          <div className={styles.recordsSection}>
            <h3>Registros do Analista</h3>
            {analystRecords.length > 0 ? (
              <ul>
                {analystRecords.map((record, index) => (
                  <li key={index}>
                    <strong>Data:</strong> {record.date} - <strong>Categoria:</strong> {record.category} - <strong>Descrição:</strong> {record.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum registro encontrado.</p>
            )}
          </div>

          <div className={styles.categoryRankingSection}>
            <h3>Ranking de Categorias</h3>
            {categoryRanking.length > 0 ? (
              <ul>
                {categoryRanking.map((category, index) => (
                  <li key={index}>
                    <strong>Categoria:</strong> {category.name} - <strong>Ocorrências:</strong> {category.count}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma categoria encontrada.</p>
            )}
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
