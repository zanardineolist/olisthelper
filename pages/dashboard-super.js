// pages/dashboard-super.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Select, { components } from 'react-select';
import Navbar from '../components/Navbar';
import styles from '../styles/DashboardSuper.module.css';
import Footer from '../components/Footer';
import Swal from 'sweetalert2';

export default function DashboardSuperPage({ user }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    // Saudação com base na hora do dia
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
  }, []);

  // Carregar lista de usuários
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/get-users');
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        const data = await res.json();
        setUsers(data.users);
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        Swal.fire('Erro', 'Erro ao carregar usuários.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Carregar dados do usuário selecionado
  useEffect(() => {
    if (selectedUser) {
      const fetchData = async () => {
        try {
          setLoadingData(true);

          if (selectedUser.role === 'support' || selectedUser.role === 'support+') {
            // Para suporte, carregar desempenho completo
            const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
              fetch(`/api/get-user-help-requests?userEmail=${selectedUser.email}`),
              fetch(`/api/get-user-category-ranking?userEmail=${selectedUser.email}`),
              fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
            ]);   

            // Ajudas Solicitadas
            const helpData = await helpResponse.json();
            setHelpRequests({
              currentMonth: helpData.currentMonth,
              lastMonth: helpData.lastMonth,
            });

            // Ranking de Categorias
            const categoryData = await categoryResponse.json();
            setCategoryRanking(categoryData.categories || []);

            // Desempenho do Usuário
            const performanceData = await performanceResponse.json();
            setPerformanceData(performanceData);
            
          } else if (selectedUser.role === 'analyst') {
            // Para analyst, carregar dados de ajudas prestadas, ranking de categorias e total de chamados
            const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
              fetch(`/api/get-analyst-records?analystId=${selectedUser.id}&mode=profile`),
              fetch(`/api/get-category-ranking?analystId=${selectedUser.id}`),
              fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
            ]);

            if (!helpResponse.ok || !categoryResponse.ok || !performanceResponse.ok) {
              throw new Error('Erro ao buscar dados do analista.');
            }

            // Ajudas Prestadas
            const helpData = await helpResponse.json();
            setHelpRequests({
              currentMonth: helpData.currentMonth,
              lastMonth: helpData.lastMonth,
            });

            // Ranking de Categorias
            const categoryData = await categoryResponse.json();
            setCategoryRanking(categoryData.categories || []);

            // Total de Chamados e Data de Atualização
            const performanceData = await performanceResponse.json();
            setPerformanceData({
              totalChamados: performanceData?.chamados?.totalChamados || 0,
              totalAjudas: (helpData.currentMonth || 0) + (performanceData?.chamados?.totalChamados || 0),
              atualizadoAte: performanceData?.atualizadoAte || "Data não disponível",
            });

          } else if (selectedUser.role === 'tax') {
            // Para fiscal, combinar dados do support e analyst
            const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
              fetch(`/api/get-analyst-records?analystId=${selectedUser.id}&mode=profile`), // Dados de ajuda como analyst
              fetch(`/api/get-category-ranking?analystId=${selectedUser.id}`), // Ranking de categorias como analyst
              fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`) // Indicadores de desempenho como suporte
            ]);
          
            if (!helpResponse.ok || !categoryResponse.ok || !performanceResponse.ok) {
              throw new Error('Erro ao buscar dados do fiscal.');
            }
          
            // Ajudas Prestadas (similar ao analyst)
            const helpData = await helpResponse.json();
            setHelpRequests({
              currentMonth: helpData.currentMonth,
              lastMonth: helpData.lastMonth,
            });
          
            // Ranking de Categorias (similar ao analyst)
            const categoryData = await categoryResponse.json();
            setCategoryRanking(categoryData.categories || []);
          
            // Indicadores de Desempenho (similar ao support)
            const performanceData = await performanceResponse.json();
            setPerformanceData({
              ...performanceData,
              totalChamados: performanceData?.chamados?.totalChamados || 0,
              totalAjudas: (helpData.currentMonth || 0) + (performanceData?.chamados?.totalChamados || 0),
              atualizadoAte: performanceData?.atualizadoAte || "Data não disponível",
            });
          }
          
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          Swal.fire('Erro', 'Erro ao buscar dados do usuário.', 'error');
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }
  }, [selectedUser]);

  // Manipulador de seleção de usuário
  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption ? selectedOption.value : null);
  };

  // Função para determinar a cor da tag do perfil
  const getColorForRole = (role) => {
    switch (role.toLowerCase()) {
      case 'support':
        return '#779E3D'; // Verde para Suporte
      case 'support+':
        return '#779E3D'; // Verde para Suporte+        
      case 'analyst':
        return '#0A4EE4'; // Azul para Analista
      case 'tax':
        return '#8A2BE2'; // Laranja para Fiscal
      case 'super':
        return '#E64E36'; // Vermelho para Supervisor
      case 'partner':
        return '#8A2BE2'; // Roxo para Parceiro
      case 'other':
        return '#888'; // Cinza para Outro
      default:
        return '#888'; // Cinza padrão
    }
  };

  // Função para obter o label de cada perfil
  const getRoleLabel = (role) => {
    switch (role.toLowerCase()) {
      case 'support':
        return 'Suporte';
      case 'support+':
        return 'Suporte+';        
      case 'analyst':
        return 'Analista';
      case 'super':
        return 'Supervisor';
      case 'tax':
        return 'Fiscal';
      case 'partner':
        return 'Parceiro';
      case 'other':
        return 'Outro';
      default:
        return 'Desconhecido';
    }
  };

  // Componente customizado para renderizar as opções do Select
  const CustomOption = (props) => {
    return (
      <components.Option {...props}>
        <span>{props.label}</span>
        <span
          style={{
            backgroundColor: props.data.color,
            color: '#FFF',
            padding: '2px 6px',
            borderRadius: '4px',
            marginLeft: '10px',
            fontSize: '0.8em',
          }}
        >
          {getRoleLabel(props.data.role)}
        </span>
      </components.Option>
    );
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: '500px',
      margin: '20px auto',
    }),
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      color: 'var(--text-color)',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)',
      },
      outline: 'none',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
      caretColor: 'var(--text-color)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
      maxHeight: '250px',
      overflowY: 'auto',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: '250px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'var(--scroll-bg)',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--scroll)',
        borderRadius: '10px',
        border: '2px solid var(--scroll-bg)',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? 'var(--color-trodd)'
        : state.isSelected
        ? 'var(--color-primary)'
        : 'var(--box-color)',
      color: 'var(--text-color)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--color-trodd)',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--text-color2)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--text-color)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border)',
    }),
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
  
      {/* Navbar reutilizável */}
      <Navbar user={user} />
  
      <main className={styles.main}>
        <h1 className={styles.greeting}>Olá, {greeting} {user.name.split(' ')[0]}!</h1>
  
        {/* Container com informações do perfil do supervisor */}
        <div className={styles.profileContainer}>
          <img src={user.image} alt={user.name} className={styles.profileImage} />
          <div className={styles.profileInfo}>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
  
        {/* Campo de Seleção do Colaborador */}
        <div className={styles.profileAndHelpContainer}>
          <Select
            options={users
              .filter((user) => ['support', 'support+', 'analyst', 'tax'].includes(user.role.toLowerCase()))
              .map((user) => ({
                value: user,
                label: user.name,
                role: user.role,
                color: getColorForRole(user.role),
              }))}
            onChange={handleUserSelect}
            isClearable
            placeholder="Selecione um colaborador"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            noOptionsMessage={() => "Sem resultados"}
            components={{ Option: CustomOption }}
          />
        </div>
  
        {selectedUser && (
        <>
          {/* Renderização de dados para todos os perfis (suporte, fiscal, analista) */}
          <div className={styles.profileAndHelpContainer}>
            {/* Container de Informações do Perfil */}
            <div className={styles.profileContainer}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <div className={styles.profileInfo}>
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.email}</p>
                  <div className={styles.tagsContainer}>
                  {(selectedUser.role === 'support' || selectedUser.role === 'support+' || selectedUser.role === 'tax') && performanceData && (
                      <>
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
                      </>
                    )}
                    {(selectedUser.role === 'analyst' || selectedUser.role === 'tax') && (
                      <div className={styles.tag} style={{ backgroundColor: getColorForRole(selectedUser.role) }}>
                        #{getRoleLabel(selectedUser.role)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ajudas Solicitadas para Suporte / Ajudas Prestadas para Analista/Fiscal */}
            <div className={styles.profileContainer}>
              {loadingData ? (
                <div className={styles.loadingContainer}>
                  <div className="standardBoxLoader"></div>
                </div>
              ) : (
                <div className={styles.profileInfo}>
                  <h2>
                    {selectedUser.role === 'support' || selectedUser.role === 'support+' ? 'Ajudas Solicitadas' : 'Ajudas Prestadas'}
                  </h2>
                  <div className={styles.helpRequestsInfo}>
                    <div className={styles.monthsInfo}>
                      <p><strong>Mês Atual:</strong> {helpRequests.currentMonth}</p>
                      <p><strong>Mês Anterior:</strong> {helpRequests.lastMonth}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
  
            {/* Container para Indicadores de Desempenho (para Suporte e Fiscal) */}
            {(selectedUser.role === 'support' || selectedUser.role === 'support+' || selectedUser.role === 'tax') && (
              <div className={styles.performanceWrapper}>
                {loadingData ? (
                  <>
                    <div className={styles.performanceContainer}>
                      <div className={styles.loadingContainer}>
                        <div className="standardBoxLoader"></div>
                      </div>
                    </div>
                    <div className={styles.performanceContainer}>
                      <div className={styles.loadingContainer}>
                        <div className="standardBoxLoader"></div>
                      </div>
                    </div>
                    <div className={styles.performanceContainer}>
                      <div className={styles.loadingContainer}>
                        <div className="standardBoxLoader"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {performanceData?.chamados && (
                      <div className={styles.performanceContainer}>
                        <h2>Indicadores Chamados</h2>
                        <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                        <div className={styles.performanceInfo}>
                          <div className={styles.performanceItem}>
                            <span>Total Chamados:</span>
                            <span>{performanceData.chamados.totalChamados}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.mediaPorDia || 'var(--box-color3)' }}>
                            <span>Média/Dia:</span>
                            <span>{performanceData.chamados.mediaPorDia}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.tma || 'var(--box-color3)' }}>
                            <span>TMA:</span>
                            <span>{performanceData.chamados.tma}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chamados.colors.csat || 'var(--box-color3)' }}>
                            <span>CSAT:</span>
                            <span>{performanceData.chamados.csat}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {performanceData?.telefone && (
                      <div className={styles.performanceContainer}>
                        <h2>Indicadores Telefone</h2>
                        <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                        <div className={styles.performanceInfo}>
                          <div className={styles.performanceItem}>
                            <span>Total Ligações:</span>
                            <span>{performanceData.telefone.totalTelefone}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.mediaPorDia || 'var(--box-color3)' }}>
                            <span>Média/Dia:</span>
                            <span>{performanceData.telefone.mediaPorDia}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.tma || 'var(--box-color3)' }}>
                            <span>TMA:</span>
                            <span>{performanceData.telefone.tma}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.telefone.colors.csat || 'var(--box-color3)' }}>
                            <span>CSAT:</span>
                            <span>{performanceData.telefone.csat}</span>
                          </div>
                          <div className={styles.performanceItem}>
                            <span>Perdidas:</span>
                            <span>{performanceData.telefone.perdidas}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {performanceData?.chat && (
                      <div className={styles.performanceContainer}>
                        <h2>Indicadores Chat</h2>
                        <p className={styles.lastUpdated}>Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}</p>
                        <div className={styles.performanceInfo}>
                          <div className={styles.performanceItem}>
                            <span>Total Chats:</span>
                            <span>{performanceData.chat.totalChats}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.mediaPorDia || 'var(--box-color3)' }}>
                            <span>Média/Dia:</span>
                            <span>{performanceData.chat.mediaPorDia}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.tma || 'var(--box-color3)' }}>
                            <span>TMA:</span>
                            <span>{performanceData.chat.tma}</span>
                          </div>
                          <div className={styles.performanceItem} style={{ backgroundColor: performanceData.chat.colors.csat || 'var(--box-color3)' }}>
                            <span>CSAT:</span>
                            <span>{performanceData.chat.csat}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedUser.role === 'analyst' && (
                  <div className={styles.performanceWrapper}>
                    <div className={styles.performanceContainer}>
                      {loadingData ? (
                        <div className={styles.loadingContainer}>
                          <div className="standardBoxLoader"></div>
                        </div>
                      ) : (
                        <>
                          <h2>Total de RFC</h2>
                          <p className={styles.lastUpdated}>
                            Atualizado até: {performanceData?.atualizadoAte || "Data não disponível"}
                          </p>
                          <div className={styles.performanceInfo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                              {performanceData?.totalChamados}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                {/* Total de Ajudas */}
                <div className={styles.performanceContainer}>
                  {loadingData ? (
                    <div className={styles.loadingContainer}>
                      <div className="standardBoxLoader"></div>
                    </div>
                  ) : (
                    <>
                      <h2>Total de Ajudas</h2>
                      <p className={styles.lastUpdated}>
                            (ajudas prestadas atual + total de rfc)
                      </p>
                      <div
                        className={styles.performanceInfo}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
                      >
                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                          {Number(helpRequests.currentMonth) + Number(performanceData?.totalChamados || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
  
            {/* Container para Ranking de Categorias (para Suporte, Analista e Fiscal) */}
            {(selectedUser.role === 'support' || selectedUser.role === 'support+' || selectedUser.role === 'analyst' || selectedUser.role === 'tax') && (
              <div className={styles.categoryRankingContainer}>
                {loadingData ? (
                  <div className={styles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                  </div>
                ) : (
                  <>
                    <h3>
                      {selectedUser.role === 'support' || selectedUser.role === 'support+' ? 'Top 10 - Temas de maior dúvida' : 'Top 10 - Temas mais auxiliados'}
                    </h3>
                    {categoryRanking.length > 0 ? (
                      <ul className={styles.list}>
                        {categoryRanking.map((category, index) => (
                          <li key={index} className={styles.listItem}>
                            <span className={styles.rank}>{index + 1}.</span>
                            <span className={styles.categoryName}>{category.name}</span>
                            <div className={styles.progressBarCategory} style={{ width: `${category.count * 10}px` }} />
                            <span className={styles.count}>{category.count} pedidos de ajuda</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={styles.noData}>Nenhum registro de tema localizado.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
  
      <Footer />
    </>
  );  
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'super') {
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
