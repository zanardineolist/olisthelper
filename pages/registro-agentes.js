import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import Layout from '../components/Layout';
import { ThreeDotsLoader } from '../components/LoadingIndicator';
import { useLoading } from '../components/LoadingIndicator';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import managerStyles from '../styles/Manager.module.css';

export default function RegistroAgentesPage({ user }) {
  const router = useRouter();
  const { loading: routerLoading } = useLoading();
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formLoading, setFormLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpStats, setHelpStats] = useState({ today: 0, currentMonth: 0, lastMonth: 0 });
  const [recentHelps, setRecentHelps] = useState([]);
  const [formData, setFormData] = useState({
    agent: null,
    category: null,
    description: '',
  });
  // Estados para o modal de nova categoria
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Carregar usuários e categorias
  useEffect(() => {
    const loadUsersAndCategories = async () => {
      try {
        setFormLoading(true);
        const [usersRes, categoriesRes] = await Promise.all([
          fetch('/api/get-users'),
          fetch('/api/get-analysts-categories')
        ]);
        
        const usersData = await usersRes.json();
        const categoriesData = await categoriesRes.json();
        
        // Filtrar usuários para agentes (igual ao registro.js) e excluir o próprio usuário
        const validAgentRoles = ['analyst', 'tax', 'super', 'quality', 'dev'];
        const filteredAgents = (usersData.users || []).filter(agent => 
          agent.id !== user.id && validAgentRoles.includes(agent.role)
        );
        setAgents(filteredAgents);
        setCategories(categoriesData.categories);
        setFormLoading(false);

        // Buscar dados de estatísticas em paralelo
        setStatsLoading(true);
        await Promise.all([
          fetchHelpStats(),
          fetchRecentHelps()
        ]);
        setStatsLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setFormLoading(false);
        setStatsLoading(false);
      }
    };

    if (user?.id) {
      loadUsersAndCategories();
    }
  }, [user.id]);

  // Função para buscar estatísticas de ajuda entre agentes
  const fetchHelpStats = async () => {
    try {
      const statsResponse = await fetch(`/api/get-agent-help-stats?helperAgentId=${user.id}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setHelpStats({
          today: statsData.today || 0,
          currentMonth: statsData.currentMonth || 0,
          lastMonth: statsData.lastMonth || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas de ajuda:', err);
    }
  };
  
  // Função para buscar os registros recentes de ajuda entre agentes
  const fetchRecentHelps = async () => {
    try {
      const recentResponse = await fetch(`/api/get-recent-agent-helps?helperAgentId=${user.id}`);
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentHelps(recentData.recentHelps || []);
      }
    } catch (err) {
      console.error('Erro ao buscar registros recentes:', err);
    }
  };

  // Gerenciar alterações no formulário
  const handleChange = (selectedOption, actionMeta) => {
    const { name } = actionMeta;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Funções para o modal de nova categoria
  const openCategoryModal = () => {
    setNewCategory('');
    setModalIsOpen(true);
  };

  const closeCategoryModal = () => {
    setModalIsOpen(false);
  };

  const handleNewCategoryChange = (e) => {
    setNewCategory(e.target.value);
  };

  const handleSaveCategory = async () => {
    if (!newCategory.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'O nome da categoria não pode estar vazio.',
        showConfirmButton: true,
      });
      return;
    }

    try {
      setSavingCategory(true);
      
      const res = await fetch('/api/manage-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Erro ao salvar categoria');
      }

      // Atualizar a lista de categorias
      const categoriesRes = await fetch('/api/get-analysts-categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories);

        // Selecionar a nova categoria automaticamente
        const newCategoryOption = {
          value: newCategory.trim(),
          label: newCategory.trim(),
        };
        setFormData(prev => ({
          ...prev,
          category: newCategoryOption
        }));

        // Fechar o modal e mostrar mensagem de sucesso
        setModalIsOpen(false);
        Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: 'Categoria adicionada com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error('Erro ao processar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: `Erro ao processar a categoria: ${err.message}`,
        showConfirmButton: true,
      });
    } finally {
      setSavingCategory(false);
    }
  };

  // Submeter o formulário de registro de ajuda entre agentes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedAgent = formData.agent;
      const helpedAgentId = selectedAgent ? selectedAgent.value : '';

      const response = await fetch('/api/register-agent-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          helpedAgentId,
          category: formData.category ? formData.category.value : '',
          description: formData.description,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Ajuda registrada com sucesso!',
          text: `Registrado ajuda para: ${responseData.data?.helpedAgent}`,
          showConfirmButton: false,
          timer: 2000,
        });
        setFormData({ agent: null, category: null, description: '' });
        
        // Atualizar o contador de ajudas e registros recentes após o registro bem-sucedido
        setStatsLoading(true);
        await Promise.all([
          fetchHelpStats(),
          fetchRecentHelps()
        ]);
        setStatsLoading(false);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar a ajuda',
          text: responseData.error || 'Por favor, tente novamente.',
          showConfirmButton: true,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar a ajuda',
        text: 'Por favor, tente novamente.',
        showConfirmButton: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Redirecionamento para a página de gerenciamento de registros
  const navigateToAllRecords = () => {
    router.push('/manager#Registros-Agentes');
  };

  // Estilos personalizados para o React-Select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--labels-bg)',
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
    backgroundColor: 'var(--labels-bg)',
    maxHeight: '220px',
    overflowY: 'auto',
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    maxHeight: '220px',
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

  return (
    <Layout user={user}>
      <Head>
        <title>Registrar Ajuda - Agentes</title>
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        <div className={styles.formContainerWithSpacing}>
          <h2 className={styles.formTitle}>Registrar Ajuda entre Agentes</h2>
          <p className={styles.formSubtitle}>
            Use esta página para registrar ajuda que você prestou para outros agentes internos
          </p>
          
          {formLoading ? (
            <ThreeDotsLoader message="Carregando formulário..." />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="agent">Selecione o agente ajudado</label>
                <Select
                  id="agent"
                  name="agent"
                  options={agents.map((agent) => ({
                    value: agent.id,
                    label: agent.name,
                    email: agent.email,
                  }))}
                  value={formData.agent}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um agente"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <div className={styles.categoryHeader}>
                  <label htmlFor="category">Tema da ajuda</label>
                  <button 
                    type="button"
                    className={styles.newCategoryButton}
                    onClick={openCategoryModal}
                  >
                    <i className="fa-solid fa-plus"></i> Nova categoria
                  </button>
                </div>
                <Select
                  id="category"
                  name="category"
                  options={categories.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  value={formData.category}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um tema"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição da ajuda prestada</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva brevemente a ajuda que você prestou ao agente."
                  required
                  rows="4"
                  className={`${styles.formTextarea} ${styles.formFieldHover}`}
                />
              </div>

              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar Ajuda'}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Seção de estatísticas e registros recentes */}
        <div className={styles.statsContainer}>
          {/* Painel expandido de ajudas prestadas */}
          <div className={styles.helpExpandedCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <i className="fa-solid fa-handshake-angle"></i>
                Ajudas Prestadas a Agentes
              </h3>
            </div>
            
            {statsLoading ? (
              <ThreeDotsLoader message="Carregando estatísticas..." />
            ) : (
              <>
                <div className={styles.helpStatsExpanded}>
                  <div className={styles.helpStatMain}>
                    <div className={styles.helpStatIcon}>
                      <i className="fa-solid fa-calendar-day"></i>
                    </div>
                    <div className={styles.helpStatContent}>
                      <span className={styles.helpStatValue}>{helpStats.today}</span>
                      <span className={styles.helpStatLabel}>Hoje</span>
                    </div>
                  </div>
                  
                  <div className={styles.helpStatMain}>
                    <div className={styles.helpStatIcon}>
                      <i className="fa-solid fa-calendar"></i>
                    </div>
                    <div className={styles.helpStatContent}>
                      <span className={styles.helpStatValue}>{helpStats.currentMonth}</span>
                      <span className={styles.helpStatLabel}>Mês Atual</span>
                    </div>
                  </div>
                  
                  <div className={styles.helpStatMain}>
                    <div className={styles.helpStatIcon}>
                      <i className="fa-solid fa-calendar-xmark"></i>
                    </div>
                    <div className={styles.helpStatContent}>
                      <span className={styles.helpStatValue}>{helpStats.lastMonth}</span>
                      <span className={styles.helpStatLabel}>Mês Anterior</span>
                    </div>
                  </div>
                </div>

                <div className={styles.trendIndicator}>
                  <div className={`${styles.trendValue} ${(() => {
                    const percentageChange = helpStats.lastMonth > 0 ? 
                      ((helpStats.currentMonth - helpStats.lastMonth) / helpStats.lastMonth) * 100 : 0;
                    return percentageChange > 0 ? styles.positive : percentageChange < 0 ? styles.negative : styles.neutral;
                  })()}`}>
                    <i className={`fa-solid ${(() => {
                      const percentageChange = helpStats.lastMonth > 0 ? 
                        ((helpStats.currentMonth - helpStats.lastMonth) / helpStats.lastMonth) * 100 : 0;
                      return percentageChange > 0 ? 'fa-trending-up' : percentageChange < 0 ? 'fa-trending-down' : 'fa-minus';
                    })()}`}></i>
                    <span>
                      {helpStats.lastMonth > 0 ? 
                        Math.abs(((helpStats.currentMonth - helpStats.lastMonth) / helpStats.lastMonth) * 100).toFixed(1) : 
                        '0.0'
                      }%
                    </span>
                  </div>
                  <span className={styles.trendLabel}>Variação Mensal</span>
                </div>
              </>
            )}
          </div>
          
          {/* Lista de registros recentes */}
          <div className={styles.recentHelpsContainer}>
            <div className={styles.recentHelpsHeader}>
              <h3>Últimos registros - Agentes</h3>
              <button 
                className={styles.viewAllButton}
                onClick={navigateToAllRecords}
              >
                Ver todos <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
            
            <div className={styles.recentHelpsList}>
              {statsLoading ? (
                <ThreeDotsLoader message="Carregando registros..." />
              ) : recentHelps.length > 0 ? (
                recentHelps.map((help) => (
                  <div key={help.id} className={styles.recentHelpCard}>
                    <div className={styles.recentHelpHeader}>
                      <div className={styles.recentHelpCategory}>
                        <i className="fa-solid fa-tag"></i> {help.category}
                      </div>
                      <div className={styles.recentHelpTime}>
                        <i className="fa-regular fa-clock"></i> {help.formattedDate} • {help.formattedTime}
                      </div>
                    </div>
                    <div className={styles.recentHelpUser}>
                      <i className="fa-solid fa-user-tie"></i> {help.helpedAgentName} ({help.helpedAgentProfile})
                    </div>
                    <div className={styles.recentHelpDescription}>
                      <div className={styles.descriptionLabel}>Ajuda prestada:</div>
                      <div className={styles.descriptionText}>{help.description}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noRecentHelps}>
                  <i className="fa-solid fa-clipboard-list"></i>
                  <p>Nenhum registro recente encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para adicionar nova categoria */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeCategoryModal}
        contentLabel="Adicionar Nova Categoria"
        className={managerStyles.modal}
        overlayClassName={managerStyles.overlay}
        ariaHideApp={false}
      >
        <h2 className={managerStyles.modalTitle}>Adicionar Nova Categoria</h2>
        <div className={managerStyles.formContainer}>
          <input
            type="text"
            value={newCategory}
            placeholder="Nome da Categoria"
            className={managerStyles.inputField}
            onChange={handleNewCategoryChange}
            required
            autoComplete="off"
          />
          <button 
            onClick={handleSaveCategory} 
            disabled={savingCategory} 
            className={managerStyles.saveButton}
          >
            {savingCategory ? 'Salvando...' : 'Adicionar Categoria'}
          </button>
          <button onClick={closeCategoryModal} className={managerStyles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>
    </Layout>
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

  // Buscar permissões atualizadas do usuário (SISTEMA MODULAR) - igual ao remote.js
  const { getUserPermissions } = await import('../utils/supabase/supabaseClient');
  const userPermissions = await getUserPermissions(session.id);
  if (!userPermissions) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Verificar se tem permissão can_register_help
  if (!userPermissions.can_register_help) {
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
        ...userPermissions, // <-- SPREAD direto das permissões (igual ao remote.js)
        id: session.id,
        name: session.user.name,
        email: session.user.email,
        role: session.role, // Manter para compatibilidade
      },
    },
  };
} 