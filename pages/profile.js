// pages/profile.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';

export default function MyPage({ user }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
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
        const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
          fetch(`/api/get-user-help-requests?userEmail=${user.email}`),
          fetch(`/api/get-user-category-ranking?userEmail=${user.email}`),
          (user.role === 'support' || user.role === 'support+') ? fetch(`/api/get-user-performance?userEmail=${user.email}`) : Promise.resolve({ json: () => null })
        ]);
  
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });
  
        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);
  
        if (user.role === 'support' || user.role === 'support+') {
          const performanceData = await performanceResponse.json();
          setPerformanceData(performanceData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };
  
    if (user?.email) {
      fetchData();
    }
  }, [user.email, user.role]);  

  if (initialLoading) {
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

  // O código permanece o mesmo até o return

  return (
    <>
      <Head>
        <title>Meus Dados</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <h1 className={styles.greeting}>{greeting}, {firstName}!</h1>

        <div className={styles.profileAndHelpContainer}>
          {/* Lado Esquerdo - Perfil e Métricas */}
          <div className={styles.leftSide}>
            {/* Card de Perfil */}
            <div className={styles.profileContainer}>
              <img src={user.image} alt={user.name} className={styles.profileImage} />
              <div className={styles.profileInfo}>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <div className={styles.tagsContainer}>
                  {performanceData?.squad && (
                    <div className={styles.tag} style={{ backgroundColor: '#0A4EE4' }}>
                      #{performanceData.squad}
                    </div>
                  )}
                  {performanceData?.chamado && (
                    <div className={styles.tag} style={{ backgroundColor: '#F0A028' }}>
                      #Chamado
                    </div>
                  )}
                  {performanceData?.telefone && (
                    <div className={styles.tag} style={{ backgroundColor: '#E64E36' }}>
                      #Telefone
                    </div>
                  )}
                  {performanceData?.chat && (
                    <div className={styles.tag} style={{ backgroundColor: '#779E3D' }}>
                      #Chat
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Métricas de Trabalho */}
            <div className={styles.workMetricsContainer}>
              <div className={styles.workMetric}>
                <h3>Dias Trabalhados</h3>
                <div className={styles.metricContent}>
                  <span className={styles.metricValue}>{performanceData?.diasTrabalhados || 0}</span>
                  <span className={styles.metricSubtext}>/ {performanceData?.diasUteis || 0} dias úteis</span>
                </div>
              </div>
              <div className={styles.workMetric}>
                <h3>Absenteísmo</h3>
                <div className={styles.metricContent}>
                  <span className={styles.metricValue}>{performanceData?.absenteismo || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito - Ajudas Solicitadas */}
          <div className={styles.rightSide}>
            <div className={styles.helpRequestsContainer}>
              <h2>Ajudas Solicitadas</h2>
              <div className={styles.helpRequestsContent}>
                <div className={styles.monthsInfo}>
                  <div className={styles.monthMetric}>
                    <span className={styles.monthLabel}>Mês Atual:</span>
                    <span className={styles.monthValue}>{currentMonth}</span>
                  </div>
                  <div className={styles.monthMetric}>
                    <span className={styles.monthLabel}>Mês Anterior:</span>
                    <span className={styles.monthValue}>{lastMonth}</span>
                  </div>
                </div>
                <div className={styles.percentageContainer}>
                  <div className={styles.percentageChange} style={{ color: arrowColor }}>
                    <i className={`fa-regular ${arrowClass}`}></i>
                    <span>{formattedPercentage}%</span>
                  </div>
                  <span className={styles.percentageLabel}>Variação</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Performance */}
        <div className={styles.performanceWrapper}>
          {performanceData?.chamados && (
            <div className={styles.performanceContainer}>
              <h2>Indicadores Chamados</h2>
              <p className={styles.lastUpdated}>Período: {performanceData?.atualizadoAte || "Data não disponível"}</p>
              <div className={styles.performanceInfo}>
                <div className={styles.performanceItem}>
                  <span>Total Chamados</span>
                  <span>{performanceData.chamados.totalChamados}</span>
                </div>
                <div className={styles.performanceItem}>
                  <span>Média/Dia</span>
                  <span>{performanceData.chamados.mediaPorDia}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.tma || 'transparent' }}>
                  <span>TMA</span>
                  <span>{performanceData.chamados.tma}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.csat || 'transparent' }}>
                  <span>CSAT</span>
                  <span>{performanceData.chamados.csat}</span>
                </div>
              </div>
            </div>
          )}

          {performanceData?.telefone && (
            <div className={styles.performanceContainer}>
              <h2>Indicadores Telefone</h2>
              <p className={styles.lastUpdated}>Período: {performanceData?.atualizadoAte || "Data não disponível"}</p>
              <div className={styles.performanceInfo}>
                <div className={styles.performanceItem}>
                  <span>Total Telefone</span>
                  <span>{performanceData.telefone.totalTelefone}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.tma || 'transparent' }}>
                  <span>TMA</span>
                  <span>{performanceData.telefone.tma}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.csat || 'transparent' }}>
                  <span>CSAT</span>
                  <span>{performanceData.telefone.csat}</span>
                </div>
                <div className={styles.performanceItem}>
                  <span>Perdidas</span>
                  <span>{performanceData.telefone.perdidas}</span>
                </div>
              </div>
            </div>
          )}

          {performanceData?.chat && (
            <div className={styles.performanceContainer}>
              <h2>Indicadores Chat</h2>
              <p className={styles.lastUpdated}>Período: {performanceData?.atualizadoAte || "Data não disponível"}</p>
              <div className={styles.performanceInfo}>
                <div className={styles.performanceItem}>
                  <span>Total Chats</span>
                  <span>{performanceData.chat.totalChats}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.tma || 'transparent' }}>
                  <span>TMA</span>
                  <span>{performanceData.chat.tma}</span>
                </div>
                <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.csat || 'transparent' }}>
                  <span>CSAT</span>
                  <span>{performanceData.chat.csat}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ranking de Categorias */}
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
                      width: `${Math.min((category.count / 20) * 100, 100)}%`,
                      backgroundColor: category.count > 10 ? '#F0A028' : '',
                    }}
                  />
                  <span className={styles.count}>
                    {category.count} pedidos de ajuda
                    {category.count > 10 && (
                      <div className="tooltip">
                        <i
                          className="fa-solid fa-circle-exclamation"
                          style={{ color: '#F0A028', cursor: 'pointer' }}
                          onClick={() => window.open('https://forms.clickup.com/30949570/f/xgg62-18893/6O57E8S7WVNULVS5HO', '_blank')}
                        ></i>
                        <span className="tooltipText">
                          Você já pediu ajuda para este tema mais de 10 vezes. Que tal agendar um Tiny Class com nossos analistas? Clique no ícone.
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
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  // Redirecionar usuários com perfil 'quality' para a página dashboard-quality
  if (session.role === 'quality') {
    return {
      redirect: {
        destination: '/dashboard-quality',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
      },
    },
  };
}
