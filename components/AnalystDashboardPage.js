import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function AnalystDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState({});
  const [filter, setFilter] = useState('7'); // Default: últimos 7 dias

  useEffect(() => {
    // Se a sessão está carregando, não fazer nada ainda
    if (status === 'loading') return;

    // Se o usuário não for autenticado ou não for "analyst", redirecionar
    if (status === 'unauthenticated' || session?.role !== 'analyst') {
      router.push('/');
      return;
    }

    // Buscar dados após a sessão estar carregada e o usuário for um "analyst"
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
  }, [session, status, filter, router]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  // Se a sessão está carregando, mostrar uma mensagem de carregamento
  if (status === 'loading' || loading) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#121212', minHeight: '100vh' }}>
      <h2>Dashboard do Analista</h2>
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
    </div>
  );
}