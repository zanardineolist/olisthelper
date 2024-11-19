import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';
import { getUserFromSheet } from '../utils/googleSheets';

export default function AnalystProfilePage({ user }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
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
        // Buscar dados de ajudas solicitadas e ranking de categorias do analista logado
        const [helpResponse, categoryResponse] = await Promise.all([
          fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile`),
          fetch(`/api/get-category-ranking?analystId=${user.id}`)
        ]);

        if (!helpResponse.ok || !categoryResponse.ok) {
          throw new Error('Erro ao buscar dados do analista.');
        }

        // Ajudas Solicitadas
        const helpData = await helpResponse.json();
        setHelpRequests({
          currentMonth: helpData.currentMonth,
          lastMonth: helpData.lastMonth,
        });

        // Ranking de Categorias
        const categoryData = await categoryResponse.json();
        setCategoryRanking(categoryData.categories || []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user.id]);

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

  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Obter informações atualizadas do usuário do Google Sheets
  try {
    const userFromSheet = await getUserFromSheet(session.user.email);
    if (!userFromSheet || !['analyst', 'tax'].includes(userFromSheet[3])) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    // Atualizar as informações da sessão com os dados do Google Sheets
    session.user.role = userFromSheet[3];
    session.user.id = userFromSheet[0];
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
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
        role: session.user.role,
        id: session.user.id,
      },
    },
  };
}
