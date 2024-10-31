import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/DashboardAnalyst.module.css';
import Footer from '../components/Footer';

export default function DashboardAnalyst({ session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [filter, setFilter] = useState('7');

  const fetchRecords = async () => {
    if (!session?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/get-analyst-records?analystId=${session.id}&filter=${filter}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros.');
      }

      const data = await res.json();
      setRecordCount(data.count);
      setChartData(data.count > 0 ? {
        labels: data.dates,
        datasets: [
          {
            label: 'Auxilios',
            data: data.counts,
            backgroundColor: 'rgba(119, 158, 61, 1)',
            borderColor: 'rgba(84, 109, 47, 1)',
            borderWidth: 1,
          },
        ],
      } : null);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      setRecordCount(0);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!session?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-analyst-leaderboard?analystId=${session.id}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros para o leaderboard.');
      }

      const data = await res.json();
      if (!data || !data.rows || data.rows.length === 0) {
        setLeaderboard([]);
        return;
      }

      const userHelpCounts = data.rows.reduce((acc, row) => {
        const userName = row[2];
        if (userName) {
          acc[userName] = (acc[userName] || 0) + 1;
        }
        return acc;
      }, {});

      const sortedUsers = Object.entries(userHelpCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setLeaderboard(sortedUsers);
    } catch (err) {
      console.error('Erro ao carregar leaderboard:', err);
      setLeaderboard([]);
    }
  };

  const fetchCategoryRanking = async () => {
    if (!session?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-category-ranking?analystId=${session.id}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar registros das categorias.');
      }

      const data = await res.json();
      setCategoryRanking(data.categories || []);
    } catch (err) {
      console.error('Erro ao carregar ranking das categorias:', err);
      setCategoryRanking([]);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchLeaderboard();
    fetchCategoryRanking();
  }, [filter, session]);

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }  

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <>
      <Head>
        <title>Dashboard Analista</title>
      </Head>

      <div className={commonStyles.container}>
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
            {(session.role === 'analyst' || session.role === 'tax') && (
              <>
                <button onClick={() => handleNavigation('/profile-analyst')} className={commonStyles.menuButton}>
                  Meu Perfil
                </button>
                <button onClick={() => handleNavigation('/registro')} className={commonStyles.menuButton}>
                  Registrar Ajuda
                </button>
                <button onClick={() => handleNavigation('/dashboard-analyst')} className={commonStyles.menuButton}>
                  Dashboard
                </button>
              </>
            )}
            {session.role === 'super' && (
              <>
                <button onClick={() => handleNavigation('/dashboard-super')} className={commonStyles.menuButton}>
                  Dashboard Super
                </button>
              </>
            )}
            {(session.role === 'analyst' || session.role === 'super' || session.role === 'tax') && (
              <>
                <button onClick={() => handleNavigation('/manage-users')} className={commonStyles.menuButton}>
                  Gerenciar Usuários
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
            <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.menuButton}>
              Logout
            </button>
          </div>
        )}
      </div>
  
      <div className={styles.dashboardContainer}>
        <h2>Seu Dashboard</h2>
        <div className={styles.summary}>
          <p>Total de auxilios: {recordCount}</p>
        </div>
        <div className={styles.filter}>
          <label htmlFor="filter">Filtrar por:</label>
          <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="1">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>
        <div className={styles.chartContainer}>
          {chartData ? (
            <Bar data={chartData} />
          ) : (
            <div className={styles.noData}>
              Nenhum dado disponível para o período selecionado.
            </div>
          )}
        </div>
        <div className={styles.rankingContainer}>
          <div className={styles.leaderboard}>
            <h3>Top 5 - Usuários que Mais Pediram Ajuda (Mês Atual)</h3>
            {leaderboard.length > 0 ? (
              <ul className={styles.list}>
                {leaderboard.map((user, index) => (
                  <li key={index} className={styles.listItem}>
                    <span className={styles.rank}>{index + 1}.</span>
                    <span className={styles.userName}>{user.name}</span>
                    <div className={styles.progressBarRanking} style={{ width: `${user.count * 10}px` }} />
                    <span className={styles.count}>{user.count} auxilios</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.noData}>Nenhum assistente solicitou ajuda neste mês.</div>
            )}
          </div>
          <div className={styles.categoryRanking}>
            <h3>Top 10 - Temas de Dúvidas (Mês Atual)</h3>
            {categoryRanking.length > 0 ? (
              <ul className={styles.list}>
                {categoryRanking.map((category, index) => (
                  <li key={index} className={styles.listItem}>
                    <span className={styles.rank}>{index + 1}.</span>
                    <span className={styles.categoryName}>{category.name}</span>
                    <div className={styles.progressBarCategory} style={{ width: `${category.count * 10}px` }} />
                    <span className={styles.count}>{category.count} auxilios</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.noData}>Nenhum tema selecionado neste mês.</div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );  
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'analyst') {
    return {
      redirect: {
        destination: '/profile',
        permanent: false,
      },
    };
  }
  return {
    props: { session },
  };
}