import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSearch } from '@fortawesome/free-solid-svg-icons';
import styles from '../../../styles/Remote.module.css';

export default function MyAccessRecords({ user }) {
  const [userRecords, setUserRecords] = useState([]);
  const [userMonthTotal, setUserMonthTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);

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
        Swal.fire('Erro', 'Erro ao buscar registros do usuário.', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar registros do usuário:', error);
      Swal.fire('Erro', 'Erro ao buscar registros do usuário. Tente novamente.', 'error');
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
    Swal.fire({
      title: `<div class="modal-title">${theme || 'Detalhes do Registro'}</div>`,
      html: `
        <div class="modal-content">
          <div class="modal-info-row">
            <span class="modal-label">Data:</span>
            <span class="modal-value">${date || 'N/A'}</span>
          </div>
          <div class="modal-info-row">
            <span class="modal-label">Hora:</span>
            <span class="modal-value">${time || 'N/A'}</span>
          </div>
          <div class="modal-info-row">
            <span class="modal-label">Chamado:</span>
            <span class="modal-value">${ticket || 'N/A'}</span>
          </div>
          <div class="modal-description">
            <div class="modal-label">Descrição:</div>
            <div class="modal-description-text">${description || 'Sem descrição disponível'}</div>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'custom-modal-popup',
        title: 'custom-modal-title',
        content: 'custom-modal-content',
        closeButton: 'custom-modal-close'
      }
    });
  };

  return (
    <>
      {/* Contadores de Performance */}
      <div className={styles.performanceWrapper}>
        <div className={styles.performanceContainer}>
          <h2>Acessos no Mês Atual</h2>
          <span className={styles.totalCount}>{userMonthTotal}</span>
        </div>
        <div className={styles.performanceContainer}>
          <h2>Acessos Realizados</h2>
          <span className={styles.totalCount}>{userTotal}</span>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className={`${styles.cardContainer} ${styles.dashboard}`}>
        <div className={styles.cardHeaderColumn}>
          <h2 className={styles.cardTitle}>Meus Acessos</h2>
          
          {/* Campo de busca */}
          <div className={styles.searchContainer}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
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
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id || index} className={styles.tableRow}>
                    <td className={styles.dateColumn}>{formatDateToBR(record.date)}</td>
                    <td className={styles.timeColumn}>{record.time}</td>
                    <td className={styles.nameColumn}>{record.name}</td>
                    <td className={styles.ticketColumn}>{record.ticket_number}</td>
                    <td className={styles.themeColumn}>{record.theme}</td>
                    <td className={styles.descriptionColumn}>
                      <div className={styles.descriptionWithIcon}>
                        <span className={styles.truncatedText}>
                          {record.description?.length > 30 
                            ? `${record.description.substring(0, 30)}...` 
                            : record.description || 'N/A'}
                        </span>
                        {record.description && record.description.length > 30 && (
                          <button 
                            className={styles.seeMoreButton}
                            onClick={() => handleDescriptionClick(
                              record.description, 
                              record.theme,
                              record.date,
                              record.time,
                              record.ticket_number
                            )}
                          >
                            Ver mais
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={styles.noRecordsMessage}>
                    {searchTerm.trim() === '' 
                      ? 'Nenhum acesso registrado ainda.' 
                      : `Nenhum registro encontrado para "${searchTerm}".`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS customizado para o modal */}
      <style jsx global>{`
        .custom-modal-popup {
          border-radius: 12px !important;
          padding: 0 !important;
          max-width: 600px !important;
          background: var(--bg-color) !important;
          color: var(--text-color) !important;
        }
        
        .custom-modal-title {
          background: var(--color-primary) !important;
          color: white !important;
          margin: 0 !important;
          padding: 20px !important;
          border-radius: 12px 12px 0 0 !important;
          font-size: 1.2em !important;
          font-weight: 600 !important;
        }
        
        .custom-modal-content {
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .custom-modal-close {
          color: white !important;
          font-size: 1.5em !important;
          background: none !important;
          border: none !important;
        }
        
        .modal-content {
          padding: 25px;
          background: var(--bg-color);
          color: var(--text-color);
        }
        
        .modal-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 8px;
        }
        
        .modal-label {
          font-weight: 600;
          color: var(--text-color);
          min-width: 80px;
        }
        
        .modal-value {
          color: var(--text-color2);
          text-align: right;
          flex: 1;
        }
        
        .modal-description {
          margin-top: 20px;
        }
        
        .modal-description .modal-label {
          display: block;
          margin-bottom: 10px;
          font-size: 1.1em;
        }
        
        .modal-description-text {
          background: var(--labels-bg);
          padding: 15px;
          border-radius: 8px;
          line-height: 1.6;
          color: var(--text-color);
          border: 1px solid var(--color-border);
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </>
  );
} 