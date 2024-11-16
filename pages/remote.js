import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Select from 'react-select';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
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
  const [formData, setFormData] = useState({
    datetime: new Date(),
    userName: user?.name || '',
    chamado: '',
    tema: null,
  });
  const [records, setRecords] = useState([]);
  const router = useRouter();

  // Determinar quais abas exibir com base no papel do usuário e permissões
  const showAllRecordsTab = user.role === 'super';
  const showFormAndUserRecordsTabs = user.remoto;

  useEffect(() => {
    if (showFormAndUserRecordsTabs) {
      const loadRecords = async () => {
        try {
          const res = await fetch(`/api/get-remote-records?userId=${user.id}`);
          if (!res.ok) throw new Error('Erro ao carregar registros');
          const data = await res.json();
          setRecords(data.records);
        } catch (err) {
          console.error('Erro ao carregar registros:', err);
        }
      };
      loadRecords();
    }
  }, [user.id, showFormAndUserRecordsTabs]);

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
    try {
      const response = await fetch('/api/register-remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datetime: new Date().toISOString(),
          userName: formData.userName,
          chamado: formData.chamado,
          tema: formData.tema ? formData.tema.value : '',
        }),
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registro salvo com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({
          datetime: new Date(),
          userName: user?.name || '',
          chamado: '',
          tema: null,
        });
        // Atualiza a lista de registros
        const newRecord = await response.json();
        setRecords((prev) => [...prev, newRecord]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao salvar o registro',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar o registro:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao salvar o registro',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const renderDashboard = (recordsToRender) => (
    <table className={styles.recordsTable}>
      <thead>
        <tr>
          <th>Data</th>
          <th>Hora</th>
          <th>Usuário</th>
          <th>Número do Chamado</th>
          <th>Tema</th>
        </tr>
      </thead>
      <tbody>
        {recordsToRender.map((record, index) => (
          <tr key={index}>
            <td>{new Date(record.datetime).toLocaleDateString('pt-BR')}</td>
            <td>{new Date(record.datetime).toLocaleTimeString('pt-BR')}</td>
            <td>{record.userName}</td>
            <td>{record.chamado}</td>
            <td>{record.tema}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <Head>
        <title>Remote - Gerenciar Registros</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            {showFormAndUserRecordsTabs && (
              <>
                <Tab label="Formulário" />
                <Tab label="Meus Registros" />
              </>
            )}
            {showAllRecordsTab && <Tab label="Todos os Registros" />}
          </Tabs>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {showFormAndUserRecordsTabs && currentTab === 0 && (
            <form onSubmit={handleSubmit} className={styles.formContainer}>
              <div className={styles.formGroup}>
                <label htmlFor="datetime">Data e Hora</label>
                <input
                  type="text"
                  id="datetime"
                  name="datetime"
                  value={formData.datetime.toLocaleString('pt-BR')}
                  readOnly
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="userName">Nome do Usuário</label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={formData.userName}
                  readOnly
                />
              </div>
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
                  classNamePrefix="react-select"
                  required
                />
              </div>
              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton}>
                  Registrar
                </button>
              </div>
            </form>
          )}
          {showFormAndUserRecordsTabs && currentTab === 1 && renderDashboard(records.filter(record => record.userName === user.name))}
          {showAllRecordsTab && currentTab === (showFormAndUserRecordsTabs ? 2 : 0) && renderDashboard(records)}
        </div>
      </main>

      <Footer />
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
  
    try {
      const apiUrl = process.env.NEXTAUTH_URL || '';
      if (!apiUrl) {
        throw new Error('NEXTAUTH_URL não está definida.');
      }
  
      // Fetch user permissions from Google Sheets
      const userRes = await fetch(`${apiUrl}/api/get-users`);
      if (!userRes.ok) {
        throw new Error(`Erro ao buscar usuários: ${userRes.statusText}`);
      }
      
      const userData = await userRes.json();
      const currentUser = userData.users.find(user => user.id === session.id);
  
      return {
        props: {
          user: {
            ...session.user,
            role: session.role,
            id: session.id,
            remoto: currentUser?.remoto || false,
          },
        },
      };
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }
  }
  