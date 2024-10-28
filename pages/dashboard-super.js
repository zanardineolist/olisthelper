// pages/dashboard-super.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/DashboardSuper.module.css';
import Footer from '../components/Footer';

export default function DashboardSuperPage({ session }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersRes = await fetch('/api/data/get-support-users-data');
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleUserSelection = async (user) => {
    setSelectedUser(user);
    try {
      setLoading(true);

      // Obter dados de desempenho do usuário
      const performanceRes = await fetch(`/api/data/get-user-performance-data?userEmail=${user.email}`);
      const performanceData = await performanceRes.json();
      setPerformanceData(performanceData);

      // Obter solicitações de ajuda do usuário
      const helpRequestsRes = await fetch(`/api/data/get-user-help-requests-data?userEmail=${user.email}`);
      const helpRequestsData = await helpRequestsRes.json();
      setHelpRequests(helpRequestsData.helpRequests);

      // Obter ranking de categorias do usuário
      const categoryRankingRes = await fetch(`/api/data/get-user-category-ranking-data?userEmail=${user.email}`);
      const categoryRankingData = await categoryRankingRes.json();
      setCategoryRanking(categoryRankingData.categories);

    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <title>Dashboard Supervisor</title>
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
            <button onClick={() => router.push('/dashboard-super')} className={commonStyles.menuButton}>
              Dashboard Supervisor
            </button>
            <button onClick={() => router.push('/registro')} className={commonStyles.menuButton}>
              Registrar Ajuda
            </button>
            <button onClick={() => router.push('/profile')} className={commonStyles.menuButton}>
              Meu Perfil
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
          <div className={styles.userSelection}>
            <h2>Selecionar Usuário</h2>
            <select
              onChange={(e) => handleUserSelection(users.find((user) => user.id === e.target.value))}
              className={styles.userDropdown}
            >
              <option value="">Selecione um usuário</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className={styles.userDetails}>
              <h2>Dados de {selectedUser.name}</h2>

              {performanceData && (
                <div className={styles.performanceSection}>
                  <h3>Desempenho</h3>
                  <div className={styles.performanceCard}>
                    <h4>Geral</h4>
                    <p><strong>Nome:</strong> {performanceData.desempenho.nome}</p>
                    <p><strong>Squad:</strong> {performanceData.desempenho.squad}</p>
                  </div>

                  <div className={styles.performanceCard}>
                    <h4>Chamados</h4>
                    <p><strong>Total:</strong> {performanceData.desempenho.chamados.total}</p>
                    <p><strong>Média por Dia:</strong> {performanceData.desempenho.chamados.mediaPorDia}</p>
                    <p>
                      <strong>Cor Média por Dia:</strong>
                      <span style={{ color: performanceData.desempenho.chamados.corMediaPorDia }}>
                        {performanceData.desempenho.chamados.mediaPorDia}
                      </span>
                    </p>
                  </div>

                  <div className={styles.performanceCard}>
                    <h4>Telefone</h4>
                    <p><strong>Total de Chamadas:</strong> {performanceData.desempenho.telefone.total}</p>
                    <p><strong>TMA:</strong> {performanceData.desempenho.telefone.tma}</p>
                    <p><strong>CSAT:</strong> {performanceData.desempenho.telefone.csat}</p>
                    <p><strong>Chamadas Perdidas:</strong> {performanceData.desempenho.telefone.perdidas}</p>
                  </div>

                  <div className={styles.performanceCard}>
                    <h4>Chat</h4>
                    <p><strong>Total de Chats:</strong> {performanceData.desempenho.chat.total}</p>
                    <p><strong>TMA:</strong> {performanceData.desempenho.chat.tma}</p>
                    <p><strong>CSAT:</strong> {performanceData.desempenho.chat.csat}</p>
                  </div>
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
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'supervisor') {
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
