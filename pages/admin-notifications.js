// pages/admin-notifications.js
import Head from 'next/head';
import { useState, useRef } from 'react';
import { getSession } from 'next-auth/react';
import { TextField, Button, ThemeProvider, createTheme, FormControlLabel, Checkbox, FormGroup, RadioGroup, Radio, Tab, Tabs, Box } from '@mui/material';
import { FaBell, FaFileAlt, FaSave, FaEye, FaUsers } from 'react-icons/fa';
import Layout from '../components/Layout';
import managerStyles from '../styles/Manager.module.css';
import adminStyles from '../styles/AdminNotifications.module.css';
// Removido ReactQuill para evitar dependências adicionais

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

// Função para converter markdown básico para HTML
const convertToHTML = (text) => {
  if (!text) return '';
  
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    // Blockquote
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraphs
    .replace(/^(.+)$/gim, '<p>$1</p>')
    // Clean up list wrapping
    .replace(/<p><li>/g, '<li>')
    .replace(/<\/li><\/p>/g, '</li>')
    // Clean up header wrapping
    .replace(/<p><h([1-6])>/g, '<h$1>')
    .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
    // Clean up blockquote wrapping
    .replace(/<p><blockquote>/g, '<blockquote>')
    .replace(/<\/blockquote><\/p>/g, '</blockquote>');
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AdminNotificationsPage({ user }) {
  // Estado das tabs
  const [currentTab, setCurrentTab] = useState(0);
  
  // Estados para Notificações
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState({
    support: false,
    'support+': false,
    analyst: false,
    tax: false,
    super: false,
    quality: false,
    partner: false,
    dev: false,
    other: false,
  });
  const [notificationType, setNotificationType] = useState('bell');
  const [notificationStyle, setNotificationStyle] = useState('aviso');
  
  // Estados para Patch Notes
  const [patchNoteTitle, setPatchNoteTitle] = useState('');
  const [patchNoteContent, setPatchNoteContent] = useState('');
  const [patchNoteSummary, setPatchNoteSummary] = useState('');
  const [patchNoteVersion, setPatchNoteVersion] = useState('');
  const [patchNoteLoading, setPatchNoteLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); 

  const handleProfileChange = (event) => {
    setSelectedProfiles({
      ...selectedProfiles,
      [event.target.name]: event.target.checked,
    });
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleNotificationSubmit = async () => {
    setNotificationLoading(true);
    try {
      const profilesToSend = Object.keys(selectedProfiles).filter(
        (profile) => selectedProfiles[profile]
      );

      // Usar os valores exatos do Supabase
      const profilesMap = {
        support: 'support',
        'support+': 'support+',
        analyst: 'analyst',
        tax: 'tax',
        super: 'super',
        quality: 'quality',
        partner: 'partner',
        dev: 'dev',
        other: 'other',
      };
      const profilesMapped = profilesToSend.map(profile => profilesMap[profile]).filter(Boolean);

      if (profilesMapped.length === 0) {
        alert('Selecione ao menos um perfil para enviar a notificação.');
        setNotificationLoading(false);
        return;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: notificationTitle, 
          message: notificationMessage, 
          profiles: profilesMapped, 
          notificationType, 
          notificationStyle 
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar notificação');
      }

      const data = await res.json();
      alert(data.message);
      
      // Reset form
      setNotificationTitle('');
      setNotificationMessage('');
      setSelectedProfiles({
        support: false,
        'support+': false,
        analyst: false,
        tax: false,
        super: false,
        quality: false,
        partner: false,
        dev: false,
        other: false,
      });
      setNotificationType('bell');
      setNotificationStyle('aviso');
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      alert('Erro ao enviar notificação');
    } finally {
      setNotificationLoading(false);
    }
  };

  const handlePatchNoteSubmit = async () => {
    setPatchNoteLoading(true);
    try {
      if (!patchNoteTitle || !patchNoteContent || !patchNoteSummary) {
        alert('Preencha todos os campos obrigatórios.');
        setPatchNoteLoading(false);
        return;
      }

      const res = await fetch('/api/patch-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: patchNoteTitle,
          content: convertToHTML(patchNoteContent),
          summary: patchNoteSummary,
          version: patchNoteVersion || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao criar patch note');
      }

      const data = await res.json();
      alert(data.message);
      
      // Reset form
      setPatchNoteTitle('');
      setPatchNoteContent('');
      setPatchNoteSummary('');
      setPatchNoteVersion('');
      setPreviewMode(false);
    } catch (error) {
      console.error('Erro ao criar patch note:', error);
      alert('Erro ao criar patch note');
    } finally {
      setPatchNoteLoading(false);
    }
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Painel Administrativo - Notificações & Patch Notes</title>
      </Head>

      <main className={adminStyles.mainContent}>
        <ThemeProvider theme={theme}>
          <div className={adminStyles.panelContainer}>
            {/* Header do Painel */}
            <div className={adminStyles.panelHeader}>
              <h1 className={adminStyles.panelTitle}>Painel Administrativo</h1>
              <p className={adminStyles.panelDescription}>
                Gerencie notificações do sistema e publique atualizações (patch notes)
              </p>
            </div>

            {/* Sistema de Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange} 
                aria-label="Admin panel tabs"
                className={adminStyles.tabs}
              >
                <Tab 
                  icon={<FaBell />} 
                  label="Notificações" 
                  id="admin-tab-0"
                  aria-controls="admin-tabpanel-0"
                />
                <Tab 
                  icon={<FaFileAlt />} 
                  label="Patch Notes" 
                  id="admin-tab-1"
                  aria-controls="admin-tabpanel-1"
                />
              </Tabs>
            </Box>

            {/* Tab Panel 1: Notificações */}
            <TabPanel value={currentTab} index={0}>
              <div className={adminStyles.formContainer}>
                <div className={adminStyles.formHeader}>
                  <FaBell className={adminStyles.formIcon} />
                  <div>
                    <h2 className={adminStyles.formTitle}>Enviar Notificação</h2>
                    <p className={adminStyles.formSubtitle}>
                      Crie notificações instantâneas para usuários específicos
                    </p>
                  </div>
                </div>

                <TextField
                  className={adminStyles.textField}
                  label="Título da Notificação"
                  variant="outlined"
                  fullWidth
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  required
                  placeholder="Ex: Manutenção programada do sistema"
                />

                <TextField
                  className={adminStyles.textarea}
                  label="Mensagem da Notificação"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  required
                  placeholder="Descreva a notificação de forma clara e concisa..."
                />

                {/* Seleção de Perfis */}
                <div className={adminStyles.profileSection}>
                  <h3 className={adminStyles.sectionTitle}>
                    <FaUsers className={adminStyles.sectionIcon} />
                    Perfis de Usuário
                  </h3>
                  <FormGroup className={adminStyles.profileGrid}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles.support}
                          onChange={handleProfileChange}
                          name="support"
                        />
                      }
                      label="Support"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles['support+']}
                          onChange={handleProfileChange}
                          name="support+"
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
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles.quality}
                          onChange={handleProfileChange}
                          name="quality"
                        />
                      }
                      label="Qualidade"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles.partner}
                          onChange={handleProfileChange}
                          name="partner"
                        />
                      }
                      label="Parceiro"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles.dev}
                          onChange={handleProfileChange}
                          name="dev"
                        />
                      }
                      label="Desenvolvedor"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedProfiles.other}
                          onChange={handleProfileChange}
                          name="other"
                        />
                      }
                      label="Outros"
                    />
                  </FormGroup>
                </div>

                {/* Configurações da Notificação */}
                <div className={adminStyles.configSection}>
                  <h3 className={adminStyles.sectionTitle}>Configurações</h3>
                  
                  <div className={adminStyles.radioSection}>
                    <h4>Tipo de Exibição</h4>
                    <RadioGroup
                      className={adminStyles.radioGroup}
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                      row
                    >
                      <FormControlLabel value="bell" control={<Radio />} label="Apenas Sino" />
                      <FormControlLabel value="top" control={<Radio />} label="Apenas Banner" />
                      <FormControlLabel value="both" control={<Radio />} label="Sino + Banner" />
                    </RadioGroup>
                  </div>

                  <div className={adminStyles.radioSection}>
                    <h4>Estilo da Notificação</h4>
                    <RadioGroup
                      className={adminStyles.radioGroup}
                      value={notificationStyle}
                      onChange={(e) => setNotificationStyle(e.target.value)}
                      row
                    >
                      <FormControlLabel value="aviso" control={<Radio />} label="⚠️ Aviso" />
                      <FormControlLabel value="informacao" control={<Radio />} label="ℹ️ Informação" />
                    </RadioGroup>
                  </div>
                </div>

                <div className={adminStyles.formButtonContainer}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleNotificationSubmit}
                    disabled={notificationLoading || !notificationTitle || !notificationMessage}
                    className={adminStyles.submitButton}
                    startIcon={<FaBell />}
                  >
                    {notificationLoading ? 'Enviando...' : 'Enviar Notificação'}
                  </Button>
                </div>
              </div>
            </TabPanel>

            {/* Tab Panel 2: Patch Notes */}
            <TabPanel value={currentTab} index={1}>
              <div className={adminStyles.formContainer}>
                <div className={adminStyles.formHeader}>
                  <FaFileAlt className={adminStyles.formIcon} />
                  <div>
                    <h2 className={adminStyles.formTitle}>Criar Patch Note</h2>
                    <p className={adminStyles.formSubtitle}>
                      Publique atualizações detalhadas do sistema com editor profissional
                    </p>
                  </div>
                </div>

                <div className={adminStyles.patchNoteForm}>
                  <div className={adminStyles.inputRow}>
                    <TextField
                      className={adminStyles.textField}
                      label="Título do Patch Note"
                      variant="outlined"
                      fullWidth
                      value={patchNoteTitle}
                      onChange={(e) => setPatchNoteTitle(e.target.value)}
                      required
                      placeholder="Ex: Atualização v2.1.0 - Melhorias no Sistema de Notificações"
                    />
                    <TextField
                      className={adminStyles.textField}
                      label="Versão (Opcional)"
                      variant="outlined"
                      style={{ minWidth: '150px' }}
                      value={patchNoteVersion}
                      onChange={(e) => setPatchNoteVersion(e.target.value)}
                      placeholder="v2.1.0"
                    />
                  </div>

                  <TextField
                    className={adminStyles.textField}
                    label="Resumo (Obrigatório)"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={2}
                    value={patchNoteSummary}
                    onChange={(e) => setPatchNoteSummary(e.target.value)}
                    required
                    placeholder="Breve resumo das principais mudanças desta atualização..."
                  />

                  {/* Editor de Texto */}
                  <div className={adminStyles.editorSection}>
                    <div className={adminStyles.editorHeader}>
                      <h4>Conteúdo do Patch Note</h4>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setPreviewMode(!previewMode)}
                        startIcon={<FaEye />}
                      >
                        {previewMode ? 'Editar' : 'Visualizar'}
                      </Button>
                    </div>

                    {!previewMode ? (
                      <div className={adminStyles.editorContainer}>
                        <TextField
                          multiline
                          rows={15}
                          fullWidth
                          variant="outlined"
                          value={patchNoteContent}
                          onChange={(e) => setPatchNoteContent(e.target.value)}
                          placeholder={`Escreva o conteúdo do patch note usando markdown básico:

# Título Principal
## Subtítulo
### Seção

**Texto em negrito** ou __negrito__
*Texto em itálico* ou _itálico_

- Item da lista
- Outro item
1. Lista numerada
2. Segundo item

&gt; Citação ou nota importante

Exemplo de uso:

# Novidades da Versão 2.1.0

## 🔔 Sistema de Notificações
- Notificações no sino da navbar
- Banner de avisos importantes
- Painel administrativo

## 🐛 Correções
- Corrigido problema X
- Melhorada performance Y

&gt; **Importante:** Esta atualização requer reinicialização do sistema.`}
                          className={adminStyles.markdownEditor}
                        />
                        
                        <div className={adminStyles.markdownHelp}>
                          <h5>💡 Dicas de Formatação:</h5>
                          <p><code># Título</code> • <code>**negrito**</code> • <code>*itálico*</code> • <code>- lista</code> • <code>&gt; citação</code></p>
                        </div>
                      </div>
                    ) : (
                      <div className={adminStyles.previewContainer}>
                        <div 
                          className={adminStyles.previewContent}
                          dangerouslySetInnerHTML={{ __html: convertToHTML(patchNoteContent) }}
                        />
                      </div>
                    )}
                  </div>

                  <div className={adminStyles.formButtonContainer}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handlePatchNoteSubmit}
                      disabled={patchNoteLoading || !patchNoteTitle || !patchNoteContent || !patchNoteSummary}
                      className={adminStyles.submitButton}
                      startIcon={<FaSave />}
                    >
                      {patchNoteLoading ? 'Publicando...' : 'Publicar Patch Note'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabPanel>
          </div>
        </ThemeProvider>
      </main>
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

  // Buscar dados completos do usuário incluindo permissões modulares
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  // Verificar se o usuário tem permissão de admin
  if (!userData?.admin) {
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
        
        // PERMISSÕES TRADICIONAIS
        admin: userData?.admin || false,
        can_ticket: userData?.can_ticket || false,
        can_phone: userData?.can_phone || false,
        can_chat: userData?.can_chat || false,
        
        // NOVAS PERMISSÕES MODULARES
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
}
