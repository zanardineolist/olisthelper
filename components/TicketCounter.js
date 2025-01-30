import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import Select from 'react-select';

export default function TicketCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ value: 'today', label: 'Hoje' });
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const filterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Período específico' }
  ];

  useEffect(() => {
    loadTodayCount();
    loadHistoryData();
  }, [dateFilter, page, customRange]);

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

  const loadHistoryData = async () => {
    try {
      let startDate, endDate;
      
      switch (dateFilter.value) {
        case 'today':
          startDate = dayjs().startOf('day').format('YYYY-MM-DD');
          endDate = dayjs().endOf('day').format('YYYY-MM-DD');
          break;
        case '7days':
          startDate = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
          break;
        case '30days':
          startDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
          endDate = dayjs().format('YYYY-MM-DD');
          break;
        case 'month':
          startDate = dayjs().startOf('month').format('YYYY-MM-DD');
          endDate = dayjs().endOf('month').format('YYYY-MM-DD');
          break;
        case 'year':
          startDate = dayjs().startOf('year').format('YYYY-MM-DD');
          endDate = dayjs().endOf('year').format('YYYY-MM-DD');
          break;
        case 'custom':
          startDate = customRange.startDate;
          endDate = customRange.endDate;
          break;
      }

      const res = await fetch(`/api/ticket-count?period=true&startDate=${startDate}&endDate=${endDate}&page=${page}`);
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      setHistory(data.records);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      
      // Preparar dados para o gráfico
      setChartData(data.records.map(record => ({
        date: dayjs(record.count_date).format('DD/MM/YYYY'),
        count: record.total_count
      })));

    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Swal.fire('Erro', 'Erro ao carregar histórico', 'error');
    }
  };

  const handleIncrement = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ticket-count', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao incrementar contagem');
      setCount(prev => prev + 1);
      await loadHistoryData();
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
      await loadHistoryData();
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
        await loadHistoryData();
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
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      {/* Data atual e contador */}
      <div className="flex flex-col items-center mb-12 p-8 bg-gray-50 rounded-xl w-full">
        <div className="text-3xl font-bold mb-8 text-gray-700">
          {dayjs().format('DD/MM/YYYY')}
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={handleDecrement}
            disabled={loading || count === 0}
            className="w-24 h-24 rounded-full bg-red-500 text-white text-4xl font-bold hover:bg-red-600 disabled:opacity-50 shadow-lg transition-transform active:scale-95"
          >
            -
          </button>

          <div className="flex flex-col items-center">
            <div className="text-8xl font-bold min-w-[200px] text-center text-gray-800">
              {loading ? '...' : count}
            </div>
            <div className="text-xl text-gray-500 mt-2">chamados respondidos</div>
          </div>

          <button
            onClick={handleIncrement}
            disabled={loading}
            className="w-24 h-24 rounded-full bg-green-500 text-white text-4xl font-bold hover:bg-green-600 disabled:opacity-50 shadow-lg transition-transform active:scale-95"
          >
            +
          </button>
        </div>

        <button
          onClick={handleClear}
          disabled={loading || count === 0}
          className="mt-8 px-8 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-semibold shadow-md transition-colors"
        >
          Limpar Contagem do Dia
        </button>
      </div>

      {/* Filtros e Histórico */}
      <div className="w-full bg-white p-6 rounded-xl shadow-md">
        <div className="flex gap-4 mb-8">
          <Select
            value={dateFilter}
            onChange={(option) => {
              setDateFilter(option);
              setPage(1);
            }}
            options={filterOptions}
            className="w-64"
            isSearchable={false}
          />

          {dateFilter.value === 'custom' && (
            <div className="flex gap-4">
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-4 py-2 border rounded"
              />
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-4 py-2 border rounded"
              />
            </div>
          )}
        </div>

        {/* Gráfico */}
        {chartData && chartData.length > 0 && (
          <div className="h-[400px] mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4CAF50" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Histórico */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total de Chamados
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((record, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {dayjs(record.count_date).format('DD/MM/YYYY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.total_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Total de registros: {totalCount}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}