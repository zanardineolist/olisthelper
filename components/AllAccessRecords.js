import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import styles from '../styles/Remote.module.css';

export default function AllAccessRecords({ user, currentTab }) {
  const [allRecords, setAllRecords] = useState([]);
  const [allMonthTotal, setAllMonthTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (currentTab === 0) {
      loadAllRecords();
    }
  }, [currentTab]);

  const loadAllRecords = async () => {
    try {
      const response = await fetch('/api/get-remote-records');
      if (response.ok) {
        const data = await response.json();
        const records = data.allRecords || [];
        setAllRecords(records);
        setAllTotal(records.length);

        // Filtrar registros do mês atual para definir o valor de "Acessos no Mês Atual"
        const today = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const currentMonth = new Date(today).getMonth();
        const currentYear = new Date(today).getFullYear();

        const monthRecords = records.filter(record => {
          const [day, month, year] = record[0].split('/');
          const recordDate = new Date(year, month - 1, day);
          return (
            recordDate.getMonth() === currentMonth &&
            recordDate.getFullYear() === currentYear
          );
        });

        setAllMonthTotal(monthRecords.length);

        // Preparar os dados para o gráfico
        prepareChartData(records);
      } else {
        Swal.fire('Erro', 'Erro ao buscar todos os registros.', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar todos os registros:', error);
      Swal.fire('Erro', 'Erro ao buscar todos os registros. Tente novamente.', 'error');
    }
  };

  const prepareChartData = (records) => {
    // Agrupar registros por mês
    const monthlyCounts = records.reduce((acc, record) => {
      const [day, month, year] = record[0].split('/');
      const monthYear = `${month}/${year}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    // Ordenar meses cronologicamente
    const sortedMonths = Object.keys(monthlyCounts).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
    });

    // Configurar os dados do gráfico
    setChartData({
      labels: sortedMonths,
      datasets: [
        {
          label: 'Acessos por Mês',
          data: sortedMonths.map(month => monthlyCounts[month]),
          fill: false,
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)',
          tension: 0.1,
        },
      ],
    });
  };

  return (
    <>
      {/* Contadores de Performance */}
      <div className={styles.performanceWrapper}>
        <div className={styles.performanceContainer}>
          <h2>Acessos no Mês Atual</h2>
          <span className={styles.totalCount}>{allMonthTotal}</span>
        </div>
        <div className={styles.performanceContainer}>
          <h2>Acessos Realizados</h2>
          <span className={styles.totalCount}>{allTotal}</span>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className={`${styles.cardContainer} ${styles.dashboard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Acessos Realizados</h2>
        </div>
        <div className={styles.recordsTable}>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Nome</th>
                <th>Chamado</th>
                <th>Tema</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {allRecords.length > 0 ? (
                allRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{record[0]}</td>
                    <td>{record[1]}</td>
                    <td>{record[2]}</td>
                    <td>{record[4]}</td>
                    <td>{record[5]}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>
                          {record[6]?.length > 20 ? `${record[6].substring(0, 20)}...` : record[6]}
                        </span>
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          className={styles.infoIcon}
                          onClick={() => handleDescriptionClick(record[6])}
                        />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de Linha */}
      {chartData && (
        <div className={styles.chartContainer}>
          <h2>Progressão dos Acessos Mensais</h2>
          <Line data={chartData} options={{ responsive: true, animation: { duration: 1000 } }} />
        </div>
      )}
    </>
  );
}

const handleDescriptionClick = (description) => {
  Swal.fire({
    title: 'Descrição Completa',
    text: description,
    icon: 'info',
    confirmButtonText: 'Fechar',
  });
};
