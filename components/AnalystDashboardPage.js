import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function AnalystDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState({});
  const [filter, setFilter] = useState('7'); // Default: últimos 7 dias

  useEffect(() => {
    if (!session || session.role !== 'analyst') {
      router.push('/');
      return;
    }

    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/get-analyst-records?analystId=${session.user.id}&filter=${filter}`);
        if (!res.ok) {
          throw new Error('Erro ao buscar registros.');
        }

        const data = await res.json();
        setRecordCount(data.count);
        setChartData({
          labels: data.dates,
          datasets: [
            {
              label: 'Dúvidas Auxiliadas',
              data: data.counts,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        });
      } catch (err) {
        console.error('Erro ao carregar registros:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [session, filter, router]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#121212', minHeight: '100vh' }}>
      <h2>Dashboard do Analista</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <div>
            <p>Total de Dúvidas Auxiliadas: {recordCount}</p>
          </div>
          <div>
            <label htmlFor="filter">Filtrar por:</label>
            <select id="filter" value={filter} onChange={handleFilterChange}>
              <option value="1">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
          <div style={{ marginTop: '20px' }}>
            <Bar data={chartData} />
          </div>
        </>
      )}
    </div>
  );
}
