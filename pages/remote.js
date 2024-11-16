import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Select from 'react-select';
import Swal from 'sweetalert2';
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

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    chamado: '',
    tema: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [registros, setRegistros] = useState([]);
  const router = useRouter();

  // Opções do tema
  const temaOptions = [
    { value: 'Certificado A1', label: 'Certificado A1' },
    { value: 'Certificado A3', label: 'Certificado A3' },
    { value: 'Etiqueta de Produto', label: 'Etiqueta de Produto' },
    { value: 'SAT', label: 'SAT' },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    // Carregar registros quando mudar de aba ou quando a página carregar
    if (currentTab === 1 || (currentTab === 2 && user.role === 'super')) {
      loadRegistros();
    }
  }, [currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      tema: selectedOption,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/remote-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chamado: formData.chamado,
          tema: formData.tema.value,
          userName: user.name,
          userId: user.id,
        }),
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registro criado com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ chamado: '', tema: null });
        loadRegistros(); // Atualizar os registros após registrar
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-remote-logs?userId=${user.id}&role=${user.role}`);
      if (response.ok) {
        const data = await response.json();
        setRegistros(data.registros);
      } else {
        console.error('Erro ao carregar registros');
      }
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
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
        <title>Registro Remoto</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.mainContent}>
        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            <Tab label="Registrar Acesso" />
            <Tab label="Meus Registros" />
            {user.role === 'super' && <Tab label="Todos os Registros" />}
          </Tabs>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && (
            <div className={styles.formContainerWithSpacing}>
              <h2 className={styles.formTitle}>Registrar Acesso</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="chamado">Número do Chamado</label>
                  <input
                    type="text"
                    id="chamado"
                    name="chamado"
                    value={formData.chamado}
                    onChange={handleInputChange}
                    required
                    className={styles.formInput}
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
                    placeholder="Selecione um tema"
                    classNamePrefix="react-select"
                    required
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

          {currentTab === 1 && (
            <div className={styles.dashboard}>
              <h2>Meus Registros</h2>
              {registros.length > 0 ? (
                <table className={styles.registroTable}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Chamado</th>
                      <th>Tema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro, index) => (
                      <tr key={index}>
                        <td>{registro.data}</td>
                        <td>{registro.hora}</td>
                        <td>{registro.chamado}</td>
                        <td>{registro.tema}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhum registro encontrado.</p>
              )}
            </div>
          )}

          {currentTab === 2 && user.role === 'super' && (
            <div className={styles.dashboard}>
              <h2>Todos os Registros</h2>
              {registros.length > 0 ? (
                <table className={styles.registroTable}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Usuário</th>
                      <th>Chamado</th>
                      <th>Tema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro, index) => (
                      <tr key={index}>
                        <td>{registro.data}</td>
                        <td>{registro.hora}</td>
                        <td>{registro.usuario}</td>
                        <td>{registro.chamado}</td>
                        <td>{registro.tema}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhum registro encontrado.</p>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
