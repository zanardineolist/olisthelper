// pages/profile.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Profile.module.css';
import Footer from '../components/Footer';

export default function ProfilePage({ session }) {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [helpRequests, setHelpRequests] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);

        // Obter dados do perfil do usuário
        const userEmail = session.user.email;

        // Obter dados de desempenho do usuário (se for um usuário de suporte)
        if (session.role === 'support') {
          const performanceRes = await fetch(`/api/data/get-user-performance-data?userEmail=${userEmail}`);
          const performanceData = await performanceRes.json();
          setUserData(performanceData);
        }

        // Obter solicitações de ajuda do usuário
        const helpRequestsRes = await fetch(`/api/data/get-user-help-requests-data?userEmail=${userEmail}`);
        const helpRequestsData = await helpRequestsRes.json();
        setHelpRequests(helpRequestsData.helpRequests);

        // Obter ranking de categorias do usuário
        const categoryRankingRes = await fetch(`/api/data/get-user-category-ranking-data?userEmail=${userEmail}`);
        const categoryRankingData = await categoryRankingRes.json();
        setCategoryRanking(categoryRankingData.categories);

      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [session]);

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Perfil do Usuário</title>
      </Head>

      <div className={styles.container}>
        <nav className={commonStyles.navbar}>
          <div className={commonStyles.logo}>
            <img src="/images/logos/olist_helper_logo.png" alt="Olist Helper Logo" />
          </div>
          <button
            onClick={() => setMenuOpen((prevMenuOpen) => !prevMenuOpen)}
            className={commonStyles.menuToggle}
          >
            ☰
          </button>
        </nav>

        {menuOpen && (
          <div className={commonStyles.menu}>
            <button onClick={() => router.push('/profile')} className={commonStyles.menuButton}>
              Meu Perfil
            </button>
            <button onClick={() => router.push('/registro')} className={commonStyles.menuButton}>
              Registrar Ajuda
            </button>
            <button onClick={() => router.push('/dashboard-super')} className={commonStyles.menuButton}>
              Dashboard Supervisor
            </button>
            <a
              href="https://docs.google.com/spreadsheets/d/1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className={commonStyles.menuButton}
            >
              Database
            </a>
            <button onClick={() => signOut()} className={commonStyles.menuButton}>
              Logout
            </button>
          </div>
        )}

        <div className={styles.mainContent}>
          <h2>Perfil do Usuário</h2>

          {userData && session.role === 'support' && (
            <div className={styles.performanceSection}>
              <h3>Desempenho</h3>
              <p><strong>Nome:</strong> {userData.desempenho.nome}</p>
              <p><strong>Squad:</strong> {userData.desempenho.squad}</p>

              <h4>Chamados</h4>
              <p><strong>Total:</strong> {userData.desempenho.chamados.total}</p>
              <p><strong>Média por Dia:</strong> {userData.desempenho.chamados.mediaPorDia}</p>

              <h4>Telefone</h4>
              <p><strong>Total de Chamadas:</strong> {userData.desempenho.telefone.total}</p>
              <p><strong>TMA:</strong> {userData.desempenho.telefone.tma}</p>
              <p><strong>CSAT:</strong> {userData.desempenho.telefone.csat}</p>
              <p><strong>Chamadas Perdidas:</strong> {userData.desempenho.telefone.perdidas}</p>

              <h4>Chat</h4>
              <p><strong>Total de Chats:</strong> {userData.desempenho.chat.total}</p>
              <p><strong>TMA:</strong> {userData.desempenho.chat.tma}</p>
              <p><strong>CSAT:</strong> {userData.desempenho.chat.csat}</p>
            </div>
          )}

          <div className={styles.helpRequestsSection}>
            <h3>Solicitações de Ajuda</h3>
            {helpRequests.length > 0 ? (
              <ul>
                {helpRequests.map((request, index) => (
                  <li key={index}>
                    <strong>Data:</strong> {request.dateString} - <strong>Categoria:</strong> {request.category} - <strong>Descrição:</strong> {request.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma solicitação de ajuda encontrada.</p>
            )}
          </div>

          <div className={styles.categoryRankingSection}>
            <h3>Ranking de Categorias</h3>
            {categoryRanking.length > 0 ? (
              <ul>
                {categoryRanking.map((category, index) => (
                  <li key={index}>
                    <strong>Categoria:</strong> {category.name} - <strong>Ocorrências:</strong> {category.count}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma categoria encontrada.</p>
            )}
          </div>
        </div>

        <Footer />
      </div>
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
  return {
    props: { session },
  };
}
