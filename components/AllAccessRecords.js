import { useEffect, useState } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogActions, Button, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import styles from '../styles/Remote.module.css';

export default function AllAccessRecords({ user, currentTab }) {
  const [userStats, setUserStats] = useState([]);
  const [summary, setSummary] = useState({});
  const [allRecords, setAllRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('totalAccesses');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' ou 'records'
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [themeFilter, setThemeFilter] = useState('');
  const [availableThemes, setAvailableThemes] = useState([]);
  const [filteredChartData, setFilteredChartData] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Carregar dados sempre que o componente for montado ou currentTab mudar
    loadUserStats();
  }, [currentTab]);

  const loadUserStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-remote-stats');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.userStats || []);
        setSummary(data.summary || {});
        setAllRecords(data.allRecords || []);
        setFilteredRecords(data.allRecords || []);
        
        // Extrair temas únicos dos registros
        const themes = [...new Set((data.allRecords || []).map(record => record.theme).filter(Boolean))];
        setAvailableThemes(themes.sort());
        
        // Preparar dados para o gráfico
        prepareChartData(data.userStats || []);
      } else {
        console.error('Erro ao buscar estatísticas de usuários');
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de usuários:', error);
    } finally {
      setLoading(false);
    }
  };



  const prepareChartData = (stats) => {
    // Pegar os top 10 usuários com mais acessos
    const topUsers = stats
      .filter(user => user.totalAccesses > 0)
      .slice(0, 10);

    setChartData({
      labels: topUsers.map(user => user.name),
      datasets: [
        {
          label: 'Total de Acessos',
          data: topUsers.map(user => user.totalAccesses),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
        },
        {
          label: 'Acessos no Mês',
          data: topUsers.map(user => user.monthlyAccesses),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
        },
      ],
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortedUsers = () => {
    return [...userStats].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const formatLastAccess = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Função para aplicar filtros
  const applyFilters = () => {
    let filtered = [...allRecords];

    // Filtro por data
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at || record.date);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end ? new Date(dateFilter.end) : null;

        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }

    // Filtro por tema
    if (themeFilter) {
      filtered = filtered.filter(record => 
        record.theme && record.theme.toLowerCase().includes(themeFilter.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  // Função para preparar dados do gráfico filtrado
  const prepareFilteredChartData = (records) => {
    if (!records || records.length === 0) {
      setFilteredChartData(null);
      return;
    }

    // Agrupar por tema
    const themeGroups = records.reduce((acc, record) => {
      const theme = record.theme || 'Sem tema';
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {});

    // Agrupar por data (últimos 30 dias)
    const dateGroups = {};
    const today = new Date();
    
    // Inicializar últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('pt-BR');
      dateGroups[dateKey] = 0;
    }

    // Contar registros por data
    records.forEach(record => {
      const recordDate = new Date(record.created_at || record.date);
      const dateKey = recordDate.toLocaleDateString('pt-BR');
      if (dateGroups.hasOwnProperty(dateKey)) {
        dateGroups[dateKey]++;
      }
    });

    const themeColors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)'
    ];

    const chartData = {
      labels: Object.keys(themeGroups),
      datasets: [{
        label: 'Acessos por Tema',
        data: Object.values(themeGroups),
        backgroundColor: themeColors,
        borderColor: themeColors,
        borderWidth: 0
      }]
    };

    setFilteredChartData(chartData);
  };

  // useEffect para aplicar filtros quando mudarem
  useEffect(() => {
    applyFilters();
  }, [dateFilter, themeFilter, allRecords]);

  // useEffect para atualizar gráfico quando registros filtrados mudarem
  useEffect(() => {
    prepareFilteredChartData(filteredRecords);
  }, [filteredRecords]);

  // Função para exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Relatório de Acessos Remotos', 14, 22);
    
    // Informações do filtro
    doc.setFontSize(10);
    let yPos = 35;
    
    if (dateFilter.start || dateFilter.end) {
      const startDate = dateFilter.start ? new Date(dateFilter.start).toLocaleDateString('pt-BR') : 'Início';
      const endDate = dateFilter.end ? new Date(dateFilter.end).toLocaleDateString('pt-BR') : 'Fim';
      doc.text(`Período: ${startDate} até ${endDate}`, 14, yPos);
      yPos += 7;
    }
    
    if (themeFilter) {
      doc.text(`Tema: ${themeFilter}`, 14, yPos);
      yPos += 7;
    }
    
    doc.text(`Total de registros: ${filteredRecords.length}`, 14, yPos);
    yPos += 10;
    
    // Preparar dados da tabela
    const tableData = filteredRecords.map(record => {
      const dateTime = formatDateTime(record.created_at);
      return [
        record.date || dateTime.date,
        record.time || dateTime.time,
        record.name || '-',
        record.ticket_number || '-',
        record.theme || '-',
        (record.description && record.description.length > 50 
          ? `${record.description.substring(0, 50)}...` 
          : record.description || '-')
      ];
    });
    
    // Adicionar tabela
    doc.autoTable({
      head: [['Data', 'Hora', 'Nome', 'Chamado', 'Tema', 'Descrição']],
      body: tableData,
      startY: yPos,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [54, 162, 235],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 15 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 70 }
      }
    });
    
    // Salvar PDF
    const fileName = `acessos-remotos-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // Função para exportar para XLSX
  const exportToXLSX = () => {
    const exportData = filteredRecords.map(record => {
      const dateTime = formatDateTime(record.created_at);
      return {
        'Data': record.date || dateTime.date,
        'Hora': record.time || dateTime.time,
        'Nome': record.name || '',
        'Email': record.email || '',
        'Chamado': record.ticket_number || '',
        'Tema': record.theme || '',
        'Descrição': record.description || '',
        'Data/Hora Criação': record.created_at || ''
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Acessos Remotos');
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 8 },  // Hora
      { wch: 25 }, // Nome
      { wch: 30 }, // Email
      { wch: 15 }, // Chamado
      { wch: 20 }, // Tema
      { wch: 50 }, // Descrição
      { wch: 20 }  // Data/Hora Criação
    ];
    worksheet['!cols'] = colWidths;
    
    const fileName = `acessos-remotos-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Carregando estatísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <h3>Total de Usuários</h3>
          <div className={styles.statNumber}>{summary.totalUsers || 0}</div>
          <small>com permissão de acesso</small>
        </div>
        <div className={styles.statBox}>
          <h3>Usuários Ativos</h3>
          <div className={styles.statNumber}>{summary.activeUsers || 0}</div>
          <small>com pelo menos 1 acesso</small>
        </div>
        <div className={styles.statBox}>
          <h3>Total de Acessos</h3>
          <div className={styles.statNumber}>{summary.totalAccesses || 0}</div>
          <small>registrados no sistema</small>
        </div>
        <div className={styles.statBox}>
          <h3>Acessos no Mês</h3>
          <div className={styles.statNumber}>{summary.monthlyTotalAccesses || 0}</div>
          <small>no mês atual</small>
        </div>
      </div>

      {/* Abas para alternar entre Estatísticas e Registros */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <i className="fa-solid fa-chart-bar"></i>
          Estatísticas de Usuários
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'records' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <i className="fa-solid fa-table"></i>
          Todos os Registros ({allRecords.length})
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'stats' && (
        <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Dashboard de Usuários - Acessos Remotos</h2>
        </div>

           {/* Gráfico dos dados filtrados */}
           {filteredChartData && filteredRecords.length > 0 && (
             <div className={styles.chartContainer}>
               <div className={styles.chartHeader}>
                 <h3 className={styles.chartTitle}>
                   <i className="fas fa-chart-pie"></i>
                   Distribuição por Tema ({filteredRecords.length} registros)
                 </h3>
               </div>
               <div className={styles.chartWrapper}>
                 <Doughnut 
                   data={filteredChartData}
                   options={{
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                       legend: {
                         display: true,
                         position: 'right',
                         labels: {
                           usePointStyle: true,
                           padding: 20,
                           font: {
                             size: 12
                           }
                         }
                       },
                       tooltip: {
                         callbacks: {
                           label: function(context) {
                             const total = context.dataset.data.reduce((a, b) => a + b, 0);
                             const percentage = ((context.parsed * 100) / total).toFixed(1);
                             return `${context.label}: ${context.parsed} (${percentage}%)`;
                           }
                         }
                       }
                     }
                   }}
                 />
               </div>
             </div>
           )}
           
           <div className={styles.tableContainer}>
          <table className={styles.recordsTable}>
            <thead>
              <tr>
                <th 
                  className={`${styles.nameColumn} ${styles.sortable}`}
                  onClick={() => handleSort('name')}
                >
                  Nome 
                  {sortBy === 'name' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th className={styles.emailColumn}>Email</th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('totalAccesses')}
                >
                  Total de Acessos
                  {sortBy === 'totalAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('monthlyAccesses')}
                >
                  Acessos no Mês
                  {sortBy === 'monthlyAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th 
                  className={`${styles.numberColumn} ${styles.sortable}`}
                  onClick={() => handleSort('last30DaysAccesses')}
                >
                  Últimos 30 Dias
                  {sortBy === 'last30DaysAccesses' && (
                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th className={styles.dateColumn}>Último Acesso</th>
              </tr>
            </thead>
            <tbody>
              {getSortedUsers().length > 0 ? (
                getSortedUsers().map((user, index) => (
                  <tr key={user.id || index} className={styles.tableRow}>
                    <td className={styles.nameCell}>
                      <div className={styles.userInfo}>
                        <strong>{user.name}</strong>
                        {user.totalAccesses === 0 && (
                          <span className={styles.inactiveTag}>Inativo</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.emailCell}>{user.email}</td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.totalAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.totalAccesses}
                      </span>
                    </td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.monthlyAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.monthlyAccesses}
                      </span>
                    </td>
                    <td className={styles.numberCell}>
                      <span className={`${styles.accessCount} ${user.last30DaysAccesses > 0 ? styles.active : styles.inactive}`}>
                        {user.last30DaysAccesses}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      <span className={user.lastAccess ? styles.hasAccess : styles.noAccess}>
                        {formatLastAccess(user.lastAccess)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={styles.noRecordsMessage}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {/* Gráfico de Barras */}
          {chartData && chartData.labels.length > 0 && (
            <div className={styles.cardContainer}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Top 10 Usuários - Acessos Remotos</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                <Bar 
                  data={chartData} 
                  options={{ 
                    responsive: true, 
                    animation: { duration: 1000 },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top'
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false
                      }
                    },
                    scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Usuários'
                        }
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        },
                        title: {
                          display: true,
                          text: 'Quantidade de Acessos'
                        }
                      }
                    },
                    interaction: {
                      mode: 'nearest',
                      axis: 'x',
                      intersect: false
                    }
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div className={styles.cardContainer}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Todos os Registros de Acesso Remoto</h2>
          </div>

          {/* Filtros */}
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Período:</label>
              <div className={styles.dateFilters}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  placeholder="Data início"
                />
                <span className={styles.dateSeparator}>até</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  placeholder="Data fim"
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tema:</label>
              <select
                className={styles.themeSelect}
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
              >
                <option value="">Todos os temas</option>
                {availableThemes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>

            {(dateFilter.start || dateFilter.end || themeFilter) && (
              <div className={styles.filterGroup}>
                 <button
                   className={styles.clearFiltersBtn}
                   onClick={() => {
                     setDateFilter({ start: '', end: '' });
                     setThemeFilter('');
                   }}
                 >
                   <i className="fas fa-times"></i>
                   Limpar Filtros
                 </button>
               </div>
            )}

             <div className={styles.filterGroup}>
               <label className={styles.filterLabel}>Exportar:</label>
               <div className={styles.exportButtons}>
                 <button
                   className={styles.exportBtn}
                   onClick={exportToPDF}
                   disabled={filteredRecords.length === 0}
                 >
                   <i className="fas fa-file-pdf"></i>
                   PDF
                 </button>
                 <button
                   className={styles.exportBtn}
                   onClick={exportToXLSX}
                   disabled={filteredRecords.length === 0}
                 >
                   <i className="fas fa-file-excel"></i>
                   XLSX
                 </button>
               </div>
             </div>
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
                </tr>
              </thead>
              <tbody>
                 {filteredRecords.length > 0 ? (
                   filteredRecords.map((record, index) => {
                     const dateTime = formatDateTime(record.created_at);
                     return (
                       <tr 
                         key={record.id || index} 
                         className={`${styles.tableRow} ${styles.clickableRow}`}
                         onClick={() => {
                           setSelectedRecord(record);
                           setShowModal(true);
                         }}
                       >
                         <td className={styles.dateColumn}>{record.date || dateTime.date}</td>
                         <td className={styles.timeColumn}>{record.time || dateTime.time}</td>
                         <td className={styles.nameColumn}>{record.name}</td>
                         <td className={styles.ticketColumn}>{record.ticket_number}</td>
                         <td className={styles.themeColumn}>{record.theme}</td>
                         <td className={styles.descriptionColumn}>
                           {record.description && record.description.length > 100 
                             ? `${record.description.substring(0, 100)}...` 
                             : record.description || '-'
                           }
                         </td>
                       </tr>
                     );
                   })
                 ) : (
                   <tr>
                     <td colSpan="6" className={styles.noRecords}>
                       Nenhum registro encontrado com os filtros aplicados
                     </td>
                   </tr>
                 )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Registro */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="md"
        fullWidth
        className={styles.detailsDialog}
        PaperProps={{
          className: styles.dialogPaper
        }}
      >
        <div className={styles.dialogTitle}>
          <div className={styles.dialogTitleContent}>
            <Typography variant="h6" className={styles.modalTitle}>
              <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
              Detalhes do Acesso Remoto
            </Typography>
            <IconButton
              onClick={() => setShowModal(false)}
              size="small"
              className={styles.modalCloseBtn}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </div>
        
        <DialogContent className={styles.dialogContent}>
          {selectedRecord && (
            <>
              <div className={styles.modalSection}>
                <div className={styles.sectionTitleWrapper}>
                  <i className="fas fa-user" style={{ color: 'var(--color-primary)', marginRight: '8px' }}></i>
                  <Typography variant="h6" className={styles.sectionTitle}>
                    Informações do Usuário
                  </Typography>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Nome:</span>
                    <span className={styles.infoValue}>{selectedRecord.name || '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{selectedRecord.email || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.sectionTitleWrapper}>
                  <i className="fas fa-ticket-alt" style={{ color: 'var(--color-primary)', marginRight: '8px' }}></i>
                  <Typography variant="h6" className={styles.sectionTitle}>
                    Informações do Chamado
                  </Typography>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Número do Chamado:</span>
                    <span className={styles.infoValue}>{selectedRecord.ticket_number || '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Tema:</span>
                    <span className={styles.infoValue}>{selectedRecord.theme || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.sectionTitleWrapper}>
                  <i className="fas fa-calendar-alt" style={{ color: 'var(--color-primary)', marginRight: '8px' }}></i>
                  <Typography variant="h6" className={styles.sectionTitle}>
                    Data e Hora
                  </Typography>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Data:</span>
                    <span className={styles.infoValue}>
                      {selectedRecord.date || formatDateTime(selectedRecord.created_at).date}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Hora:</span>
                    <span className={styles.infoValue}>
                      {selectedRecord.time || formatDateTime(selectedRecord.created_at).time}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.sectionTitleWrapper}>
                  <i className="fas fa-file-text" style={{ color: 'var(--color-primary)', marginRight: '8px' }}></i>
                  <Typography variant="h6" className={styles.sectionTitle}>
                    Descrição
                  </Typography>
                </div>
                <div className={styles.solutionBox}>
                  <Typography className={styles.dialogText}>
                    {selectedRecord.description || 'Nenhuma descrição fornecida.'}
                  </Typography>
                </div>
              </div>
            </>
          )}
        </DialogContent>

        <DialogActions className={styles.dialogActions}>
          <Button
            onClick={() => setShowModal(false)}
            variant="contained"
            className={styles.btnContained}
            startIcon={<CloseIcon />}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
