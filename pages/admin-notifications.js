// pages/admin-notifications.js
import Head from 'next/head';
import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { TextField, Button, ThemeProvider, createTheme, FormControlLabel, Checkbox, FormGroup } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Manager.module.css';

const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '20px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          marginTop: '20px',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-white)',
          '&:hover': {
            backgroundColor: 'var(--color-primary-hover)',
          },
        },
      },
    },
  },
});

export default function AdminNotificationsPage({ user }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState({
    supportPlus: false,
    analyst: false,
    tax: false,
    super: false,
  });

  const handleProfileChange = (event) => {
    setSelectedProfiles({
      ...selectedProfiles,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const profilesToSend = Object.keys(selectedProfiles).filter(
        (profile) => selectedProfiles[profile]
      );

      // Converter os perfis para os nomes corretos da planilha
      const profilesMap = {
        supportPlus: 'Support Plus',
        analyst: 'Analista',
        tax: 'Fiscal',
        super: 'Supervisão',
      };
      const profilesMapped = profilesToSend.map(profile => profilesMap[profile]);

      if (profilesMapped.length === 0) {
        alert('Selecione ao menos um perfil para enviar a notificação.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, message, profiles: profilesMapped }),
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar notificação');
      }

      const data = await res.json();
      alert(data.message);
      setTitle('');
      setMessage('');
      setSelectedProfiles({
        supportPlus: false,
        analyst: false,
        tax: false,
        super: false,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      alert('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Administração de Notificações</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <div className={styles.formContainer}>
            <h2>Enviar Nova Notificação</h2>
            <TextField
              label="Título da Notificação"
              variant="outlined"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <TextField
              label="Mensagem da Notificação"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProfiles.supportPlus}
                    onChange={handleProfileChange}
                    name="supportPlus"
                  />
                }
                label="Support Plus"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProfiles.analyst}
                    onChange={handleProfileChange}
                    name="analyst"
                  />
                }
                label="Analista"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProfiles.tax}
                    onChange={handleProfileChange}
                    name="tax"
                  />
                }
                label="Fiscal"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProfiles.super}
                    onChange={handleProfileChange}
                    name="super"
                  />
                }
                label="Supervisão"
              />
            </FormGroup>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || !title || !message}
            >
              {loading ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </div>
        </ThemeProvider>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || session.role !== 'dev') {
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
        name: session.user?.name ?? 'Unknown',
      },
    },
  };
}
