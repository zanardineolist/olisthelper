import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import styles from '../styles/Remote.module.css';

export default function AllAccessRecords({ user, currentTab }) {
  const [allRecords, setAllRecords] = useState([]);
  const [allMonthTotal, setAllMonthTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

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

        // Filtrar registros do mês atual
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const monthRecords = records.filter(record => {
          if (!record.date) return false;
          const [day, month, year] = record.date.split('/');
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
        console.error('Erro ao buscar todos os registros');
      }
    } catch (error) {
      console.error('Erro ao buscar todos os registros:', error);
    }
  };

  const prepareChartData = (records) => {
    // Agrupar registros por mês
    const monthlyCounts = records.reduce((acc, record) => {
      if (!record.date) return acc;
      
      const [day, month, year] = record.date.split('/');
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

  const handleDescriptionClick = (description, recordInfo) => {
    setModalTitle(`Descrição do Acesso - ${recordInfo.ticket_number || 'N/A'}`);
    setModalContent(description || 'Sem descrição disponível');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent('');
    setModalTitle('');
  };

  return (
    <>
      {/* Caixas de Contadores */}
      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <h3>Acessos no Mês Atual</h3>
          <div className={styles.statNumber}>{allMonthTotal}</div>
        </div>
        <div className={styles.statBox}>
          <h3>Acessos Realizados</h3>
          <div className={styles.statNumber}>{allTotal}</div>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Acessos Realizados</h2>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.recordsTable}>
            <thead>
              <tr>
                <th className={styles.dateColumn}>Data</th>
                <th className={styles.timeColumn}>Hora</th>
                <th className={styles.nameColumn}>Nome</th>
                <th className={styles.ticketColumn}>Chamado</th>
                <th className={styles.themeColumn}>Tema</th>
                <th className={styles.descriptionColumn}>Descrição</th>
                <th className={styles.actionsColumn}></th>
              </tr>
            </thead>
            <tbody>
              {allRecords.length > 0 ? (
                allRecords.map((record, index) => (
                  <tr key={record.id || index} className={styles.tableRow}>
                    <td>{record.date}</td>
                    <td>{record.time}</td>
                    <td>{record.name}</td>
                    <td>{record.ticket_number}</td>
                    <td>{record.theme}</td>
                    <td className={styles.descriptionCell}>
                      <div className={styles.truncatedText}>
                        {record.description || 'N/A'}
                      </div>
                    </td>
                    <td>
                      {record.description && (
                        <button
                          className={styles.expandButton}
                          onClick={() => handleDescriptionClick(record.description, record)}
                          title="Ver descrição completa"
                        >
                          Ver mais
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className={styles.noRecordsMessage}>
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
        <div className={styles.cardContainer}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Progressão dos Acessos Mensais</h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <Line 
              data={chartData} 
              options={{ 
                responsive: true, 
                animation: { duration: 1000 },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{modalTitle}</h3>
              <button className={styles.modalCloseButton} onClick={closeModal}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>{modalContent}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
