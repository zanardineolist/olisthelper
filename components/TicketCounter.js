import React, { useState, useEffect } from 'react';
import { Bar } from 'recharts';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';

export default function TicketCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [dateFilter, setDateFilter] = useState('7'); // Padrão: últimos 7 dias

  // Carregar contagem inicial e dados do gráfico
  useEffect(() => {
    loadTodayCount();
    loadChartData();
  }, []);

  // Recarregar dados do gráfico quando o filtro mudar
  useEffect(() => {
    loadChartData();
  }, [dateFilter]);

  const loadTodayCount = async () => {
    try {
      const res = await fetch('/api/ticket-count');
      if (!res.ok) throw new Error('Erro ao carregar contagem');
      const data = await res.json();
      setCount(data.count);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
      Swal.fire('Erro', 'Erro ao carregar contagem do dia', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(parseInt(dateFilter), 'days').format('YYYY-MM-DD');

      const res = await fetch(`/api/ticket-count?period=true&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Erro ao carregar dados do gráfico');
      
      const data = await res.json();
      setChartData({
        labels: data.labels,
        datasets: [{
          label: 'Chamados Respondidos',
          data: data.values,
          backgroundColor: 'rgba(119, 158, 61, 1)',
          borderColor: 'rgba(84, 109, 47, 1)',
          borderWidth: 1
        }]
      });
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error);
      Swal.fire('Erro', 'Erro ao carregar dados do gráfico', 'error');
    }
  };

  const handleIncrement = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ticket-count', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao incrementar contagem');
      setCount(prev => prev + 1);
      await loadChartData(); // Recarregar gráfico
    } catch (error) {
      console.error('Erro ao incrementar:', error);
      Swal.fire('Erro', 'Erro ao adicionar contagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ticket-count', { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao decrementar contagem');
      setCount(prev => Math.max(0, prev - 1));
      await loadChartData(); // Recarregar gráfico
    } catch (error) {
      console.error('Erro ao decrementar:', error);
      Swal.fire('Erro', 'Erro ao remover contagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const result = await Swal.fire({
      title: 'Limpar contagem do dia?',
      text: 'Esta ação irá zerar todas as contagens registradas hoje. Deseja continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, limpar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const res = await fetch('/api/ticket-count?action=clear', { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao limpar contagem');
        setCount(0);
        await loadChartData(); // Recarregar gráfico
        Swal.fire('Sucesso', 'Contagem do dia removida com sucesso', 'success');
      } catch (error) {
        console.error('Erro ao limpar:', error);
        Swal.fire('Erro', 'Erro ao limpar contagem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-8">
      {/* Data atual */}
      <div className="text-2xl font-bold mb-8">
        {dayjs().format('DD/MM/YYYY')}
      </div>

      {/* Contador */}
      <div className="flex items-center gap-6 mb-12">
        <button
          onClick={handleDecrement}
          disabled={loading || count === 0}
          className="w-16 h-16 rounded-full bg-red-500 text-white text-3xl font-bold hover:bg-red-600 disabled:opacity-50"
        >
          -
        </button>

        <div className="text-6xl font-bold min-w-[120px] text-center">
          {loading ? '...' : count}
        </div>

        <button
          onClick={handleIncrement}
          disabled={loading}
          className="w-16 h-16 rounded-full bg-green-500 text-white text-3xl font-bold hover:bg-green-600 disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* Botão Limpar */}
      <button
        onClick={handleClear}
        disabled={loading || count === 0}
        className="mb-12 px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        Limpar Contagem do Dia
      </button>

      {/* Filtro do gráfico */}
      <div className="w-full mb-8">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setDateFilter('7')}
            className={`px-4 py-2 rounded ${
              dateFilter === '7' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setDateFilter('15')}
            className={`px-4 py-2 rounded ${
              dateFilter === '15' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            15 dias
          </button>
          <button
            onClick={() => setDateFilter('30')}
            className={`px-4 py-2 rounded ${
              dateFilter === '30' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            30 dias
          </button>
        </div>
      </div>

      {/* Gráfico */}
      {chartData && (
        <div className="w-full bg-white p-4 rounded-lg shadow">
          <Bar 
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Evolução de Chamados Respondidos'
                }
              }
            }}
            height={300}
          />
        </div>
      )}
    </div>
  );
}