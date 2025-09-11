import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import styles from '../styles/Remote.module.css';

export default function AllAccessRecords({ user, currentTab }) {
  const [userStats, setUserStats] = useState([]);
  const [summary, setSummary] = useState({});
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('totalAccesses');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (currentTab === 0) {
      loadUserStats();
    }
  }, [currentTab]);

  const loadUserStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-remote-stats');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.userStats || []);
        setSummary(data.summary || {});
        
        // Preparar dados para o gráfico
        prepareChartData(data.userStats || []);
      } else {
        console.error('Erro ao buscar estatísticas de usuários');
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (stats) => {
    // Pegar os top 10 usuários com mais acessos
    const topUsers = stats
      .filter(user => user.totalAccesses > 0)
      .slice(0, 10);

    setChartData({
      labels: topUsers.map(user => user.name),
      datasets: [
        {
          label: 'Total de Acessos',
          data: topUsers.map(user => user.totalAccesses),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Acessos no Mês',
          data: topUsers.map(user => user.monthlyAccesses),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortedUsers = () => {
    return [...userStats].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const formatLastAccess = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Carregando estatísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <h3>Total de Usuários</h3>
          <div className={styles.statNumber}>{summary.totalUsers || 0}</div>
          <small>com permissão de acesso</small>
        </div>
        <div className={styles.statBox}>
          <h3>Usuários Ativos</h3>
          <div className={styles.statNumber}>{summary.activeUsers || 0}</div>
          <small>com pelo menos 1 acesso</small>
        </div>
        <div className={styles.statBox}>
          <h3>Total de Acessos</h3>
          <div className={styles.statNumber}>{summary.totalAccesses || 0}</div>
          <small>registrados no sistema</small>
        </div>
        <div className={styles.statBox}>
          <h3>Acessos no Mês</h3>
          <div className={styles.statNumber}>{summary.monthlyTotalAccesses || 0}</div>
          <small>no mês atual</small>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Dashboard de Usuários - Acessos Remotos</h2>
          <div className={styles.cardActions}>
            <span className={styles.totalCount}>
              {userStats.length} usuários com permissão
            </span>
          </div>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.recordsTable}>
            <thead>
              <tr>
                <th 
                  className={`${styles.nameColumn} ${styles.sortable}`}
                  onClick={() => handleSort('name')}
                >
                  Nome 
                  {sortBy === 'name' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th className={styles.emailColumn}>Email</th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('totalAccesses')}
                >
                  Total de Acessos
                  {sortBy === 'totalAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('monthlyAccesses')}
                >
                  Acessos no Mês
                  {sortBy === 'monthlyAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('last30DaysAccesses')}
                >
                  Últimos 30 Dias
                  {sortBy === 'last30DaysAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th className={styles.dateColumn}>Último Acesso</th>
              </tr>
            </thead>
            <tbody>
              {getSortedUsers().length > 0 ? (
                getSortedUsers().map((user, index) => (
                  <tr key={user.id || index} className={styles.tableRow}>
                    <td className={styles.nameCell}>
                      <div className={styles.userInfo}>
                        <strong>{user.name}</strong>
                        {user.totalAccesses === 0 && (
                          <span className={styles.inactiveTag}>Inativo</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.emailCell}>{user.email}</td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.totalAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.totalAccesses}
                      </span>
                    </td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.monthlyAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.monthlyAccesses}
                      </span>
                    </td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.last30DaysAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.last30DaysAccesses}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      <span className={user.lastAccess ? styles.hasAccess : styles.noAccess}>
                        {formatLastAccess(user.lastAccess)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={styles.noRecordsMessage}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de Barras */}
      {chartData && chartData.labels.length > 0 && (
        <div className={styles.cardContainer}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top 10 Usuários - Acessos Remotos</h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <Bar 
              data={chartData} 
              options={{ 
                responsive: true, 
                animation: { duration: 1000 },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  }
                },
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: true,
                      text: 'Usuários'
                    }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    },
                    title: {
                      display: true,
                      text: 'Quantidade de Acessos'
                    }
                  }
                },
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
                }
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}
