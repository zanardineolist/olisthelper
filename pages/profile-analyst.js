import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';

export default function AnalystProfilePage({ user }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [records, setRecords] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true); // Estado para carregamento inicial da página
  const [loading, setLoading] = useState(true); // Estado para carregamento dos dados

  useEffect(() => {
    // Simulando um pequeno atraso para exibir o loader inicial da página
    setTimeout(() => {
      // Definir saudação com base na hora do dia
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentHour = new Date(brtDate).getHours();
      let greetingMessage = '';

      if (currentHour >= 5 && currentHour < 12) {
        greetingMessage = 'Bom dia';
      } else if (currentHour >= 12 && currentHour < 18) {
        greetingMessage = 'Boa tarde';
      } else {
        greetingMessage = 'Boa noite';
      }

      setGreeting(greetingMessage);
      setInitialLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Utilizar o endpoint otimizado para buscar todos os dados de suporte e de analista
        const supportDataResponse = await fetch(
          `/api/getSupportData?userEmail=${user.email}&include=ranking,helpRequests`
        );

        const analystDataResponse = await fetch(
          `/api/getAnalystData?analystId=${user.id}&dataType=performance,records`
        );

        if (!supportDataResponse.ok || !analystDataResponse.ok) {
          throw new Error('Erro ao buscar dados do analista.');
        }

        const supportData = await supportDataResponse.json();
        const analystData = await analystDataResponse.json();

        // Ajudas Solicitadas
        if (supportData.helpRequests) {
          setHelpRequests({
            currentMonth: supportData.helpRequests.currentMonth,
            lastMonth: supportData.helpRequests.lastMonth,
          });
        }

        // Ranking de Categorias
        if (supportData.categoryRanking) {
          setCategoryRanking(supportData.categoryRanking.categories || []);
        }

        // Desempenho do Analista
        if (analystData.performance) {
          setPerformance(analystData.performance);
        }

        // Registros do Analista
        if (analystData.records) {
          setRecords(analystData.records.rows || []);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user.email]);

  if (initialLoading) {
    // Loader inicial da página
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0];
  const { currentMonth, lastMonth } = helpRequests;
  let percentageChange = 0;

  if (lastMonth > 0) {
    percentageChange = ((currentMonth - lastMonth) / lastMonth) * 100;
  }

  const arrowClass = percentageChange > 0 ? 'fa-circle-up' : 'fa-circle-down';
  const arrowColor = percentageChange > 0 ? 'red' : 'green';
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);

  return (
    <>
      <Head>
        <title>Meu Perfil - Analista</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <h1 className={styles.greeting}>Olá, {greeting} {firstName}!</h1>

        {/* Container para Dados de Perfil e Ajudas Solicitadas */}
        <div className={styles.profileAndHelpContainer}>
          <div className={styles.profileContainer}>
            <img src={user.image} alt={user.name} className={styles.profileImage} />
            <div className={styles.profileInfo}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          </div>
          <div className={styles.profileContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className="standardBoxLoader"></div>
              </div>
            ) : (
              <div className={styles.profileInfo}>
                <h2>Ajudas prestadas</h2>
                <div className={styles.helpRequestsInfo}>
                  <div className={styles.monthsInfo}>
                    <p><strong>Mês Atual:</strong> {currentMonth}</p>
                    <p><strong>Mês Anterior:</strong> {lastMonth}</p>
                  </div>
                  <div className={styles.percentageChange} style={{ color: arrowColor }}>
                    <i className={`fa-regular ${arrowClass}`} style={{ color: arrowColor }}></i>
                    <span>{formattedPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Container para Desempenho do Analista */}
        <div className={styles.performance}>
          <h3>Desempenho do Analista</h3>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="standardBoxLoader"></div>
            </div>
          ) : performance ? (
            <div className={styles.performanceDetails}>
              <p><strong>Total de Chamados:</strong> {performance.totalChamados}</p>
              <p><strong>Média por Dia:</strong> {performance.mediaPorDia}</p>
              <p><strong>TMA:</strong> {performance.tma}</p>
              <p><strong>CSAT:</strong> {performance.csat}</p>
            </div>
          ) : (
            <div className={styles.noData}>
              Nenhum dado de desempenho disponível no momento.
            </div>
          )}
        </div>

        {/* Container para Registros do Analista */}
        <div className={styles.records}>
          <h3>Registros Recentes</h3>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="standardBoxLoader"></div>
            </div>
          ) : records.length > 0 ? (
            <ul className={styles.list}>
              {records.map((record, index) => (
                <li key={index} className={styles.listItem}>
                  <span className={styles.recordDate}>{record.date}</span> - {record.details}
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.noData}>
              Nenhum registro disponível no momento.
            </div>
          )}
        </div>

        {/* Container para Ranking de Categorias */}
        <div className={styles.categoryRanking}>
          <h3>Top 10 - Temas de maior dúvida</h3>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="standardBoxLoader"></div>
            </div>
          ) : categoryRanking.length > 0 ? (
            <ul className={styles.list}>
              {categoryRanking.map((category, index) => (
                <li key={index} className={styles.listItem}>
                  <span className={styles.rank}>{index + 1}.</span>
                  <span className={styles.categoryName}>{category.name}</span>
                  <div
                    className={styles.progressBarCategory}
                    style={{
                      width: `${category.count * 10}px`,
                      backgroundColor: category.count > 50 ? 'orange' : '',
                    }}
                  />
                  <span className={styles.count}>
                    {category.count} pedidos de ajuda
                    {category.count > 50 && (
                      <div className="tooltip">
                        <i
                          className="fa-solid fa-circle-exclamation"
                          style={{ color: 'orange', cursor: 'pointer' }}
                          onClick={() => window.open('https://olisterp.wixsite.com/knowledge/inicio', '_blank')}
                        ></i>
                        <span className="tooltipText">
                          Você já ajudou neste tema mais de 50 vezes. Que tal criar um material sobre, e publicar em nosso knowledge?
                        </span>
                      </div>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.noData}>
              Nenhum dado disponível no momento.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
      },
    },
  };
}
