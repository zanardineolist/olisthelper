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

// Função melhorada para converter markdown para HTML
const convertToHTML = (text) => {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Process line by line for better control
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle headers
    if (trimmedLine.startsWith('### ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h3>${trimmedLine.substring(4)}</h3>`);
      continue;
    } else if (trimmedLine.startsWith('## ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h2>${trimmedLine.substring(3)}</h2>`);
      continue;
    } else if (trimmedLine.startsWith('# ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h1>${trimmedLine.substring(2)}</h1>`);
      continue;
    }
    
    // Handle unordered lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push('</ol>');
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
      continue;
    }
    
    // Handle ordered lists
    const orderedMatch = trimmedLine.match(/^(\d+)\. (.+)$/);
    if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push('</ul>');
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${orderedMatch[2]}</li>`);
      continue;
    }
    
    // Handle blockquotes
    if (trimmedLine.startsWith('&gt; ') || trimmedLine.startsWith('> ')) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const quoteContent = trimmedLine.startsWith('&gt; ') ? trimmedLine.substring(5) : trimmedLine.substring(2);
      processedLines.push(`<blockquote>${quoteContent}</blockquote>`);
      continue;
    }
    
    // Handle empty lines
    if (trimmedLine === '') {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push('');
      continue;
    }
    
    // Regular paragraph
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
    processedLines.push(line);
  }
  
  // Close any remaining list
  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  html = processedLines.join('\n');
  
  // Process inline formatting
  html = html
    // Bold (** or __)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Italic (* or _) - avoid conflicts with bold
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
    // Code (backticks)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraphs, but not headers, lists, or blockquotes
  const wrappedLines = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '' || 
        trimmed.startsWith('<h') || 
        trimmed.startsWith('<ul>') || 
        trimmed.startsWith('<ol>') || 
        trimmed.startsWith('</ul>') || 
        trimmed.startsWith('</ol>') || 
        trimmed.startsWith('<li>') || 
        trimmed.startsWith('<blockquote>')) {
      return line;
    }
    return `<p>${line}</p>`;
  });
  
  return wrappedLines.join('\n')
    .replace(/<p><\/p>/g, '')
    .replace(/\n+/g, '\n')
    .trim();
};

// Função melhorada para converter HTML de volta para markdown
const convertToMarkdown = (html) => {
  if (!html) return '';
  
  let markdown = html;
  
  // Convert headers
  markdown = markdown
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1');
  
  // Convert formatting
  markdown = markdown
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Convert lists
  markdown = markdown
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1');
  
  // Convert blockquotes
  markdown = markdown
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1');
  
  // Convert paragraphs and breaks
  markdown = markdown
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/<br[^>]*>/gi, '\n');
  
  // Clean up HTML entities
  markdown = markdown
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  // Clean up extra whitespace
  markdown = markdown
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
  
  return markdown;
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
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editPreviewMode, setEditPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
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
        showToast('Selecione ao menos um perfil para enviar a notificação.', 'warning');
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
      showToast(data.message || 'Notificação enviada com sucesso!', 'success');
      
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
      showToast('Erro ao enviar notificação. Tente novamente.', 'error');
    } finally {
      setNotificationLoading(false);
    }
  };

  const handlePatchNoteSubmit = async () => {
    setPatchNoteLoading(true);
    try {
      if (!patchNoteTitle || !patchNoteContent || !patchNoteSummary) {
        showToast('Preencha todos os campos obrigatórios.', 'warning');
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
      showToast(data.message || 'Patch Note criado com sucesso!', 'success');
      
      // Reset form
      setPatchNoteTitle('');
      setPatchNoteContent('');
      setPatchNoteSummary('');
      setPatchNoteVersion('');
      setPreviewMode(false);
    } catch (error) {
      console.error('Erro ao criar patch note:', error);
      showToast('Erro ao criar patch note. Tente novamente.', 'error');
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

  // Detectar mudanças nos campos de edição
  useEffect(() => {
    if (editDialog.open) {
      setHasUnsavedChanges(detectChanges());
    }
  }, [editTitle, editContent, editSummary, editVersion, editDialog]);

  // Função para validar campos do modal de edição
  const validateEdit = () => {
    const errors = {};
    if (!editTitle.trim()) errors.title = 'Título é obrigatório';
    if (!editContent.trim()) errors.content = 'Conteúdo é obrigatório';
    if (editDialog.type === 'patchnote' && !editSummary.trim()) {
      errors.summary = 'Resumo é obrigatório para patch notes';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Função para detectar mudanças nos campos de edição
  const detectChanges = () => {
    const { item, type } = editDialog;
    if (!item) return false;

    if (type === 'notification') {
      return editTitle !== item.title || editContent !== item.message;
    } else {
      const originalContent = convertToMarkdown(item.content);
      return (
        editTitle !== item.title ||
        editContent !== originalContent ||
        editSummary !== item.summary ||
        editVersion !== (item.version || '')
      );
    }
  };

  // Função para fechar modal com confirmação de mudanças não salvas
  const handleCloseEdit = () => {
    if (hasUnsavedChanges && detectChanges()) {
      if (confirm('Você tem alterações não salvas. Deseja realmente fechar?')) {
        resetEditForm();
      }
    } else {
      resetEditForm();
    }
  };

  // Função para resetar formulário de edição
  const resetEditForm = () => {
    setEditDialog({ open: false, type: null, item: null });
    setEditTitle('');
    setEditContent('');
    setEditSummary('');
    setEditVersion('');
    setEditErrors({});
    setHasUnsavedChanges(false);
    setEditPreviewMode(false);
  };

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
    setEditErrors({});
    setHasUnsavedChanges(false);
    setEditPreviewMode(false);
  };

  // Função para abrir dialog de exclusão
  const handleDelete = (type, item) => {
    setDeleteDialog({ open: true, type, item });
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!validateEdit()) {
      showToast('Por favor, corrija os erros no formulário.', 'warning');
      return;
    }

    setEditLoading(true);
    const { type, item } = editDialog;
    
    try {
      setActionLoading(prev => ({ ...prev, [item.id]: true }));
      
      const endpoint = type === 'notification' ? '/api/admin/notifications' : '/api/admin/patch-notes';
      
      const payload = type === 'notification' 
        ? { title: editTitle.trim(), message: editContent.trim() }
        : { 
            title: editTitle.trim(), 
            content: convertToHTML(editContent.trim()), 
            summary: editSummary.trim(), 
            version: editVersion.trim() || null 
          };

      const response = await fetch(`${endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const itemType = type === 'notification' ? 'Notificação' : 'Patch Note';
        showToast(`${itemType} atualizado com sucesso!`, 'success');
        resetEditForm();
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
    } finally {
      setEditLoading(false);
      setActionLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    const { type, item } = deleteDialog;
    setManagementLoading(true);
    
    try {
      setActionLoading(prev => ({ ...prev, [item.id]: true }));
      
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
    } finally {
      setManagementLoading(false);
      setActionLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Painel Administrativo - Notificações & Patch Notes</title>
      </Head>

      <main className={`${adminStyles.mainContent} ${adminStyles.container}`}>
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
                      <div 
                        key={notification.id} 
                        className={`${adminStyles.itemCard} ${actionLoading[notification.id] ? adminStyles.processing : ''}`}
                      >
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
                            {actionLoading[notification.id] ? (
                              <div className="standardBoxLoader"></div>
                            ) : (
                              <>
                                <IconButton 
                                  onClick={() => handleEdit('notification', notification)}
                                  className={adminStyles.editButton}
                                  title="Editar"
                                  disabled={managementLoading}
                                >
                                  <FaEdit />
                                </IconButton>
                                <IconButton 
                                  onClick={() => handleDelete('notification', notification)}
                                  className={adminStyles.deleteButton}
                                  title="Excluir"
                                  disabled={managementLoading}
                                >
                                  <FaTrash />
                                </IconButton>
                              </>
                            )}
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
                      <div 
                        key={patchNote.id} 
                        className={`${adminStyles.itemCard} ${actionLoading[patchNote.id] ? adminStyles.processing : ''}`}
                      >
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
                            {actionLoading[patchNote.id] ? (
                              <div className="standardBoxLoader"></div>
                            ) : (
                              <>
                                <IconButton 
                                  onClick={() => handleEdit('patchnote', patchNote)}
                                  className={adminStyles.editButton}
                                  title="Editar"
                                  disabled={managementLoading}
                                >
                                  <FaEdit />
                                </IconButton>
                                <IconButton 
                                  onClick={() => handleDelete('patchnote', patchNote)}
                                  className={adminStyles.deleteButton}
                                  title="Excluir"
                                  disabled={managementLoading}
                                >
                                  <FaTrash />
                                </IconButton>
                              </>
                            )}
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

          {/* Dialog de Edição Melhorado */}
          <Dialog 
            open={editDialog.open} 
            onClose={handleCloseEdit}
            maxWidth="lg"
            fullWidth
            className={adminStyles.editDialog}
            PaperProps={{
              style: {
                backgroundColor: 'var(--box-color)',
                color: 'var(--text-color)',
                borderRadius: '12px',
                maxHeight: '90vh',
                border: '1px solid var(--color-border)'
              }
            }}
          >
            <DialogTitle style={{ 
              backgroundColor: 'var(--box-color)', 
              color: 'var(--title-color)',
              borderBottom: '1px solid var(--color-border)',
              padding: '20px 24px'
            }}>
              <div className={adminStyles.dialogHeader}>
                <div className={adminStyles.dialogTitleSection}>
                  <div className={adminStyles.dialogIcon}>
                    {editDialog.type === 'notification' ? <FaBell /> : <FaFileAlt />}
                  </div>
                  <div>
                    <h2 className={adminStyles.dialogTitle}>
                      Editar {editDialog.type === 'notification' ? 'Notificação' : 'Patch Note'}
                    </h2>
                    <p className={adminStyles.dialogSubtitle}>
                      {hasUnsavedChanges && '● Alterações não salvas'}
                    </p>
                  </div>
                </div>
                <IconButton 
                  onClick={handleCloseEdit}
                  className={adminStyles.closeButton}
                  style={{ color: 'var(--text-color)' }}
                >
                  <FaTimes />
                </IconButton>
              </div>
            </DialogTitle>
            
            <DialogContent style={{ 
              backgroundColor: 'var(--box-color)', 
              padding: '24px',
              overflow: 'visible'
            }}>
              <div className={adminStyles.editForm}>
                {/* Título */}
                <div className={adminStyles.formGroup}>
                  <TextField
                    label="Título *"
                    fullWidth
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    error={!!editErrors.title}
                    helperText={editErrors.title}
                    variant="outlined"
                    className={adminStyles.editTextField}
                    InputProps={{
                      style: {
                        backgroundColor: 'var(--modals-inputs)',
                        color: 'var(--title-color)'
                      }
                    }}
                    InputLabelProps={{
                      style: { color: 'var(--text-color)' }
                    }}
                  />
                </div>

                {/* Campos específicos para Patch Notes */}
                {editDialog.type === 'patchnote' && (
                  <div className={adminStyles.patchNoteFields}>
                    <div className={adminStyles.inputRow}>
                      <TextField
                        label="Versão (Opcional)"
                        value={editVersion}
                        onChange={(e) => setEditVersion(e.target.value)}
                        variant="outlined"
                        style={{ minWidth: '150px' }}
                        placeholder="Ex: v2.1.0"
                        InputProps={{
                          style: {
                            backgroundColor: 'var(--modals-inputs)',
                            color: 'var(--title-color)'
                          }
                        }}
                        InputLabelProps={{
                          style: { color: 'var(--text-color)' }
                        }}
                      />
                    </div>
                    
                    <TextField
                      label="Resumo *"
                      fullWidth
                      multiline
                      rows={2}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      error={!!editErrors.summary}
                      helperText={editErrors.summary}
                      variant="outlined"
                      placeholder="Breve resumo das principais mudanças..."
                      InputProps={{
                        style: {
                          backgroundColor: 'var(--modals-inputs)',
                          color: 'var(--title-color)'
                        }
                      }}
                      InputLabelProps={{
                        style: { color: 'var(--text-color)' }
                      }}
                    />
                  </div>
                )}

                {/* Editor de Conteúdo */}
                <div className={adminStyles.contentSection}>
                  <div className={adminStyles.contentHeader}>
                    <h4 style={{ color: 'var(--title-color)' }}>
                      {editDialog.type === 'notification' ? 'Mensagem *' : 'Conteúdo *'}
                    </h4>
                    {editDialog.type === 'patchnote' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setEditPreviewMode(!editPreviewMode)}
                        startIcon={<FaEye />}
                        style={{
                          color: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)'
                        }}
                      >
                        {editPreviewMode ? 'Editar' : 'Preview'}
                      </Button>
                    )}
                  </div>

                  {!editPreviewMode ? (
                    <div className={adminStyles.editorContainer}>
                      <TextField
                        fullWidth
                        multiline
                        rows={editDialog.type === 'notification' ? 6 : 12}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        error={!!editErrors.content}
                        helperText={editErrors.content}
                        variant="outlined"
                        placeholder={editDialog.type === 'notification' 
                          ? 'Digite a mensagem da notificação...'
                          : 'Escreva o conteúdo usando markdown:\n\n# Título\n**negrito** *itálico*\n- Lista\n> Citação'
                        }
                        InputProps={{
                          style: {
                            backgroundColor: 'var(--modals-inputs)',
                            color: 'var(--title-color)',
                            fontFamily: editDialog.type === 'patchnote' ? 'Monaco, monospace' : 'inherit'
                          }
                        }}
                      />
                      
                      {editDialog.type === 'patchnote' && (
                        <div className={adminStyles.markdownHelp}>
                          <span style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>
                            💡 <strong>Markdown:</strong> 
                            <code># Título</code> • 
                            <code>**negrito**</code> • 
                            <code>*itálico*</code> • 
                            <code>- lista</code> • 
                            <code>&gt; citação</code>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={adminStyles.previewContainer} style={{
                      backgroundColor: 'var(--box-color2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '20px',
                      minHeight: '300px',
                      color: 'var(--text-color)'
                    }}>
                      <div 
                        dangerouslySetInnerHTML={{ __html: convertToHTML(editContent) }}
                        style={{ lineHeight: '1.6' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
            
            <DialogActions style={{ 
              backgroundColor: 'var(--box-color)', 
              borderTop: '1px solid var(--color-border)',
              padding: '16px 24px',
              gap: '12px'
            }}>
              <Button 
                onClick={handleCloseEdit}
                style={{ 
                  color: 'var(--text-color)',
                  textTransform: 'none'
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                variant="contained" 
                startIcon={editLoading ? null : <FaSave />}
                disabled={editLoading || Object.keys(editErrors).length > 0}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  textTransform: 'none',
                  minWidth: '120px'
                }}
              >
                {editLoading ? (
                  <>
                    <div className="standardBoxLoader" style={{ transform: 'scale(0.3)', margin: '0 8px 0 0' }}></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão Melhorado */}
          <Dialog 
            open={deleteDialog.open} 
            onClose={() => setDeleteDialog({ open: false, type: null, item: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              style: {
                backgroundColor: 'var(--box-color)',
                color: 'var(--text-color)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)'
              }
            }}
          >
            <DialogTitle style={{ 
              backgroundColor: 'var(--box-color)', 
              color: 'var(--title-color)',
              borderBottom: '1px solid var(--color-border)',
              padding: '20px 24px'
            }}>
              <div className={adminStyles.dialogHeader}>
                <div className={adminStyles.dialogTitleSection}>
                  <div className={adminStyles.dialogIcon} style={{ color: '#dc2626' }}>
                    <FaTrash />
                  </div>
                  <div>
                    <h2 className={adminStyles.dialogTitle} style={{ color: 'var(--title-color)' }}>
                      Confirmar Exclusão
                    </h2>
                  </div>
                </div>
                <IconButton 
                  onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
                  style={{ color: 'var(--text-color)' }}
                >
                  <FaTimes />
                </IconButton>
              </div>
            </DialogTitle>
            
            <DialogContent style={{ 
              backgroundColor: 'var(--box-color)', 
              padding: '24px'
            }}>
              <div className={adminStyles.deleteContent}>
                <div className={adminStyles.deleteWarning}>
                  <div className={adminStyles.deleteIcon}>
                    <FaTrash />
                  </div>
                  <div className={adminStyles.deleteMessage}>
                    <p style={{ color: 'var(--text-color)', margin: '0 0 12px 0', fontSize: '1.1rem' }}>
                      Tem certeza que deseja excluir {deleteDialog.type === 'notification' ? 'esta notificação' : 'este patch note'}?
                    </p>
                    <div className={adminStyles.itemToDelete}>
                      <strong style={{ color: 'var(--title-color)' }}>
                        "{deleteDialog.item?.title}"
                      </strong>
                    </div>
                    <div className={adminStyles.warningBox}>
                      <div className={adminStyles.warningIcon}>⚠️</div>
                      <div>
                        <p style={{ 
                          color: '#dc2626', 
                          fontWeight: '600', 
                          margin: '0',
                          fontSize: '0.95rem'
                        }}>
                          Esta ação não pode ser desfeita
                        </p>
                        <p style={{ 
                          color: 'var(--text-color)', 
                          margin: '4px 0 0 0', 
                          fontSize: '0.9rem',
                          opacity: 0.8
                        }}>
                          {deleteDialog.type === 'notification' 
                            ? 'A notificação será permanentemente removida do sistema'
                            : 'O patch note será permanentemente removido da documentação'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
            
            <DialogActions style={{ 
              backgroundColor: 'var(--box-color)', 
              borderTop: '1px solid var(--color-border)',
              padding: '16px 24px',
              gap: '12px'
            }}>
              <Button 
                onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
                style={{ 
                  color: 'var(--text-color)',
                  textTransform: 'none'
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmDelete} 
                variant="contained"
                startIcon={managementLoading ? null : <FaTrash />}
                disabled={managementLoading}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  textTransform: 'none',
                  minWidth: '120px'
                }}
              >
                {managementLoading ? (
                  <>
                    <div className="standardBoxLoader" style={{ transform: 'scale(0.3)', margin: '0 8px 0 0' }}></div>
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
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
