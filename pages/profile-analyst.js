// pages/profile-analyst.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/ProfileAnalyst.module.css';
import Footer from '../components/Footer';

export default function ProfileAnalystPage({ session }) {
  const router = useRouter();
  const [analystData, setAnalystData] = useState(null);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadAnalystData = async () => {
      try {
        setLoading(true);
        const analystId = session.id;

        // Obter registros do analista
        const recordsRes = await fetch(`/api/data/get-analyst-records-data?analystId=${analystId}&mode=profile`);
        const recordsData = await recordsRes.json();
        setAnalystData(recordsData);

        // Obter ranking de categorias do analista
        const categoryRankingRes = await fetch(`/api/data/get-category-ranking-data?analystId=${analystId}`);
        const categoryRankingData = await categoryRankingRes.json();
        setCategoryRanking(categoryRankingData.categories);
      } catch (err) {
        console.error('Erro ao carregar dados do perfil do analista:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalystData();
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
        <title>Perfil do Analista</title>
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
          <h2>Perfil do Analista</h2>

          {analystData && (
            <div className={styles.performanceSection}>
              <h3>Desempenho</h3>
              <p><strong>Nome:</strong> {session.user.name}</p>
              <p><strong>Registros do Mês Atual:</strong> {analystData.currentMonthCount}</p>
              <p><strong>Registros do Mês Anterior:</strong> {analystData.lastMonthCount}</p>
            </div>
          )}

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
