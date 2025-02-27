import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/Remote.module.css';

export default function MyAccessRecords({ user }) {
  const [userRecords, setUserRecords] = useState([]);
  const [userMonthTotal, setUserMonthTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);

  useEffect(() => {
    loadUserRecords();
  }, []);

  const loadUserRecords = async () => {
    try {
      const response = await fetch(`/api/get-remote-records?userEmail=${encodeURIComponent(user.email)}&filterByMonth=true`);
      if (response.ok) {
        const data = await response.json();
        setUserRecords(data.allRecords);
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

  const handleDescriptionClick = (description) => {
    Swal.fire({
      title: 'Descrição Completa',
      text: description,
      icon: 'info',
      confirmButtonText: 'Fechar',
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
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Meus Acessos</h2>
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
              {userRecords.length > 0 ? (
                userRecords.map((record, index) => (
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
    </>
  );
}
