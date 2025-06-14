// pages/admin-notifications.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/AdminNotifications.module.css';
import { TextField, Button, ThemeProvider, createTheme, FormControlLabel, Checkbox, FormGroup, RadioGroup, Radio } from '@mui/material';

import managerStyles from '../styles/Manager.module.css';

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
  const [notificationType, setNotificationType] = useState('bell');
  const [notificationStyle, setNotificationStyle] = useState('aviso'); 

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

      // Usar os valores exatos da planilha
      const profilesMap = {
        supportPlus: 'support+',
        analyst: 'analyst',
        tax: 'tax',
        super: 'super',
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
        body: JSON.stringify({ title, message, profiles: profilesMapped, notificationType, notificationStyle }),
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
      setNotificationType('bell'); // Resetar tipo de notificação
      setNotificationStyle('aviso'); // Resetar estilo de notificação
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      alert('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Administração de Notificações</title>
      </Head>

      <main className={styles.mainContent}>
        <ThemeProvider theme={theme}>
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Enviar Nova Notificação</h2>
            <TextField
              className={styles.textField}
              label="Título da Notificação"
              variant="outlined"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <TextField
              className={styles.textarea}
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
              <RadioGroup
                className={styles.radioGroup}
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                row
              >
                <FormControlLabel value="bell" control={<Radio />} label="Sino (Navbar)" />
                <FormControlLabel value="top" control={<Radio />} label="Banner no Topo" />
                <FormControlLabel value="both" control={<Radio />} label="Ambos" />
              </RadioGroup>
              <RadioGroup
                className={styles.radioGroup}
                value={notificationStyle}
                onChange={(e) => setNotificationStyle(e.target.value)}
                row
              >
                <FormControlLabel value="aviso" control={<Radio />} label="Aviso" />
                <FormControlLabel value="informacao" control={<Radio />} label="Informação" />
              </RadioGroup>
              <div className={styles.formButtonContainer}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={loading || !title || !message}
                  className={styles.submitButton}
                >
                  {loading ? 'Enviando...' : 'Enviar Notificação'}
                </Button>
              </div>
            </div>
          </ThemeProvider>
                </main>
      </Layout>
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
