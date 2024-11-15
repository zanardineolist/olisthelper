import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Remote.module.css';
import Select from 'react-select';
import Swal from 'sweetalert2';

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
  const [records, setRecords] = useState([]);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

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

  const handleSelectChange = (selectedOption, actionMeta) => {
    const { name } = actionMeta;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/register-remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chamado: formData.chamado,
          tema: formData.tema?.value,
          userName: user.name,
          userEmail: user.email,
        }),
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registro de acesso efetuado com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ chamado: '', tema: null });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar acesso',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar acesso',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/get-remote-records?userId=${user.id}&role=${user.role}`);
      if (!res.ok) throw new Error('Erro ao carregar registros');
      const data = await res.json();
      setRecords(data.records);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar registros.',
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab > 0) {
      loadRecords();
    }
  }, [currentTab]);

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
        <title>Remote Access</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            <Tab label="Registrar Acesso" />
            <Tab label="Meus Registros" />
            {user.role === 'super' && <Tab label="Todos os Registros" />}
          </Tabs>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && (
            <div className={styles.formContainer}>
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
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="tema">Tema</label>
                  <Select
                    id="tema"
                    name="tema"
                    options={[
                      { value: 'Certificado A1', label: 'Certificado A1' },
                      { value: 'Certificado A3', label: 'Certificado A3' },
                      { value: 'Etiqueta de produto', label: 'Etiqueta de produto' },
                      { value: 'SAT', label: 'SAT' },
                    ]}
                    value={formData.tema}
                    onChange={handleSelectChange}
                    isClearable
                    placeholder="Selecione um tema"
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
              {records.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Chamado</th>
                      <th>Tema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.time}</td>
                        <td>{record.userName}</td>
                        <td>{record.userEmail}</td>
                        <td>{record.chamado}</td>
                        <td>{record.tema}</td>
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
              {records.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Chamado</th>
                      <th>Tema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.time}</td>
                        <td>{record.userName}</td>
                        <td>{record.userEmail}</td>
                        <td>{record.chamado}</td>
                        <td>{record.tema}</td>
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

export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || (!session.remoteAccess && session.role !== 'super')) {
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
        remoteAccess: session.remoteAccess || false,
      },
    },
  };
}