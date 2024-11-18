import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/Remote.module.css';

export default function AllAccessRecords({ user, currentTab }) {
  const [allRecords, setAllRecords] = useState([]);
  const [allMonthTotal, setAllMonthTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Função para carregar todos os registros
  const loadAllRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await fetch('/api/get-remote-records');
      if (response.ok) {
        const data = await response.json();
        setAllRecords(data.allRecords);
        setAllMonthTotal(data.monthRecords ? data.monthRecords.length : 0);
        setAllTotal(data.allRecords.length);
      } else {
        Swal.fire('Erro', 'Erro ao buscar todos os registros.', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar todos os registros:', error);
      Swal.fire('Erro', 'Erro ao buscar todos os registros. Tente novamente.', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (currentTab === 2) {
      loadAllRecords();
    }
  }, [currentTab]);

  useEffect(() => {
    loadAllRecords();
  }, []);

  if (loadingRecords) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className={styles.performanceWrapper}>
      <div className={styles.performanceContainer}>
        <h2>Acessos no Mês Atual</h2>
        <span className={styles.totalCount}>{allMonthTotal}</span>
      </div>
      <div className={styles.performanceContainer}>
        <h2>Acessos Realizados</h2>
        <span className={styles.totalCount}>{allTotal}</span>
      </div>

      <div className={`${styles.cardContainer} ${styles.dashboard}`}>
        <h2 className={styles.cardTitle}>Acessos Realizados</h2>
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
              {allRecords.map((record, index) => (
                <tr key={index}>
                  <td>{record[0]}</td>
                  <td>{record[1]}</td>
                  <td>{record[2]}</td>
                  <td>{record[4]}</td>
                  <td>{record[5]}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px' }}>
                        {record[6].length > 20 ? `${record[6].substring(0, 20)}...` : record[6]}
                      </span>
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className={styles.infoIcon}
                        onClick={() => handleDescriptionClick(record[6])}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
