import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { getSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Remote.module.css';

const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--manager-menu-bg)',
          borderRadius: '5px',
          marginBottom: '20px',
          marginTop: '20px',
        },
        indicator: {
          backgroundColor: 'var(--manager-menu-indicator)',
          height: '4px',
          borderRadius: '5px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--text-color)',
          fontSize: '16px',
          textTransform: 'none',
          transition: 'color 0.3s ease, background-color 0.3s ease',
          '&.Mui-selected': {
            color: 'var(--color-white)',
            backgroundColor: 'var(--color-primary)',
          },
        },
      },
    },
  },
});

const temaOptions = [
  { value: 'Certificado A1', label: 'Certificado A1' },
  { value: 'Certificado A3', label: 'Certificado A3' },
  { value: 'Etiqueta de produto', label: 'Etiqueta de produto' },
  { value: 'SAT', label: 'SAT' },
];

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

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState({
    chamado: '',
    tema: null,
    description: '',
  });
  const [userRecords, setUserRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (user.role === 'support+') loadUserRecords();
    if (user.role === 'super') loadAllRecords();
    setLoading(false);
  }, [user.role]);

  const loadUserRecords = async () => {
    try {
      const response = await fetch(`/api/get-remote-records?userEmail=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUserRecords(data.records);
      } else {
        console.error('Erro ao buscar registros do usuário.');
      }
    } catch (error) {
      console.error('Erro ao buscar registros do usuário:', error);
    }
  };  

  const loadAllRecords = async () => {
    try {
      const response = await fetch('/api/get-remote-records');
      if (response.ok) {
        const data = await response.json();
        setAllRecords(data.records);
      } else {
        console.error('Erro ao buscar todos os registros.');
      }
    } catch (error) {
      console.error('Erro ao buscar todos os registros:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      tema: selectedOption,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.tema || !formData.chamado || !formData.description) {
      Swal.fire('Erro', 'Todos os campos são obrigatórios.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/remote-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: new Date().toLocaleDateString('pt-BR'),
          time: new Date().toLocaleTimeString('pt-BR'),
          name: user.name,
          email: user.email,
          chamado: formData.chamado,
          tema: formData.tema.label,
          description: formData.description,
        }),
      });

      if (response.ok) {
        Swal.fire('Sucesso', 'Registro adicionado com sucesso.', 'success');
        setFormData({ chamado: '', tema: null, description: '' });
        loadUserRecords();
      } else {
        const errorData = await response.json();
        Swal.fire('Erro', `Falha ao adicionar registro: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao adicionar registro:', error);
      Swal.fire('Erro', 'Falha ao adicionar registro. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderOverlay}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Acesso Remoto</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            {user.role === 'support+' && <Tab label="Registrar" />}
            {user.role === 'support+' && <Tab label="Meus Acessos" />}
            {user.role === 'super' && <Tab label="Todos os Acessos" />}
          </Tabs>
        </ThemeProvider>

        {currentTab === 0 && user.role === 'support+' && (
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Registrar Acesso Remoto</h2>
            <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
                <label htmlFor="chamado">Número do Chamado</label>
                <input
                  type="text"
                  id="chamado"
                  name="chamado"
                  value={formData.chamado}
                  onChange={handleInputChange}
                  onKeyDown={(event) => {
                    if (!/[0-9]/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                      event.preventDefault();
                    }
                  }}
                  required
                  className={styles.inputField}
                  autoComplete="off"
                />
            </div>

              <div className={styles.formGroup}>
                <label htmlFor="tema">Tema</label>
                <Select
                  id="tema"
                  name="tema"
                  options={temaOptions}
                  value={formData.tema}
                  onChange={handleSelectChange}
                  isClearable
                  placeholder="Indique o tema do acesso"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Adicione aqui informações do acesso se necessário..."
                  required
                  rows="4"
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        )}

      {currentTab === 1 && user.role === 'support+' && (
                <div className={`${styles.cardContainer} ${styles.dashboard}`}>
                  <h2 className={styles.cardTitle}>Meus Acessos</h2>
                  <div className={styles.recordsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Hora</th>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Chamado</th>
                          <th>Tema</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userRecords.map((record, index) => (
                          <tr key={index}>
                            <td>{record[0]}</td>
                            <td>{record[1]}</td>
                            <td>{record[2]}</td>
                            <td>{record[3]}</td>
                            <td>{record[4]}</td>
                            <td>{record[5]}</td>
                            <td>{record[6]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {currentTab === 2 && user.role === 'super' && (
                <div className={`${styles.cardContainer} ${styles.dashboard}`}>
                  <h2 className={styles.cardTitle}>Acessos Realizados</h2>
                  <div className={styles.recordsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Hora</th>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Chamado</th>
                          <th>Tema</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRecords.map((record, index) => (
                          <tr key={index}>
                            <td>{record[0]}</td>
                            <td>{record[1]}</td>
                            <td>{record[2]}</td>
                            <td>{record[3]}</td>
                            <td>{record[4]}</td>
                            <td>{record[5]}</td>
                            <td>{record[6]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session || !['support+', 'super'].includes(session.role)) {
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
        name: session.user.name,
        email: session.user.email,
      },
    },
  };
}
