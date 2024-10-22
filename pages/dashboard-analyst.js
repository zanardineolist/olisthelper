import { getSession } from 'next-auth/react';

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Redireciona se o usuário não estiver autenticado ou não for um analista
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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function DashboardAnalyst({ session }) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [chartData, setChartData] = useState(null); // Inicializado como null para indicar dados não carregados
  const [filter, setFilter] = useState('7');

  // Definir `isClient` como true quando estiver no lado do cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Função para buscar registros
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

      if (data.count === 0) {
        setRecordCount(0);
        setChartData(null);
      } else {
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
      }
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      setRecordCount(0);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  // Carregar registros quando estiver no lado do cliente e o session estiver disponível
  useEffect(() => {
    if (isClient && session) {
      fetchRecords();
    }
  }, [isClient, filter, session]);

  // Mostrar um indicador de carregamento enquanto os dados não estão prontos
  if (!isClient || loading) {
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
        <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>
      <div style={{ marginTop: '20px' }}>
        {chartData ? (
          <Bar data={chartData} />
        ) : (
          <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
            Nenhum dado disponível para o período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}