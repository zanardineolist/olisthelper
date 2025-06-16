import { useEffect, useState } from 'react';
import styles from '../styles/Remote.module.css';

export default function MyAccessRecords({ user }) {
  const [userRecords, setUserRecords] = useState([]);
  const [userMonthTotal, setUserMonthTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    loadUserRecords();
  }, []);

  useEffect(() => {
    // Filtrar registros quando o termo de busca mudar
    if (searchTerm.trim() === '') {
      setFilteredRecords(userRecords);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = userRecords.filter(item => {
        return (
          (item.ticket_number && item.ticket_number.toLowerCase().includes(lowercasedFilter)) ||
          (item.theme && item.theme.toLowerCase().includes(lowercasedFilter)) ||
          (item.description && item.description.toLowerCase().includes(lowercasedFilter))
        );
      });
      setFilteredRecords(filtered);
    }
  }, [searchTerm, userRecords]);

  const loadUserRecords = async () => {
    try {
      const response = await fetch(`/api/get-remote-records?userEmail=${encodeURIComponent(user.email)}&filterByMonth=true`);
      if (response.ok) {
        const data = await response.json();
        // Ordene os registros por data, do mais recente para o mais antigo
        const sortedRecords = data.allRecords.sort((a, b) => {
          // Converte as datas do formato DD/MM/YYYY para objetos Date para comparação
          const partsA = a.date.split('/');
          const partsB = b.date.split('/');
          // Data no formato MM/DD/YYYY para o objeto Date
          const dateA = new Date(`${partsA[1]}/${partsA[0]}/${partsA[2]}`);
          const dateB = new Date(`${partsB[1]}/${partsB[0]}/${partsB[2]}`);
          return dateB - dateA; // Ordenação decrescente
        });
        
        setUserRecords(sortedRecords);
        setFilteredRecords(sortedRecords);
        setUserMonthTotal(data.monthRecords.length);
        setUserTotal(data.allRecords.length);
      } else {
        console.error('Erro ao buscar registros do usuário');
      }
    } catch (error) {
      console.error('Erro ao buscar registros do usuário:', error);
    }
  };

  // Formatar data de DD/MM/YYYY para DD/MM/YYYY (já está no formato correto, mas garantimos consistência)
  const formatDateToBR = (dateStr) => {
    if (!dateStr) return '';
    
    // Se a data já estiver no formato DD/MM/YYYY, apenas retornamos
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Se estiver em outro formato, convertemos
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const handleDescriptionClick = (description, theme, date, time, ticket) => {
    setModalTitle(`${theme || 'Detalhes do Registro'} - ${ticket || 'N/A'}`);
    setModalContent({
      description: description || 'Sem descrição disponível',
      date: date || 'N/A',
      time: time || 'N/A',
      ticket: ticket || 'N/A'
    });
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
          <div className={styles.statNumber}>{userMonthTotal}</div>
        </div>
        <div className={styles.statBox}>
          <h3>Acessos Realizados</h3>
          <div className={styles.statNumber}>{userTotal}</div>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Meus Acessos</h2>
          
          {/* Campo de busca */}
          <div className={styles.searchContainer}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-color2)', fontSize: '1rem' }}></i>
            <input
              type="text"
              placeholder="Buscar por chamado, tema ou descrição..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                <th className={styles.actionsColumn}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id || index} className={styles.tableRow}>
                    <td>{formatDateToBR(record.date)}</td>
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
                          onClick={() => handleDescriptionClick(
                            record.description, 
                            record.theme,
                            record.date,
                            record.time,
                            record.ticket_number
                          )}
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
                    {searchTerm ? 'Nenhum registro encontrado para a busca.' : 'Nenhum registro encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              {modalContent && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                      <strong style={{ width: '80px', color: 'var(--color-primary)' }}>Data:</strong>
                      <span>{modalContent.date}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                      <strong style={{ width: '80px', color: 'var(--color-primary)' }}>Hora:</strong>
                      <span>{modalContent.time}</span>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '1rem' }}>
                      <strong style={{ width: '80px', color: 'var(--color-primary)' }}>Chamado:</strong>
                      <span>{modalContent.ticket}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '0.5rem' }}>Descrição:</strong>
                    <div style={{ 
                      backgroundColor: 'var(--labels-bg)', 
                      padding: '1rem', 
                      borderRadius: '6px', 
                      border: '1px solid var(--color-border)',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-line'
                    }}>
                      {modalContent.description}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
