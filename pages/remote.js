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

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState({
    chamado: '',
    tema: null,
  });
  const [userRecords, setUserRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'support+') loadUserRecords();
    if (user.role === 'super') loadAllRecords();
  }, [user.role]);

  const loadUserRecords = async () => {
    try {
      const response = await fetch(`/api/get-remote-records?user=${encodeURIComponent(user.name)}`);
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
    if (!formData.tema || !formData.chamado) {
      Swal.fire('Erro', 'Todos os campos são obrigatórios.', 'error');
      return;
    }

    const date = new Date();
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR');

    try {
      const response = await fetch('/api/remote-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          time: formattedTime,
          name: user.name,
          chamado: formData.chamado,
          tema: formData.tema.value,
        }),
      });

      if (response.ok) {
        Swal.fire('Sucesso', 'Registro adicionado com sucesso.', 'success');
        setFormData({ chamado: '', tema: null });
        loadUserRecords(); // Atualizar os registros
      } else {
        Swal.fire('Erro', 'Falha ao adicionar registro. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao adicionar registro:', error);
      Swal.fire('Erro', 'Falha ao adicionar registro. Tente novamente.', 'error');
    }
  };

  return (
    <>
      <Head>
        <title>Remoto</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            {user.role === 'support+' && <Tab label="Formulário" />}
            {user.role === 'support+' && <Tab label="Meus Registros" />}
            {user.role === 'super' && <Tab label="Todos os Registros" />}
          </Tabs>
        </ThemeProvider>

        {currentTab === 0 && user.role === 'support+' && (
          <div className={styles.formContainer}>
            <h2>Registrar Acesso</h2>
            <form onSubmit={handleSubmit}>
              <label>Data e Hora</label>
              <p>{new Date().toLocaleString('pt-BR')}</p>

              <label>Nome</label>
              <p>{user.name}</p>

              <label>Número do Chamado</label>
              <input
                type="text"
                name="chamado"
                value={formData.chamado}
                onChange={handleInputChange}
                required
              />

              <label>Tema</label>
              <Select
                options={temaOptions}
                value={formData.tema}
                onChange={handleSelectChange}
                placeholder="Selecione um tema"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        )}

        {currentTab === 1 && user.role === 'support+' && (
          <div className={styles.dashboard}>
            <h2>Meus Registros</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Nome</th>
                  <th>Chamado</th>
                  <th>Tema</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentTab === 2 && user.role === 'super' && (
          <div className={styles.dashboard}>
            <h2>Registros Gerais</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Nome</th>
                  <th>Chamado</th>
                  <th>Tema</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
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
      },
    },
  };
}
