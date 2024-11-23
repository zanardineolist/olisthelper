// components/GraphData.js
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Select from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/GraphData.module.css';

// Registrar os elementos necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function GraphData({ users }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filter, setFilter] = useState('7');
  const [filterLabel, setFilterLabel] = useState('Últimos 7 dias');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);

  // Paleta de cores fornecida
  const colors = [
    '#E64E36',
    '#F0A028',
    '#0A4EE4',
    '#001647',
    '#779E3D',
    '#8DD7D7',
    '#DF9FC7',
  ];

  // Função para buscar dados dos registros dos usuários selecionados
  const fetchRecordsForUsers = async () => {
    if (!selectedUsers.length) {
      setChartData(null);
      return;
    }

    try {
      setLoading(true);
      const datasets = [];
      for (const [index, user] of selectedUsers.entries()) {
        const res = await fetch(`/api/get-analyst-records?analystId=${user.id}&filter=${filter}`);
        if (!res.ok) throw new Error(`Erro ao buscar registros do usuário ${user.name}`);

        const data = await res.json();
        if (data.count > 0) {
          datasets.push({
            label: user.name,
            data: data.counts,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1,
          });
        }
      }

      // Utilizar as datas reais dos registros
      const labels = datasets.length > 0 ? data.dates : [];

      setChartData({
        labels,
        datasets,
      });
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      Swal.fire('Erro', 'Erro ao carregar registros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar os registros quando o filtro ou usuários mudarem
  useEffect(() => {
    fetchRecordsForUsers();
  }, [selectedUsers, filter]);

  // Manipulador para mudar o filtro de dias
  const handleFilterChange = (value, label) => {
    setFilter(value);
    setFilterLabel(label);
  };

  return (
    <div className={styles.graphDataContainer}>
      <h2>Gráfico de Dados dos Analistas/Fiscais</h2>

      <div className={styles.filterButtonContainer}>
        <button className={styles.filterButton} onClick={() => handleFilterChange('1', 'Hoje')}>Hoje</button>
        <button className={styles.filterButton} onClick={() => handleFilterChange('7', 'Últimos 7 dias')}>Últimos 7 dias</button>
        <button className={styles.filterButton} onClick={() => handleFilterChange('30', 'Últimos 30 dias')}>Últimos 30 dias</button>
      </div>

      <Select
        options={users.filter(user => ['analyst', 'tax'].includes(user.role.toLowerCase())).map(user => ({
          value: user,
          label: user.name,
          id: user.id,
        }))}
        onChange={(selectedOptions) => {
          setSelectedUsers(selectedOptions ? selectedOptions.map(option => option.value) : []);
        }}
        isMulti
        placeholder="Selecione analistas ou fiscais"
        classNamePrefix="react-select"
        noOptionsMessage={() => 'Sem resultados'}
      />

      <div className={styles.chartContainer}>
        {loading ? (
          <div className={styles.loadingOverlay}>
            <div className="standardBoxLoader"></div>
          </div>
        ) : (
          chartData ? (
            <Bar data={chartData} />
          ) : (
            <div className={styles.noData}>Nenhum dado disponível para o período selecionado.</div>
          )
        )}
      </div>
    </div>
  );
}
