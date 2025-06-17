// pages/registro.js
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

export default function RegistroPage({ user }) {
  const router = useRouter();
  const { loading: routerLoading } = useLoading();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formLoading, setFormLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ today: 0 });
  const [recentHelps, setRecentHelps] = useState([]);
  const [formData, setFormData] = useState({
    user: null,
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
        
        setUsers(usersData.users);
        setCategories(categoriesData.categories);
        setFormLoading(false);

        // Buscar dados de estatísticas em paralelo
        setStatsLoading(true);
        await Promise.all([
          fetchHelpRequests(),
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

  // Função para buscar ajudas prestadas
  const fetchHelpRequests = async () => {
    try {
      // Usando filter=1 para obter dados do dia atual
      const helpResponse = await fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile&filter=1`);
      if (helpResponse.ok) {
        const helpData = await helpResponse.json();
        setHelpRequests({
          today: helpData.today || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar ajudas prestadas:', err);
    }
  };
  
  // Função para buscar os registros recentes
  const fetchRecentHelps = async () => {
    try {
      const recentResponse = await fetch(`/api/get-recent-helps?analystId=${user.id}`);
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
      
      // Verificação prévia com o backend para determinar se a categoria existe e seu status
      let checkData = { exists: false };
      
      try {
        const checkRes = await fetch('/api/manage-category/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newCategory.trim() }),
        });
        
        if (checkRes.ok) {
          checkData = await checkRes.json();
        } else {
          // Verificação local simplificada como fallback
          const lowerCaseNewCategory = newCategory.trim().toLowerCase();
          const existsLocally = categories.some(
            (cat) => cat.toLowerCase() === lowerCaseNewCategory
          );
          
          if (existsLocally) {
            checkData = { exists: true, active: true };
          }
        }
      } catch (checkError) {
        console.error('Erro ao verificar categoria:', checkError);
        // Continuar com verificação local em caso de erro
        const lowerCaseNewCategory = newCategory.trim().toLowerCase();
        const existsLocally = categories.some(
          (cat) => cat.toLowerCase() === lowerCaseNewCategory
        );
        
        if (existsLocally) {
          checkData = { exists: true, active: true };
        }
      }
      
      // Se a categoria existir e estiver ativa
      if (checkData.exists && checkData.active) {
        Swal.fire({
          icon: 'error',
          title: 'Categoria já existe',
          text: 'Esta categoria já está cadastrada e ativa no sistema.',
          showConfirmButton: true,
        });
        setSavingCategory(false);
        return;
      }
      
      // Se a categoria existir mas estiver inativa
      if (checkData.exists && !checkData.active) {
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Categoria inativa encontrada',
          text: `A categoria "${newCategory}" já existe mas está inativa. Deseja reativá-la?`,
          showCancelButton: true,
          confirmButtonText: 'Sim, reativar',
          cancelButtonText: 'Cancelar',
          showConfirmButton: true,
        });
        
        if (result.isConfirmed) {
          try {
            // Reativar a categoria usando id em vez de uuid
            const reactivateRes = await fetch('/api/manage-category/reactivate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                name: newCategory.trim(),
                id: checkData.id // Enviamos o id da categoria para reativação
              }),
            });
            
            if (!reactivateRes.ok) {
              const errorData = await reactivateRes.json().catch(() => ({}));
              throw new Error(errorData.error || 'Erro ao reativar categoria');
            }
            
            // Atualizar a lista de categorias
            const categoriesRes = await fetch('/api/get-analysts-categories');
            if (categoriesRes.ok) {
              const categoriesData = await categoriesRes.json();
              setCategories(categoriesData.categories);
              
              // Selecionar a categoria reativada
              const reactivatedCategoryOption = {
                value: newCategory.trim(),
                label: newCategory.trim(),
              };
              setFormData(prev => ({
                ...prev,
                category: reactivatedCategoryOption
              }));
              
              // Fechar o modal e mostrar mensagem de sucesso
              setModalIsOpen(false);
              Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Categoria reativada com sucesso.',
                timer: 1500,
                showConfirmButton: false,
              });
            } else {
              console.warn('Falha ao atualizar lista de categorias após reativação');
              // Fechar o modal e mostrar mensagem mesmo assim
              setModalIsOpen(false);
              Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Categoria reativada com sucesso. Atualize a página para ver a categoria.',
                showConfirmButton: true,
              });
            }
          } catch (reactivateError) {
            console.error('Erro ao reativar categoria:', reactivateError);
            Swal.fire({
              icon: 'error',
              title: 'Erro',
              text: `Não foi possível reativar a categoria: ${reactivateError.message}`,
              showConfirmButton: true,
            });
          }
        }
        setSavingCategory(false);
        return;
      }

      // Se chegou aqui, a categoria não existe, então podemos criar uma nova
      try {
        const res = await fetch('/api/manage-category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newCategory.trim() }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Erro retornado pelo servidor:', errorData);
          
          // Verificar se o erro é de categoria duplicada
          if (errorData.code === '23505' || 
             (errorData.error && errorData.error.includes('already exists'))) {
            
            // Tentar verificar se a categoria está inativa
            try {
              const verifyRes = await fetch('/api/manage-category/check', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newCategory.trim() }),
              });
              
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                
                if (verifyData.exists && !verifyData.active) {
                  // Categoria existe mas está inativa
                  const activateResult = await Swal.fire({
                    icon: 'warning',
                    title: 'Categoria inativa encontrada',
                    text: `A categoria "${newCategory}" já existe mas está inativa. Deseja reativá-la?`,
                    showCancelButton: true,
                    confirmButtonText: 'Sim, reativar',
                    cancelButtonText: 'Cancelar',
                    showConfirmButton: true,
                  });
                  
                  if (activateResult.isConfirmed) {
                    // Reativar a categoria
                    await fetch('/api/manage-category/reactivate', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ id: verifyData.id }),
                    });
                    
                    // Atualizar a lista e selecionar a categoria
                    const categoriesRes = await fetch('/api/get-analysts-categories');
                    const categoriesData = await categoriesRes.json();
                    setCategories(categoriesData.categories);
                    
                    const newCategoryOption = {
                      value: newCategory.trim(),
                      label: newCategory.trim(),
                    };
                    
                    setFormData(prev => ({
                      ...prev,
                      category: newCategoryOption
                    }));
                    
                    setModalIsOpen(false);
                    Swal.fire({
                      icon: 'success',
                      title: 'Sucesso!',
                      text: 'Categoria reativada com sucesso.',
                      timer: 1500,
                      showConfirmButton: false,
                    });
                    
                    setSavingCategory(false);
                    return;
                  }
                } else {
                  // Categoria existe e está ativa (erro de duplicação normal)
                  Swal.fire({
                    icon: 'error',
                    title: 'Categoria já existe',
                    text: 'Esta categoria já está cadastrada no sistema.',
                    showConfirmButton: true,
                  });
                  setSavingCategory(false);
                  return;
                }
              }
            } catch (verifyError) {
              console.error('Erro ao verificar categoria após duplicação:', verifyError);
            }
            
            // Mensagem genérica se não conseguir determinar o status
            Swal.fire({
              icon: 'error',
              title: 'Categoria já existe',
              text: 'Esta categoria já está cadastrada no sistema. Se desejar usar uma categoria inativa, tente novamente verificando as categorias existentes.',
              showConfirmButton: true,
            });
            setSavingCategory(false);
            return;
          }
          
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
        } else {
          console.warn('Falha ao atualizar lista de categorias após criação');
          // Fechar o modal e mostrar mensagem mesmo assim
          setModalIsOpen(false);
          Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: 'Categoria adicionada com sucesso. Atualize a página para ver a categoria.',
            showConfirmButton: true,
          });
        }
      } catch (createError) {
        console.error('Erro ao criar categoria:', createError);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: `Erro ao processar a categoria: ${createError.message}`,
          showConfirmButton: true,
        });
      }
    } catch (err) {
      console.error('Erro geral ao processar categoria:', err);
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

  // Submeter o formulário de registro de ajuda
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedUser = formData.user;
      const userName = selectedUser ? selectedUser.label : '';
      const userEmail = selectedUser ? selectedUser.email : '';

      const response = await fetch('/api/register-analyst-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userEmail,
          category: formData.category ? formData.category.value : '',
          description: formData.description,
          analystId: user.id,
        }),
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Ajuda registrada com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ user: null, category: null, description: '' });
        
        // Atualizar o contador de ajudas e registros recentes após o registro bem-sucedido
        setStatsLoading(true);
        await Promise.all([
          fetchHelpRequests(),
          fetchRecentHelps()
        ]);
        setStatsLoading(false);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar a ajuda',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar a ajuda',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Redirecionamento para a página de gerenciamento de registros
  const navigateToAllRecords = () => {
    router.push('/manager#Registros');
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
        <title>Registrar Ajuda</title>
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        <div className={styles.formContainerWithSpacing}>
          <h2 className={styles.formTitle}>Registrar Ajuda</h2>
          
          {formLoading ? (
            <ThreeDotsLoader message="Carregando formulário..." />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="user">Selecione o usuário</label>
                <Select
                  id="user"
                  name="user"
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                    email: user.email,
                  }))}
                  value={formData.user}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um usuário"
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
                <label htmlFor="description">Descrição da ajuda</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva brevemente sua dúvida."
                  required
                  rows="4"
                  className={`${styles.formTextarea} ${styles.formFieldHover}`}
                />
              </div>

              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Seção de estatísticas e registros recentes */}
        <div className={styles.statsContainer}>
          {/* Contador de ajudas prestadas no dia */}
          <div className={styles.helpCounter}>
            <div className={styles.counterHeader}>
              <h3>Ajudas prestadas hoje</h3>
            </div>
            {statsLoading ? (
              <ThreeDotsLoader message="Carregando estatísticas..." />
            ) : (
              <div className={styles.counterValue}>{helpRequests.today || 0}</div>
            )}
          </div>
          
          {/* Lista de registros recentes */}
          <div className={styles.recentHelpsContainer}>
            <div className={styles.recentHelpsHeader}>
              <h3>Últimos registros</h3>
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
                      <i className="fa-regular fa-user"></i> {help.requesterName}
                    </div>
                    <div className={styles.recentHelpDescription}>
                      <div className={styles.descriptionLabel}>Descrição:</div>
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
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Buscar dados completos do usuário incluindo campo admin
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        admin: userData?.admin || false,
        // Incluir outros campos importantes se necessário
        profile: userData?.profile,
        can_ticket: userData?.can_ticket,
        can_phone: userData?.can_phone,
        can_chat: userData?.can_chat,
      },
    },
  };
}
