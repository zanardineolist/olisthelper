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
import dayjs from 'dayjs';

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
  const [filter, setFilter] = useState('1');
  const [filterLabel, setFilterLabel] = useState('Hoje');
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

  // Função para gerar um array de datas
  const generateDateRange = (days) => {
    const today = dayjs();
    return Array.from({ length: days }, (_, i) => today.subtract(i, 'day').format('DD/MM/YYYY')).reverse();
  };

  // Função para buscar dados dos registros dos usuários selecionados
  const fetchRecordsForUsers = async () => {
    if (!selectedUsers.length) {
      setChartData(null);
      return;
    }

    try {
      setLoading(true);
      const datasets = [];
      const labels = generateDateRange(parseInt(filter));
      let hasData = false; // Flag para verificar se há algum dado

      for (const [index, user] of selectedUsers.entries()) {
        const res = await fetch(`/api/get-analyst-records?analystId=${user.id}&filter=${filter}`);
        if (!res.ok) throw new Error(`Erro ao buscar registros do usuário ${user.name}`);

        const data = await res.json();
        const userCounts = labels.map(label => {
          const dateIndex = data.dates.indexOf(label);
          return dateIndex !== -1 ? data.counts[dateIndex] : 0;
        });

        if (userCounts.some(count => count > 0)) {
          hasData = true; // Se houver algum valor maior que zero, marcar como verdadeiro
        }

        datasets.push({
          label: user.name,
          data: userCounts,
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length],
          borderWidth: 1,
        });
      }

      if (hasData) {
        setChartData({
          labels,
          datasets,
        });
      } else {
        setChartData(null); // Se não houver dados, definir chartData como null
      }
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

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '800px',
      margin: '20px auto',
    }),
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      caretColor: 'var(--text-color)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      maxHeight: '250px',
      overflowY: 'auto',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '250px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'var(--scroll-bg)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--scroll)',
        borderRadius: '10px',
        border: '2px solid var(--scroll-bg)',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? 'var(--color-trodd)'
        : state.isSelected
        ? 'var(--color-primary)'
        : 'var(--box-color)',
      color: 'var(--text-color)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--color-trodd)',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border)',
    }),
  };

  return (
    <div className={styles.graphDataContainer}>
      <h2>Gráfico de auxilios Analistas/Fiscal</h2>

      <div className={styles.filterButtonContainer}>
        <button
          className={`${styles.filterButton} ${filter === '1' ? styles.activeFilterButton : ''}`}
          onClick={() => handleFilterChange('1', 'Hoje')}
        >
          Hoje
        </button>
        <button
          className={`${styles.filterButton} ${filter === '7' ? styles.activeFilterButton : ''}`}
          onClick={() => handleFilterChange('7', 'Últimos 7 dias')}
        >
          Últimos 7 dias
        </button>
        <button
          className={`${styles.filterButton} ${filter === '30' ? styles.activeFilterButton : ''}`}
          onClick={() => handleFilterChange('30', 'Últimos 30 dias')}
        >
          Últimos 30 dias
        </button>
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
        styles={customSelectStyles}
        classNamePrefix="react-select"
        noOptionsMessage={() => 'Sem resultados'}
      />

      <div className={styles.chartContainer} style={{ minHeight: '400px' }}>
        {loading ? (
          <div className="standardBoxLoader"></div>
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
