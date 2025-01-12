import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Navbar from '../components/Navbar';
import styles from '../styles/MyPage.module.css';
import Footer from '../components/Footer';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';

export default function AnalystProfilePage({ user }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Efeito para configurar saudação inicial e loader
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

  // Efeito para buscar dados do analista
  // Part of profile-analyst.js that needs fixing
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.error('ID do usuário não disponível');
        throw new Error('ID do usuário não disponível');
      }

      const tableName = `analyst_${user.id}`;

      // Definir períodos
      const now = dayjs();
      const currentMonthStart = now.startOf('month').format('YYYY-MM-DD');
      const currentMonthEnd = now.endOf('month').format('YYYY-MM-DD');
      const lastMonthStart = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      const lastMonthEnd = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

      // Buscar dados em paralelo da tabela específica do analista
      const [currentMonthData, lastMonthData, categoryData] = await Promise.all([
        // Dados do mês atual
        supabase
          .from(tableName)
          .select('*')
          .gte('date', currentMonthStart)
          .lte('date', currentMonthEnd),
          
        // Dados do mês anterior
        supabase
          .from(tableName)
          .select('*')
          .gte('date', lastMonthStart)
          .lte('date', lastMonthEnd),

        // Dados para ranking de categorias
        supabase
          .from(tableName)
          .select('category, user_name, user_email')
          .gte('date', currentMonthStart)
          .lte('date', currentMonthEnd)
      ]);

      // Verificar erros
      if (currentMonthData.error) throw new Error(`Erro mês atual: ${currentMonthData.error.message}`);
      if (lastMonthData.error) throw new Error(`Erro mês anterior: ${lastMonthData.error.message}`);
      if (categoryData.error) throw new Error(`Erro categorias: ${categoryData.error.message}`);

      // Atualizar contadores de ajuda
      setHelpRequests({
        currentMonth: currentMonthData.data.length,
        lastMonth: lastMonthData.data.length
      });

      // Processar ranking de categorias
      const categoryCount = categoryData.data.reduce((acc, record) => {
        const category = record.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = {
            count: 0,
            users: new Set()
          };
        }
        acc[category].count++;
        acc[category].users.add(record.user_email);
        return acc;
      }, {});

      // Formatar e ordenar ranking
      const ranking = Object.entries(categoryCount)
        .map(([name, data]) => ({
          name,
          count: data.count,
          uniqueUsers: data.users.size
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setCategoryRanking(ranking);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao carregar dados',
        text: 'Não foi possível carregar os dados do perfil.'
      });
      setHelpRequests({ currentMonth: 0, lastMonth: 0 });
      setCategoryRanking([]);
    } finally {
      setLoading(false);
    }
  };

  if (user?.id) {
    fetchData();
  }
}, [user?.id]);

  // Loader inicial
  if (initialLoading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  // Cálculos para exibição
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

        {/* Container para Dados de Perfil e Ajudas Prestadas */}
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
        name: session.user?.name || 'Unknown',
        email: session.user?.email || '',
        image: session.user?.image || ''
      },
    },
  };
}