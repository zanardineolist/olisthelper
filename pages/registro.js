// pages/registro.js
import Head from 'next/head';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import Layout from '../components/Layout';
import { ThreeDotsLoader } from '../components/LoadingIndicator';
import { useLoading } from '../components/LoadingIndicator';
import commonStyles from '../styles/commonStyles.module.css';
import styles from '../styles/Registrar.module.css';
import managerStyles from '../styles/Manager.module.css';

export default function RegistroPage({ user }) {
  const router = useRouter();
  const { loading: routerLoading } = useLoading();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formLoading, setFormLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpRequests, setHelpRequests] = useState({ today: 0 });
  const [recentHelps, setRecentHelps] = useState([]);
  // Contadores
  const [selectedDate, setSelectedDate] = useState(() => {
    // Usa Intl para obter data local em America/Sao_Paulo
    try {
      const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = fmt.formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    } catch {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const saoPaulo = new Date(utc - 3 * 60 * 60 * 1000);
      return saoPaulo.toISOString().slice(0, 10);
    }
  });
  const [counters, setCounters] = useState({ calls: 0, rfcs: 0, helps: 0 });
  const [savingCounters, setSavingCounters] = useState(false);
  // Histórico
  const [historyStart, setHistoryStart] = useState(() => {
    try {
      const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = fmt.formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    } catch {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const saoPaulo = new Date(utc - 3 * 60 * 60 * 1000);
      return saoPaulo.toISOString().slice(0, 10);
    }
  });
  const [historyEnd, setHistoryEnd] = useState(() => {
    try {
      const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = fmt.formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    } catch {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const saoPaulo = new Date(utc - 3 * 60 * 60 * 1000);
      return saoPaulo.toISOString().slice(0, 10);
    }
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTotals, setHistoryTotals] = useState({ calls: 0, rfcs: 0, helps: 0 });
  const [formData, setFormData] = useState({
    user: null,
    category: null,
    description: '',
  });
  // Estados para o modal de nova categoria
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Carregar usuários e categorias
  useEffect(() => {
    const loadUsersAndCategories = async () => {
      try {
        setFormLoading(true);
        const [usersRes, categoriesRes] = await Promise.all([
          fetch('/api/get-users'),
          fetch('/api/get-analysts-categories')
        ]);
        
        const usersData = await usersRes.json();
        const categoriesData = await categoriesRes.json();
        
        setUsers(usersData.users);
        setCategories(categoriesData.categories);
        setFormLoading(false);

        // Buscar dados de estatísticas em paralelo usando "hoje" em SP
        setStatsLoading(true);
        const tz = 'America/Sao_Paulo';
        const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = fmt.format(new Date());
        setSelectedDate(today);
        await Promise.all([
          fetchHelpRequests(),
          fetchRecentHelps(),
          fetchDailyCounters(today),
        ]);
        // Pré-carrega histórico padrão: últimos 7 dias terminando hoje
        const now = new Date();
        const sixDaysAgo = new Date(now);
        sixDaysAgo.setDate(now.getDate() - 6);
        const start = fmt.format(sixDaysAgo);
        const end = today;
        setHistoryStart(start);
        setHistoryEnd(end);
        await fetchHistory(start, end);
        setStatsLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setFormLoading(false);
        setStatsLoading(false);
      }
    };

    if (user?.id) {
      loadUsersAndCategories();
    }
  }, [user.id]);

  // Atualiza contadores quando a data muda
  useEffect(() => {
    if (!user?.id) return;
    fetchDailyCounters(selectedDate);
  }, [selectedDate, user?.id]);

  // Função para buscar ajudas prestadas
  const fetchHelpRequests = async () => {
    try {
      // Usando filter=1 para obter dados do dia atual
      const helpResponse = await fetch(`/api/get-analyst-records?analystId=${user.id}&mode=profile&filter=1`);
      if (helpResponse.ok) {
        const helpData = await helpResponse.json();
        setHelpRequests({
          today: helpData.today || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar ajudas prestadas:', err);
    }
  };

  // Refresh geral para estatísticas e histórico, mantendo UI sincronizada sem recarregar a página
  const refreshAll = async (opts = {}) => {
    const dateForCounters = opts.date || selectedDate;
    try {
      setStatsLoading(true);
      await Promise.all([
        fetchHelpRequests(),
        fetchRecentHelps(),
        fetchDailyCounters(dateForCounters),
        fetchHistory(),
      ]);
    } finally {
      setStatsLoading(false);
    }
  };
  
  // Função para buscar os registros recentes
  const fetchRecentHelps = async () => {
    try {
      const recentResponse = await fetch(`/api/get-recent-helps?analystId=${user.id}`);
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentHelps(recentData.recentHelps || []);
      }
    } catch (err) {
      console.error('Erro ao buscar registros recentes:', err);
    }
  };

  // Daily counters API helpers
  const fetchDailyCounters = async (dateStr) => {
    try {
      const res = await fetch(`/api/daily-counters?analystId=${user.id}&date=${dateStr}`);
      if (!res.ok) return;
      const data = await res.json();
      const rec = data.record || {};
      setCounters({
        calls: rec.calls_count || 0,
        rfcs: rec.rfcs_count || 0,
        helps: rec.helps_count || 0,
      });
    } catch (e) {
      console.error('Erro ao carregar contadores diários:', e);
    }
  };

  const applyCounterDelta = async (delta) => {
    try {
      setSavingCounters(true);
      // Garantir data no fuso de São Paulo
      const body = {
        analystId: user.id,
        date: selectedDate,
        callsDelta: delta.calls || 0,
        rfcsDelta: delta.rfcs || 0,
        helpsDelta: delta.helps || 0,
      };
      const res = await fetch('/api/daily-counters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao atualizar contadores');
      const { record } = await res.json();
      setCounters({
        calls: record.calls_count || 0,
        rfcs: record.rfcs_count || 0,
        helps: record.helps_count || 0,
      });
      // Atualiza histórico se o dia impacta o período atual
      await fetchHistory();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível atualizar o contador.' });
    } finally {
      setSavingCounters(false);
    }
  };

  const setCountersAbsolute = async (next) => {
    try {
      setSavingCounters(true);
      const body = {
        analystId: user.id,
        date: selectedDate,
        callsCount: Math.max(0, next.calls ?? counters.calls),
        rfcsCount: Math.max(0, next.rfcs ?? counters.rfcs),
        helpsCount: Math.max(0, next.helps ?? counters.helps),
      };
      const res = await fetch('/api/daily-counters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao salvar contadores');
      const { record } = await res.json();
      setCounters({
        calls: record.calls_count || 0,
        rfcs: record.rfcs_count || 0,
        helps: record.helps_count || 0,
      });
      await fetchHistory();
    } catch (e) {
      console.error(e);
      if (typeof window !== 'undefined' && window.Swal) {
        const Toast = window.Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        Toast.fire({ icon: 'error', title: 'Não foi possível salvar os contadores.' });
      }
    } finally {
      setSavingCounters(false);
    }
  };

  // Histórico helpers
  const fetchHistory = async (overrideStart, overrideEnd) => {
    if (!user?.id) return;
    const s = overrideStart || historyStart;
    const e = overrideEnd || historyEnd;
    if (!s || !e) return;
    try {
      setHistoryLoading(true);
      const qs = new URLSearchParams({
        analystId: user.id,
        startDate: s,
        endDate: e,
      }).toString();
      const res = await fetch(`/api/daily-counters?${qs}`);
      if (!res.ok) throw new Error('Erro ao buscar histórico');
      const { records, totals } = await res.json();
      setHistoryRecords(records || []);
      setHistoryTotals(totals || { calls: 0, rfcs: 0, helps: 0 });
    } catch (e) {
      console.error(e);
      if (typeof window !== 'undefined' && window.Swal) {
        const Toast = window.Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        Toast.fire({ icon: 'error', title: 'Não foi possível carregar o histórico.' });
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const fechamentoTexto = useMemo(() => {
    const formatBR = (iso) => {
      if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
      }
      try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return iso; }
    };
    const periodo = historyStart && historyEnd
      ? `${formatBR(historyStart)} a ${formatBR(historyEnd)}`
      : formatBR(selectedDate);
    return `Fechamento - Período ${periodo}\nChamados = ${historyTotals.calls}\nRFC's = ${historyTotals.rfcs}\nAjudas = ${historyTotals.helps}`;
  }, [historyStart, historyEnd, selectedDate, historyTotals]);

  const copiarFechamento = async () => {
    try {
      await navigator.clipboard.writeText(fechamentoTexto);
      if (typeof window !== 'undefined' && window.Swal) {
        const Toast = window.Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Copiado!' });
      }
    } catch (e) {
      console.error('Erro ao copiar:', e);
      if (typeof window !== 'undefined' && window.Swal) {
        const Toast = window.Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        Toast.fire({ icon: 'error', title: 'Não foi possível copiar.' });
      }
    }
  };

  const formatYMDToBR = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }
    try { return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return String(value); }
  };

  // Editar / Excluir registros - ações via toast
  const toast = (title, icon = 'success', ms = 2200) => {
    if (typeof window === 'undefined' || !window.Swal) return;
    const Toast = window.Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: ms });
    Toast.fire({ icon, title });
  };

  const onDeleteRecord = async (recordId) => {
    try {
      // Confirmação via swal
      if (typeof window !== 'undefined' && window.Swal) {
        const result = await window.Swal.fire({
          title: 'Excluir registro?',
          text: 'Esta ação não poderá ser desfeita.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Excluir',
          cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
      }

      const res = await fetch(`/api/manage-records?recordId=${encodeURIComponent(recordId)}&userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      toast('Registro excluído');
      // Refresh completo (recentes, histórico, hoje)
      await refreshAll();
    } catch (e) {
      console.error('Excluir registro:', e);
      toast('Erro ao excluir registro', 'error');
    }
  };

  const onEditRecord = async (record) => {
    try {
      // Modal simples com Swal para editar somente a descrição (rápido). Podemos expandir para nome/email/categoria depois.
      let newDescription = record.description || '';
      if (typeof window !== 'undefined' && window.Swal) {
        const { value } = await window.Swal.fire({
          title: 'Editar descrição',
          input: 'textarea',
          inputValue: newDescription,
          inputAttributes: { 'aria-label': 'Descrição' },
          showCancelButton: true,
          confirmButtonText: 'Salvar',
          cancelButtonText: 'Cancelar'
        });
        if (value === undefined) return; // cancelado
        newDescription = value;
      } else {
        newDescription = prompt('Nova descrição', newDescription);
        if (newDescription == null) return;
      }
      if (!newDescription || !newDescription.trim()) return;

      const body = { record: { id: record.id, name: record.requesterName || '—', email: record.requesterEmail || '—', category: record.category || '—', description: newDescription } };
      const res = await fetch(`/api/manage-records?userId=${encodeURIComponent(user.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Falha ao editar');
      toast('Registro atualizado');
      await refreshAll();
    } catch (e) {
      console.error('Editar registro:', e);
      toast('Erro ao atualizar registro', 'error');
    }
  };

  // Editar registro do histórico (daily_counters): permite alterar somente chamados e RFCs
  const onEditDailyRecord = async (rec) => {
    try {
      if (typeof window === 'undefined' || !window.Swal) return;
      const { value } = await window.Swal.fire({
        title: 'Editar contadores',
        html: `
          <div style="display:flex;flex-direction:column;gap:8px;text-align:left">
            <label>Chamados</label>
            <input id="swal-calls" type="number" min="0" value="${rec.calls_count ?? 0}" class="swal2-input" style="width:100%" />
            <label>RFC's</label>
            <input id="swal-rfcs" type="number" min="0" value="${rec.rfcs_count ?? 0}" class="swal2-input" style="width:100%" />
            <small style="opacity:.8">Ajudas são editadas apenas pelo formulário de registro.</small>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
          const callsVal = parseInt(document.getElementById('swal-calls').value, 10);
          const rfcsVal = parseInt(document.getElementById('swal-rfcs').value, 10);
          if (Number.isNaN(callsVal) || callsVal < 0 || Number.isNaN(rfcsVal) || rfcsVal < 0) {
            window.Swal.showValidationMessage('Informe números válidos (>= 0).');
            return false;
          }
          return { calls: callsVal, rfcs: rfcsVal };
        }
      });
      if (!value) return;

      const body = {
        analystId: user.id,
        date: rec.date,
        callsCount: Math.max(0, value.calls),
        rfcsCount: Math.max(0, value.rfcs),
        helpsCount: Math.max(0, rec.helps_count ?? 0), // mantém ajudas
      };
      const res = await fetch('/api/daily-counters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao salvar contadores');
      toast('Contadores atualizados');
      await refreshAll({ date: rec.date === selectedDate ? selectedDate : undefined });
    } catch (e) {
      console.error('Editar contadores diários:', e);
      toast('Erro ao atualizar contadores', 'error');
    }
  };

  // Gerenciar alterações no formulário
  const handleChange = (selectedOption, actionMeta) => {
    const { name } = actionMeta;
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Funções para o modal de nova categoria
  const openCategoryModal = () => {
    setNewCategory('');
    setModalIsOpen(true);
  };

  const closeCategoryModal = () => {
    setModalIsOpen(false);
  };

  const handleNewCategoryChange = (e) => {
    setNewCategory(e.target.value);
  };

  const handleSaveCategory = async () => {
    if (!newCategory.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'O nome da categoria não pode estar vazio.',
        showConfirmButton: true,
      });
      return;
    }

    try {
      setSavingCategory(true);
      
      // Verificação prévia com o backend para determinar se a categoria existe e seu status
      let checkData = { exists: false };
      
      try {
        const checkRes = await fetch('/api/manage-category/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newCategory.trim() }),
        });
        
        if (checkRes.ok) {
          checkData = await checkRes.json();
        } else {
          // Verificação local simplificada como fallback
          const lowerCaseNewCategory = newCategory.trim().toLowerCase();
          const existsLocally = categories.some(
            (cat) => cat.toLowerCase() === lowerCaseNewCategory
          );
          
          if (existsLocally) {
            checkData = { exists: true, active: true };
          }
        }
      } catch (checkError) {
        console.error('Erro ao verificar categoria:', checkError);
        // Continuar com verificação local em caso de erro
        const lowerCaseNewCategory = newCategory.trim().toLowerCase();
        const existsLocally = categories.some(
          (cat) => cat.toLowerCase() === lowerCaseNewCategory
        );
        
        if (existsLocally) {
          checkData = { exists: true, active: true };
        }
      }
      
      // Se a categoria existir e estiver ativa
      if (checkData.exists && checkData.active) {
        Swal.fire({
          icon: 'error',
          title: 'Categoria já existe',
          text: 'Esta categoria já está cadastrada e ativa no sistema.',
          showConfirmButton: true,
        });
        setSavingCategory(false);
        return;
      }
      
      // Se a categoria existir mas estiver inativa
      if (checkData.exists && !checkData.active) {
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Categoria inativa encontrada',
          text: `A categoria "${newCategory}" já existe mas está inativa. Deseja reativá-la?`,
          showCancelButton: true,
          confirmButtonText: 'Sim, reativar',
          cancelButtonText: 'Cancelar',
          showConfirmButton: true,
        });
        
        if (result.isConfirmed) {
          try {
            // Reativar a categoria usando id em vez de uuid
            const reactivateRes = await fetch('/api/manage-category/reactivate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                name: newCategory.trim(),
                id: checkData.id // Enviamos o id da categoria para reativação
              }),
            });
            
            if (!reactivateRes.ok) {
              const errorData = await reactivateRes.json().catch(() => ({}));
              throw new Error(errorData.error || 'Erro ao reativar categoria');
            }
            
            // Atualizar a lista de categorias
            const categoriesRes = await fetch('/api/get-analysts-categories');
            if (categoriesRes.ok) {
              const categoriesData = await categoriesRes.json();
              setCategories(categoriesData.categories);
              
              // Selecionar a categoria reativada
              const reactivatedCategoryOption = {
                value: newCategory.trim(),
                label: newCategory.trim(),
              };
              setFormData(prev => ({
                ...prev,
                category: reactivatedCategoryOption
              }));
              
              // Fechar o modal e mostrar mensagem de sucesso
              setModalIsOpen(false);
              Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Categoria reativada com sucesso.',
                timer: 1500,
                showConfirmButton: false,
              });
            } else {
              console.warn('Falha ao atualizar lista de categorias após reativação');
              // Fechar o modal e mostrar mensagem mesmo assim
              setModalIsOpen(false);
              Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Categoria reativada com sucesso. Atualize a página para ver a categoria.',
                showConfirmButton: true,
              });
            }
          } catch (reactivateError) {
            console.error('Erro ao reativar categoria:', reactivateError);
            Swal.fire({
              icon: 'error',
              title: 'Erro',
              text: `Não foi possível reativar a categoria: ${reactivateError.message}`,
              showConfirmButton: true,
            });
          }
        }
        setSavingCategory(false);
        return;
      }

      // Se chegou aqui, a categoria não existe, então podemos criar uma nova
      try {
        const res = await fetch('/api/manage-category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newCategory.trim() }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Erro retornado pelo servidor:', errorData);
          
          // Verificar se o erro é de categoria duplicada
          if (errorData.code === '23505' || 
             (errorData.error && errorData.error.includes('already exists'))) {
            
            // Tentar verificar se a categoria está inativa
            try {
              const verifyRes = await fetch('/api/manage-category/check', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newCategory.trim() }),
              });
              
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                
                if (verifyData.exists && !verifyData.active) {
                  // Categoria existe mas está inativa
                  const activateResult = await Swal.fire({
                    icon: 'warning',
                    title: 'Categoria inativa encontrada',
                    text: `A categoria "${newCategory}" já existe mas está inativa. Deseja reativá-la?`,
                    showCancelButton: true,
                    confirmButtonText: 'Sim, reativar',
                    cancelButtonText: 'Cancelar',
                    showConfirmButton: true,
                  });
                  
                  if (activateResult.isConfirmed) {
                    // Reativar a categoria
                    await fetch('/api/manage-category/reactivate', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ id: verifyData.id }),
                    });
                    
                    // Atualizar a lista e selecionar a categoria
                    const categoriesRes = await fetch('/api/get-analysts-categories');
                    const categoriesData = await categoriesRes.json();
                    setCategories(categoriesData.categories);
                    
                    const newCategoryOption = {
                      value: newCategory.trim(),
                      label: newCategory.trim(),
                    };
                    
                    setFormData(prev => ({
                      ...prev,
                      category: newCategoryOption
                    }));
                    
                    setModalIsOpen(false);
                    Swal.fire({
                      icon: 'success',
                      title: 'Sucesso!',
                      text: 'Categoria reativada com sucesso.',
                      timer: 1500,
                      showConfirmButton: false,
                    });
                    
                    setSavingCategory(false);
                    return;
                  }
                } else {
                  // Categoria existe e está ativa (erro de duplicação normal)
                  Swal.fire({
                    icon: 'error',
                    title: 'Categoria já existe',
                    text: 'Esta categoria já está cadastrada no sistema.',
                    showConfirmButton: true,
                  });
                  setSavingCategory(false);
                  return;
                }
              }
            } catch (verifyError) {
              console.error('Erro ao verificar categoria após duplicação:', verifyError);
            }
            
            // Mensagem genérica se não conseguir determinar o status
            Swal.fire({
              icon: 'error',
              title: 'Categoria já existe',
              text: 'Esta categoria já está cadastrada no sistema. Se desejar usar uma categoria inativa, tente novamente verificando as categorias existentes.',
              showConfirmButton: true,
            });
            setSavingCategory(false);
            return;
          }
          
          throw new Error(errorData.error || errorData.message || 'Erro ao salvar categoria');
        }

        // Atualizar a lista de categorias
        const categoriesRes = await fetch('/api/get-analysts-categories');
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories);

          // Selecionar a nova categoria automaticamente
          const newCategoryOption = {
            value: newCategory.trim(),
            label: newCategory.trim(),
          };
          setFormData(prev => ({
            ...prev,
            category: newCategoryOption
          }));

          // Fechar o modal e mostrar mensagem de sucesso
          setModalIsOpen(false);
          Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: 'Categoria adicionada com sucesso.',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          console.warn('Falha ao atualizar lista de categorias após criação');
          // Fechar o modal e mostrar mensagem mesmo assim
          setModalIsOpen(false);
          Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: 'Categoria adicionada com sucesso. Atualize a página para ver a categoria.',
            showConfirmButton: true,
          });
        }
      } catch (createError) {
        console.error('Erro ao criar categoria:', createError);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: `Erro ao processar a categoria: ${createError.message}`,
          showConfirmButton: true,
        });
      }
    } catch (err) {
      console.error('Erro geral ao processar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: `Erro ao processar a categoria: ${err.message}`,
        showConfirmButton: true,
      });
    } finally {
      setSavingCategory(false);
    }
  };

  // Submeter o formulário de registro de ajuda
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedUser = formData.user;
      const userName = selectedUser ? selectedUser.label : '';
      const userEmail = selectedUser ? selectedUser.email : '';

      const response = await fetch('/api/register-analyst-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userEmail,
          category: formData.category ? formData.category.value : '',
          description: formData.description,
          analystId: user.id,
        }),
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Ajuda registrada com sucesso!',
          showConfirmButton: false,
          timer: 1500,
        });
        setFormData({ user: null, category: null, description: '' });
        // Incrementar contador de ajudas do dia e sincronizar tudo
        await applyCounterDelta({ helps: 1 });
        await refreshAll();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar a ajuda',
          text: 'Por favor, tente novamente.',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar a ajuda',
        text: 'Por favor, tente novamente.',
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Redirecionamento para a página de gerenciamento de registros
  const navigateToAllRecords = () => {
    router.push('/manager#Registros');
  };

  // Estilos personalizados para o React-Select
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



  return (
    <Layout user={user}>
      <Head>
        <title>Registrar Ajuda</title>
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        <div className={styles.pageInner}>
        <div className={styles.topGrid}>
          {/* Grid 1: Ajudas hoje + Formulário + Últimos registros */}
          <div className={`${styles.leftPane} ${styles.columnStack}`}>
            <div className={`${styles.statCard} ${styles.helpCounter}`}>
              <div className={styles.counterHeader}>
                <h3>Ajudas prestadas hoje</h3>
              </div>
              {statsLoading ? (
                <ThreeDotsLoader message="Carregando estatísticas..." />
              ) : (
                <div className={styles.counterValue}>{helpRequests.today || 0}</div>
              )}
            </div>

            <div className={styles.formContainerWithSpacing}>
              <h2 className={styles.formTitle}>Registrar Ajuda</h2>
          
          {formLoading ? (
            <ThreeDotsLoader message="Carregando formulário..." />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="user">Selecione o usuário</label>
                <Select
                  id="user"
                  name="user"
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                    email: user.email,
                  }))}
                  value={formData.user}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um usuário"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>
 
              <div className={styles.formGroup}>
                <div className={styles.categoryHeader}>
                  <label htmlFor="category">Tema da ajuda</label>
                  <button 
                    type="button"
                    className={styles.newCategoryButton}
                    onClick={openCategoryModal}
                  >
                    <i className="fa-solid fa-plus"></i> Nova categoria
                  </button>
                </div>
                <Select
                  id="category"
                  name="category"
                  options={categories.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  value={formData.category}
                  onChange={handleChange}
                  isClearable
                  placeholder="Selecione um tema"
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Sem resultados"}
                  required
                />
              </div>
 
              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição da ajuda</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva brevemente sua dúvida."
                  required
                  rows="4"
                  className={`${styles.formTextarea} ${styles.formFieldHover}`}
                />
              </div>
 
              <div className={styles.formButtonContainer}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          )}
            </div>

            <div className={styles.recentHelpsContainer}>
              <div className={styles.recentHelpsHeader}>
                <h3>Últimos registros</h3>
                <button 
                  className={styles.viewAllButton}
                  onClick={navigateToAllRecords}
                >
                  Ver todos <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
              <div className={styles.recentHelpsList}>
                {statsLoading ? (
                  <ThreeDotsLoader message="Carregando registros..." />
                ) : recentHelps.length > 0 ? (
                  recentHelps.map((help) => (
                    <div key={help.id} className={styles.recentHelpCard}>
                      <div className={styles.recentHelpHeader}>
                        <div className={styles.recentHelpCategory}>
                          <i className="fa-solid fa-tag"></i> {help.category}
                        </div>
                        <div className={styles.recentHelpTime}>
                          <i className="fa-regular fa-clock"></i> {help.formattedDate} • {help.formattedTime}
                        </div>
                      </div>
                  <div className={styles.recentHelpUser}>
                    <i className="fa-regular fa-user"></i> {help.requesterName}
                  </div>
                  <div className={styles.recentHelpDescription}>
                        <div className={styles.descriptionLabel}>Descrição:</div>
                        <div className={styles.descriptionText}>{help.description}</div>
                      </div>
                  <div className={styles.recordActions}>
                    <button type="button" className={styles.iconButton} title="Editar" onClick={() => onEditRecord(help)}>
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" className={styles.iconButton} title="Excluir" onClick={() => onDeleteRecord(help.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noRecentHelps}>
                    <i className="fa-solid fa-clipboard-list"></i>
                    <p>Nenhum registro recente encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid 2: Contadores + Histórico */}
          <div className={`${styles.rightPane} ${styles.columnStack}`}>
            <div className={styles.sideCard}>
              <div className={styles.countersGrid}>
                <div className={styles.counterCard}>
                  <div className={styles.counterTitle}><i className="fa-solid fa-ticket"></i> Chamados</div>
                  <div className={styles.counterControls}>
                    <button aria-label="Diminuir chamados" disabled={savingCounters || counters.calls <= 0} onClick={() => applyCounterDelta({ calls: -1 })}>-</button>
                    <div className={styles.counterValueBig}>{counters.calls}</div>
                    <button aria-label="Aumentar chamados" disabled={savingCounters} onClick={() => applyCounterDelta({ calls: +1 })}>+</button>
                  </div>
                </div>
                <div className={styles.counterCard}>
                  <div className={styles.counterTitle}><i className="fa-solid fa-comments"></i> RFC's</div>
                  <div className={styles.counterControls}>
                    <button aria-label="Diminuir RFCs" disabled={savingCounters || counters.rfcs <= 0} onClick={() => applyCounterDelta({ rfcs: -1 })}>-</button>
                    <div className={styles.counterValueBig}>{counters.rfcs}</div>
                    <button aria-label="Aumentar RFCs" disabled={savingCounters} onClick={() => applyCounterDelta({ rfcs: +1 })}>+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.sideCard} ${styles.historyCard}`}>
              <h2 className={styles.formTitle}>Histórico e Fechamento</h2>

              <div className={styles.section}>
                <div className={styles.historyTotals}>
                  <div>Chamados: <strong>{historyTotals.calls}</strong></div>
                  <div>RFC's: <strong>{historyTotals.rfcs}</strong></div>
                  <div>Ajudas: <strong>{historyTotals.helps}</strong></div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.dateRangeRow}>
                  <div className={styles.dateField}>
                    <label>Início</label>
                    <div className={styles.dateInputWrapper}>
                      <i className={`fa-regular fa-calendar ${styles.dateIcon}`}></i>
                      <input type="date" value={historyStart} onChange={(e) => { setHistoryStart(e.target.value); fetchHistory(); }} className={styles.dateInput} />
                    </div>
                  </div>
                  <div className={styles.dateField}>
                    <label>Fim</label>
                    <div className={styles.dateInputWrapper}>
                      <i className={`fa-regular fa-calendar ${styles.dateIcon}`}></i>
                      <input type="date" value={historyEnd} onChange={(e) => { setHistoryEnd(e.target.value); fetchHistory(); }} className={styles.dateInput} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.presetChips}>
                  <button type="button" className={styles.chip} onClick={() => {
                    const tz = 'America/Sao_Paulo';
                    const now = new Date();
                    const sixDaysAgo = new Date(now);
                    sixDaysAgo.setDate(now.getDate() - 6);
                    const fmt = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                    const start = fmt(sixDaysAgo);
                    const end = fmt(now);
                    setHistoryStart(start);
                    setHistoryEnd(end);
                    fetchHistory(start, end);
                  }}>Últimos 7 dias</button>
                  <button type="button" className={styles.chip} onClick={() => {
                    const tz = 'America/Sao_Paulo';
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const fmt = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                    const s = fmt(start);
                    const e = fmt(now);
                    setHistoryStart(s);
                    setHistoryEnd(e);
                    fetchHistory(s, e);
                  }}>Este mês</button>
                  <button type="button" className={styles.chip} onClick={() => {
                    const tz = 'America/Sao_Paulo';
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const end = new Date(now.getFullYear(), now.getMonth(), 0);
                    const fmt = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                    const s = fmt(start);
                    const e = fmt(end);
                    setHistoryStart(s);
                    setHistoryEnd(e);
                    fetchHistory(s, e);
                  }}>Mês passado</button>
                  <button type="button" className={styles.chip} onClick={() => {
                    const tz = 'America/Sao_Paulo';
                    const now = new Date();
                    const fmt = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                    const today = fmt(now);
                    setHistoryStart(today);
                    setHistoryEnd(today);
                    fetchHistory(today, today);
                  }}>Hoje</button>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>Registros</div>
                <div className={styles.historyListScrollable}>
                  {historyLoading ? (
                    <ThreeDotsLoader message="Carregando histórico..." />
                  ) : historyRecords && historyRecords.length > 0 ? (
                    historyRecords.map((r) => (
                      <div key={r.id || `${r.date}`} className={styles.historyItem}>
                        <div className={styles.historyDate}>{formatYMDToBR(r.date)}</div>
                      <div className={styles.historyCounts}>
                          <span>Chamados: {r.calls_count}</span>
                          <span>RFC's: {r.rfcs_count}</span>
                          <span>Ajudas: {r.helps_count}</span>
                        </div>
                      <div className={styles.recordActions}>
                        <button type="button" className={styles.iconButton} onClick={() => onEditDailyRecord(r)}>
                          <i className="fa-solid fa-pen"></i> Editar
                        </button>
                      </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noRecentHelps}>
                      <i className="fa-solid fa-circle-info"></i>
                      <p>Nenhum registro no período</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.actionRow}>
                <button type="button" className={styles.submitButton} onClick={copiarFechamento}>
                  Copiar fechamento
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Modal para adicionar nova categoria */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeCategoryModal}
        contentLabel="Adicionar Nova Categoria"
        className={managerStyles.modal}
        overlayClassName={managerStyles.overlay}
        ariaHideApp={false}
      >
        <h2 className={managerStyles.modalTitle}>Adicionar Nova Categoria</h2>
        <div className={managerStyles.formContainer}>
          <input
            type="text"
            value={newCategory}
            placeholder="Nome da Categoria"
            className={managerStyles.inputField}
            onChange={handleNewCategoryChange}
            required
            autoComplete="off"
          />
          <button 
            onClick={handleSaveCategory} 
            disabled={savingCategory} 
            className={managerStyles.saveButton}
          >
            {savingCategory ? 'Salvando...' : 'Adicionar Categoria'}
          </button>
          <button onClick={closeCategoryModal} className={managerStyles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
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

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        
        // PERMISSÕES TRADICIONAIS
        admin: userData?.admin || false,
        profile: userData?.profile,
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
