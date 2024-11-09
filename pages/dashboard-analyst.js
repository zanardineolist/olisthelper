// pages/dashboard-analyst.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import Navbar from '../components/Navbar';
import styles from '../styles/DashboardAnalyst.module.css';
import Footer from '../components/Footer';

export default function DashboardAnalyst({ user }) {
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [filter, setFilter] = useState('7');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterLabel, setFilterLabel] = useState('Últimos 7 dias');

  // Fetch registros do analista (para o gráfico, com base no filtro selecionado)
  const fetchRecords = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/get-analyst-records?analystId=${user.id}&filter=${filter}`);
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

  // Fetch leaderboard de usuários (sempre com base no mês atual)
  const fetchLeaderboard = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-analyst-leaderboard?analystId=${user.id}`);
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

  // Fetch ranking de categorias (sempre com base no mês atual)
  const fetchCategoryRanking = async () => {
    if (!user?.id) {
      console.error("ID do analista não encontrado.");
      return;
    }

    try {
      const res = await fetch(`/api/get-category-ranking?analystId=${user.id}`);
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

  // Carregar dados ao montar o componente e sempre que o filtro mudar (apenas para registros do gráfico)
  useEffect(() => {
    fetchRecords();
  }, [filter, user]);

  // Carregar leaderboard e ranking de categorias apenas ao montar o componente
  useEffect(() => {
    fetchLeaderboard();
    fetchCategoryRanking();
  }, [user]);

  const handleFilterChange = (value, label) => {
    setFilter(value);
    setFilterLabel(label);
    setShowDropdown(false);
  };

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

      {/* Navbar reutilizável */}
      <Navbar user={user} />

      <div className={styles.dashboardContainer}>
        <h2>Seu Dashboard</h2>
        <div className={styles.summary}>
          <p>Total de auxilios: {recordCount}</p>
        </div>
        <div className={styles.filterButtonContainer}>
          <button className={styles.filterButton} onClick={() => setShowDropdown(!showDropdown)}>
            <strong>Filtrar por:</strong> {filterLabel}
          </button>
          {showDropdown && (
            <div className={styles.dropdown}>
              <button onClick={() => handleFilterChange('1', 'Hoje')}>Hoje</button>
              <button onClick={() => handleFilterChange('7', 'Últimos 7 dias')}>Últimos 7 dias</button>
              <button onClick={() => handleFilterChange('30', 'Últimos 30 dias')}>Últimos 30 dias</button>
            </div>
          )}
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
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
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
        id: session.id,
      },
    },
  };
}
