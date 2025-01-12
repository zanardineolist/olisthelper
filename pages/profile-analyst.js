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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Efeito para definir saudação
  useEffect(() => {
    try {
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentHour = new Date(brtDate).getHours();
      
      const greetingMessage = currentHour >= 5 && currentHour < 12 
        ? 'Bom dia'
        : currentHour >= 12 && currentHour < 18 
          ? 'Boa tarde' 
          : 'Boa noite';

      setGreeting(greetingMessage);
      setInitialLoading(false);
    } catch (error) {
      console.error('Erro ao definir saudação:', error);
      setGreeting('Olá');
      setInitialLoading(false);
    }
  }, []);

  // Efeito para buscar dados
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      console.log('ID do usuário logado:', user.id); // Log para debug
      
      try {
        // Buscar dados de ajudas prestadas
        const helpResponse = await fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile`);
        const helpData = await helpResponse.json();
  
        console.log('Resposta dos registros:', helpData); // Log para debug
  
        if (!helpResponse.ok) {
          throw new Error(helpData.error || 'Erro ao buscar dados de ajudas');
        }
  
        setHelpRequests({
          currentMonth: helpData.currentMonth || 0,
          lastMonth: helpData.lastMonth || 0,
        });
  
        // Buscar ranking de categorias
        const categoryResponse = await fetch(`/api/get-category-ranking?analystId=${user.id}`);
        const categoryData = await categoryResponse.json();
  
        console.log('Resposta das categorias:', categoryData); // Log para debug
  
        if (!categoryResponse.ok) {
          throw new Error(categoryData.error || 'Erro ao buscar ranking de categorias');
        }
  
        setCategoryRanking(categoryData.categories || []);
  
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [user?.id]);

  // Renderização do loader inicial
  if (initialLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  // Cálculos para exibição
  const firstName = user.name?.split(' ')[0] || 'Usuário';
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

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Container para Dados de Perfil e Ajudas Prestadas */}
        <div className={styles.profileAndHelpContainer}>
          <div className={styles.profileContainer}>
            <img 
              src={user.image || '/default-avatar.png'} 
              alt={user.name} 
              className={styles.profileImage}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-avatar.png';
              }}
            />
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

        {/* Container para Ranking de Categorias */}
        <div className={styles.categoryRanking}>
          <h3>Top 10 - Temas mais auxiliados</h3>
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
                      width: `${Math.min(category.count * 10, 300)}px`, // Limitando o tamanho máximo
                      backgroundColor: category.alertThreshold ? 'orange' : '',
                    }}
                  />
                  <span className={styles.count}>
                    {category.count} pedidos de ajuda
                    {category.alertThreshold && (
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