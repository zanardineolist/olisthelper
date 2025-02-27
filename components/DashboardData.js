// components/DashboardData.js
import React, { useState, useEffect } from 'react';
import Select, { components as selectComponents } from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/DashboardSuper.module.css';

export default function DashboardData({ user }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ currentMonth: 0, lastMonth: 0 });
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    // Carregar lista de usuários
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
            // Para fiscal, combinar dados do suporte e analyst
            const [helpResponse, categoryResponse, performanceResponse] = await Promise.all([
              fetch(`/api/get-analyst-records?analystId=${selectedUser.id}&mode=profile`),
              fetch(`/api/get-category-ranking?analystId=${selectedUser.id}`),
              fetch(`/api/get-user-performance?userEmail=${selectedUser.email}`)
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

            // Indicadores de Desempenho (similar ao suporte)
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

  const handleUserSelect = (selectedOption) => {
    setSelectedUser(selectedOption ? selectedOption.value : null);
  };

  const getColorForRole = (role) => {
    switch (role.toLowerCase()) {
      case 'support': return '#779E3D';
      case 'support+': return '#779E3D';
      case 'analyst': return '#0A4EE4';
      case 'tax': return '#8A2BE2';
      case 'super': return '#E64E36';
      default: return '#888';
    }
  };

  const getRoleLabel = (role) => {
    switch (role.toLowerCase()) {
      case 'support': return 'Suporte';
      case 'support+': return 'Suporte+';
      case 'analyst': return 'Analista';
      case 'tax': return 'Fiscal';
      case 'super': return 'Supervisor';
      default: return 'Outro';
    }
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

  // Componente customizado para renderizar as opções do Select
  const CustomOption = (props) => {
    return (
      <selectComponents.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
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

          {/* Adicionando novas tags para Chamado, Telefone e Chat se forem TRUE */}
          {props.data.chamado && (
            <span
              style={{
                backgroundColor: '#C98123',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Chamado
            </span>
          )}
          {props.data.telefone && (
            <span
              style={{
                backgroundColor: '#BA3A2D',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Telefone
            </span>
          )}
          {props.data.chat && (
            <span
              style={{
                backgroundColor: '#60871B',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '10px',
                fontSize: '0.8em',
              }}
            >
              Chat
            </span>
          )}
        </div>
      </selectComponents.Option>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <Select
        options={users
          .filter((user) => ['support', 'support+', 'analyst', 'tax'].includes(user.role.toLowerCase()))
          .map((user) => ({
            value: user,
            label: user.name,
            role: user.role,
            color: getColorForRole(user.role),
            chamado: user.chamado,
            telefone: user.telefone,
            chat: user.chat,
          }))}
        onChange={handleUserSelect}
        isClearable
        placeholder="Selecione um colaborador"
        styles={customSelectStyles}
        classNamePrefix="react-select"
        noOptionsMessage={() => 'Sem resultados'}
        components={{ Option: CustomOption }}
      />

      {selectedUser && (
        <>
          <div className={styles.profileAndHelpContainer}>
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
                      <p>
                        <strong>Mês Atual:</strong> {helpRequests.currentMonth}
                      </p>
                      <p>
                        <strong>Mês Anterior:</strong> {helpRequests.lastMonth}
                      </p>
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
                        <p className={styles.lastUpdated}>
                        Período: {performanceData?.atualizadoAte || 'Data não disponível'}
                        </p>
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
                        <p className={styles.lastUpdated}>
                        Período: {performanceData?.atualizadoAte || 'Data não disponível'}
                        </p>
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
                        <p className={styles.lastUpdated}>
                        Período: {performanceData?.atualizadoAte || 'Data não disponível'}
                        </p>
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
                      Período: {performanceData?.atualizadoAte || 'Data não disponível'}
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
    </div>
  );
}