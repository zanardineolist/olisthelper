import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import styles from '../styles/DashboardAnalyst.module.css';

export default function DashboardAnalyst({ session }) {
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [filter, setFilter] = useState('7');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/get-analyst-records?analystId=${session.id}&filter=${filter}`);
        const data = await res.json();
        setRecordCount(data.count);
        setChartData(data.count > 0 ? {
          labels: data.dates,
          datasets: [{ label: 'Dúvidas Auxiliadas', data: data.counts, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)' }]
        } : null);
      } catch {
        setRecordCount(0);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [filter, session.id]);

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <h2>Dashboard do Analista</h2>
      <div>
        <p>Total de Dúvidas Auxiliadas: {recordCount}</p>
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
        {chartData ? <Bar data={chartData} /> : <div className={styles.noData}>Nenhum dado disponível para o período selecionado.</div>}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'analyst') {
    return {
      redirect: {
        destination: '/my',
        permanent: false,
      },
    };
  }
  return {
    props: { session },
  };
}
