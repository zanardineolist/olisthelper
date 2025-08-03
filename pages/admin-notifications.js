// pages/admin-notifications.js
import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import { TextField, Button, ThemeProvider, createTheme, FormControlLabel, Checkbox, FormGroup, RadioGroup, Radio, Tab, Tabs, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { FaBell, FaFileAlt, FaSave, FaEye, FaUsers, FaList, FaEdit, FaTrash, FaCog, FaTimes, FaCalendarAlt, FaUser } from 'react-icons/fa';
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

// Função para converter HTML básico de volta para markdown (para edição)
const convertToMarkdown = (html) => {
  if (!html) return '';
  
  return html
    // Headers
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1')
    // Bold
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    // Italic
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    // Lists
    .replace(/<li>(.*?)<\/li>/g, '- $1')
    // Blockquote
    .replace(/<blockquote>(.*?)<\/blockquote>/g, '&gt; $1')
    // Paragraphs and breaks
    .replace(/<\/p><p>/g, '\n\n')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '')
    .replace(/<br>/g, '\n')
    // Clean up
    .trim();
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
  
  // Estados para Gerenciamento
  const [sentNotifications, setSentNotifications] = useState([]);
  const [sentPatchNotes, setSentPatchNotes] = useState([]);
  const [managementLoading, setManagementLoading] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, type: null, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, item: null });
  
  // Estados para edição
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editVersion, setEditVersion] = useState('');
  
    // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Função para mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 5000);
  };

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

  // Função para buscar notificações enviadas
  const fetchSentNotifications = async () => {
    setManagementLoading(true);
    try {
      const response = await fetch('/api/admin/notifications');
      if (response.ok) {
        const data = await response.json();
        setSentNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  // Função para buscar patch notes enviados
  const fetchSentPatchNotes = async () => {
    setManagementLoading(true);
    try {
      const response = await fetch('/api/admin/patch-notes');
      if (response.ok) {
        const data = await response.json();
        setSentPatchNotes(data.patchNotes || []);
      }
    } catch (error) {
      console.error('Erro ao buscar patch notes:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  // Carregar dados quando as tabs de gerenciamento são acessadas
  useEffect(() => {
    if (currentTab === 1) { // Tab de gerenciar notificações
      fetchSentNotifications();
    } else if (currentTab === 3) { // Tab de gerenciar patch notes
      fetchSentPatchNotes();
    }
  }, [currentTab]);

  // Função para abrir dialog de edição
  const handleEdit = (type, item) => {
    setEditDialog({ open: true, type, item });
    if (type === 'notification') {
      setEditTitle(item.title);
      setEditContent(item.message);
    } else {
      setEditTitle(item.title);
      // Para patch notes, converter HTML de volta para markdown para edição
      setEditContent(convertToMarkdown(item.content));
      setEditSummary(item.summary);
      setEditVersion(item.version || '');
    }
  };

  // Função para abrir dialog de exclusão
  const handleDelete = (type, item) => {
    setDeleteDialog({ open: true, type, item });
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    try {
      const { type, item } = editDialog;
      const endpoint = type === 'notification' ? '/api/admin/notifications' : '/api/admin/patch-notes';
      
      const payload = type === 'notification' 
        ? { title: editTitle, message: editContent }
        : { title: editTitle, content: convertToHTML(editContent), summary: editSummary, version: editVersion };

      const response = await fetch(`${endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const itemType = type === 'notification' ? 'Notificação' : 'Patch Note';
        showToast(`${itemType} atualizado com sucesso!`, 'success');
        setEditDialog({ open: false, type: null, item: null });
        // Recarregar lista
        if (type === 'notification') {
          fetchSentNotifications();
        } else {
          fetchSentPatchNotes();
        }
      } else {
        throw new Error('Erro ao atualizar item');
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      const itemType = editDialog.type === 'notification' ? 'notificação' : 'patch note';
      showToast(`Erro ao atualizar ${itemType}. Tente novamente.`, 'error');
    }
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    try {
      const { type, item } = deleteDialog;
      const endpoint = type === 'notification' ? '/api/admin/notifications' : '/api/admin/patch-notes';

      const response = await fetch(`${endpoint}/${item.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const itemType = type === 'notification' ? 'Notificação' : 'Patch Note';
        showToast(`${itemType} excluído com sucesso!`, 'success');
        setDeleteDialog({ open: false, type: null, item: null });
        // Recarregar lista
        if (type === 'notification') {
          fetchSentNotifications();
        } else {
          fetchSentPatchNotes();
        }
      } else {
        throw new Error('Erro ao excluir item');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      const itemType = deleteDialog.type === 'notification' ? 'notificação' : 'patch note';
      showToast(`Erro ao excluir ${itemType}. Tente novamente.`, 'error');
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
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab 
                  icon={<FaBell />} 
                  label="Enviar Notificação" 
                  id="admin-tab-0"
                  aria-controls="admin-tabpanel-0"
                />
                <Tab 
                  icon={<FaList />} 
                  label="Gerenciar Notificações" 
                  id="admin-tab-1"
                  aria-controls="admin-tabpanel-1"
                />
                <Tab 
                  icon={<FaFileAlt />} 
                  label="Criar Patch Note" 
                  id="admin-tab-2"
                  aria-controls="admin-tabpanel-2"
                />
                <Tab 
                  icon={<FaCog />} 
                  label="Gerenciar Patch Notes" 
                  id="admin-tab-3"
                  aria-controls="admin-tabpanel-3"
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

            {/* Tab Panel 2: Gerenciar Notificações */}
            <TabPanel value={currentTab} index={1}>
              <div className={adminStyles.formContainer}>
                <div className={adminStyles.formHeader}>
                  <FaList className={adminStyles.formIcon} />
                  <div>
                    <h2 className={adminStyles.formTitle}>Gerenciar Notificações</h2>
                    <p className={adminStyles.formSubtitle}>
                      Visualize, edite e exclua notificações enviadas
                    </p>
                  </div>
                </div>

                {managementLoading ? (
                  <div className={adminStyles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                    <p>Carregando notificações...</p>
                  </div>
                ) : sentNotifications.length === 0 ? (
                  <div className={adminStyles.emptyState}>
                    <FaBell className={adminStyles.emptyIcon} />
                    <h3>Nenhuma notificação encontrada</h3>
                    <p>Você ainda não enviou nenhuma notificação.</p>
                  </div>
                ) : (
                  <div className={adminStyles.itemsList}>
                    {sentNotifications.map((notification) => (
                      <div key={notification.id} className={adminStyles.itemCard}>
                        <div className={adminStyles.itemHeader}>
                          <div className={adminStyles.itemInfo}>
                            <h3 className={adminStyles.itemTitle}>{notification.title}</h3>
                            <div className={adminStyles.itemMeta}>
                              <span className={adminStyles.metaItem}>
                                <FaCalendarAlt className={adminStyles.metaIcon} />
                                {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className={adminStyles.metaItem}>
                                <FaUser className={adminStyles.metaIcon} />
                                {notification.creator_name || 'Sistema'}
                              </span>
                              <span className={`${adminStyles.badge} ${adminStyles[notification.notification_style]}`}>
                                {notification.notification_style === 'aviso' ? '⚠️ Aviso' : 'ℹ️ Informação'}
                              </span>
                              <span className={`${adminStyles.badge} ${adminStyles.typeBadge}`}>
                                {notification.notification_type === 'bell' ? '🔔 Sino' : 
                                 notification.notification_type === 'top' ? '📢 Banner' : '🔔📢 Ambos'}
                              </span>
                            </div>
                          </div>
                          <div className={adminStyles.itemActions}>
                            <IconButton 
                              onClick={() => handleEdit('notification', notification)}
                              className={adminStyles.editButton}
                              title="Editar"
                            >
                              <FaEdit />
                            </IconButton>
                            <IconButton 
                              onClick={() => handleDelete('notification', notification)}
                              className={adminStyles.deleteButton}
                              title="Excluir"
                            >
                              <FaTrash />
                            </IconButton>
                          </div>
                        </div>
                        <div className={adminStyles.itemContent}>
                          <p>{notification.message}</p>
                        </div>
                        <div className={adminStyles.itemFooter}>
                          <div className={adminStyles.profilesList}>
                            <strong>Direcionado para:</strong>
                            {notification.target_profiles?.map((profile, idx) => (
                              <span key={idx} className={adminStyles.profileTag}>
                                {profile}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Tab Panel 3: Criar Patch Notes */}
            <TabPanel value={currentTab} index={2}>
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

            {/* Tab Panel 4: Gerenciar Patch Notes */}
            <TabPanel value={currentTab} index={3}>
              <div className={adminStyles.formContainer}>
                <div className={adminStyles.formHeader}>
                  <FaCog className={adminStyles.formIcon} />
                  <div>
                    <h2 className={adminStyles.formTitle}>Gerenciar Patch Notes</h2>
                    <p className={adminStyles.formSubtitle}>
                      Visualize, edite e exclua patch notes publicados
                    </p>
                  </div>
                </div>

                {managementLoading ? (
                  <div className={adminStyles.loadingContainer}>
                    <div className="standardBoxLoader"></div>
                    <p>Carregando patch notes...</p>
                  </div>
                ) : sentPatchNotes.length === 0 ? (
                  <div className={adminStyles.emptyState}>
                    <FaFileAlt className={adminStyles.emptyIcon} />
                    <h3>Nenhum patch note encontrado</h3>
                    <p>Você ainda não criou nenhum patch note.</p>
                  </div>
                ) : (
                  <div className={adminStyles.itemsList}>
                    {sentPatchNotes.map((patchNote) => (
                      <div key={patchNote.id} className={adminStyles.itemCard}>
                        <div className={adminStyles.itemHeader}>
                          <div className={adminStyles.itemInfo}>
                            <h3 className={adminStyles.itemTitle}>{patchNote.title}</h3>
                            <div className={adminStyles.itemMeta}>
                              <span className={adminStyles.metaItem}>
                                <FaCalendarAlt className={adminStyles.metaIcon} />
                                {new Date(patchNote.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className={adminStyles.metaItem}>
                                <FaUser className={adminStyles.metaIcon} />
                                {patchNote.creator_name || 'Sistema'}
                              </span>
                              {patchNote.version && (
                                <span className={`${adminStyles.badge} ${adminStyles.versionBadge}`}>
                                  v{patchNote.version}
                                </span>
                              )}
                              {patchNote.featured && (
                                <span className={`${adminStyles.badge} ${adminStyles.featuredBadge}`}>
                                  ⭐ Destaque
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={adminStyles.itemActions}>
                            <IconButton 
                              onClick={() => handleEdit('patchnote', patchNote)}
                              className={adminStyles.editButton}
                              title="Editar"
                            >
                              <FaEdit />
                            </IconButton>
                            <IconButton 
                              onClick={() => handleDelete('patchnote', patchNote)}
                              className={adminStyles.deleteButton}
                              title="Excluir"
                            >
                              <FaTrash />
                            </IconButton>
                          </div>
                        </div>
                        <div className={adminStyles.itemContent}>
                          <p><strong>Resumo:</strong> {patchNote.summary}</p>
                          <div 
                            className={adminStyles.patchNotePreview}
                            dangerouslySetInnerHTML={{ __html: patchNote.content.substring(0, 200) + '...' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabPanel>
          </div>

          {/* Dialog de Edição */}
          <Dialog 
            open={editDialog.open} 
            onClose={() => setEditDialog({ open: false, type: null, item: null })}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <div className={adminStyles.dialogHeader}>
                <span>Editar {editDialog.type === 'notification' ? 'Notificação' : 'Patch Note'}</span>
                <IconButton onClick={() => setEditDialog({ open: false, type: null, item: null })}>
                  <FaTimes />
                </IconButton>
              </div>
            </DialogTitle>
            <DialogContent>
              <div className={adminStyles.dialogContent}>
                <TextField
                  label="Título"
                  fullWidth
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  margin="normal"
                />
                
                {editDialog.type === 'patchnote' && (
                  <>
                    <TextField
                      label="Versão (Opcional)"
                      fullWidth
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      label="Resumo"
                      fullWidth
                      multiline
                      rows={2}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      margin="normal"
                    />
                  </>
                )}

                <TextField
                  label={editDialog.type === 'notification' ? 'Mensagem' : 'Conteúdo'}
                  fullWidth
                  multiline
                  rows={editDialog.type === 'notification' ? 4 : 8}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  margin="normal"
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialog({ open: false, type: null, item: null })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} variant="contained" startIcon={<FaSave />}>
                Salvar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <Dialog 
            open={deleteDialog.open} 
            onClose={() => setDeleteDialog({ open: false, type: null, item: null })}
            maxWidth="sm"
          >
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <p>
                Tem certeza que deseja excluir {deleteDialog.type === 'notification' ? 'esta notificação' : 'este patch note'}?
              </p>
              <p><strong>"{deleteDialog.item?.title}"</strong></p>
              <p className={adminStyles.warningText}>Esta ação não pode ser desfeita.</p>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog({ open: false, type: null, item: null })}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmDelete} 
                variant="contained" 
                color="error"
                startIcon={<FaTrash />}
              >
                Excluir
              </Button>
            </DialogActions>
          </Dialog>

          {/* Toast Notification */}
          {toast.show && (
            <div className={`${adminStyles.toast} ${adminStyles[toast.type]}`}>
              <span className={adminStyles.toastIcon}>
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              {toast.message}
            </div>
          )}
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
