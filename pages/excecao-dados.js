// pages/excecao-dados.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/ExcecaoDados.module.css';
import { Toaster, toast } from 'react-hot-toast';

export default function ExcecaoDadosPage({ user }) {
  const initialForm = useMemo(() => ({
    linkChamado: '',
    responsavel: user?.name || '',
    espacoAtual: '',
    espacoAdicional: '',
    dataRemocao: '', // yyyy-MM-dd
    situacao: 'Liberado',
  }), [user?.name]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  function normalizeToBRDate(value) {
    if (!value) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  function toISOInputDate(brOrIso) {
    if (!brOrIso) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(brOrIso)) return brOrIso;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(brOrIso)) {
      const [dd, mm, yyyy] = brOrIso.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(brOrIso);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  }

  const loadList = async () => {
    try {
      setListLoading(true);
      const res = await fetch('/api/excecao-dados/list');
      if (!res.ok) throw new Error('Falha ao carregar lista');
      const data = await res.json();
      setItems((data.items || []).map((it) => ({
        ...it,
        criadoEm: normalizeToBRDate(it.criadoEm),
        dataRemocao: normalizeToBRDate(it.dataRemocao),
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, responsavel: user?.name || '' }));
  }, [user?.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.linkChamado || !form.responsavel || !form.dataRemocao || !form.situacao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/excecao-dados/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao registrar');
      toast.success('Registro adicionado');
      setForm({ ...initialForm });
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRemoved = async (item) => {
    try {
      const res = await fetch('/api/excecao-dados/mark-removed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criadoEm: item.criadoEm,
          linkChamado: item.linkChamado,
          responsavel: item.responsavel,
          dataRemocao: item.dataRemocao,
          espacoAdicional: item.espacoAdicional,
        }),
      });
      if (!res.ok) throw new Error('Falha ao marcar como removido');
      toast.success('Marcado como removido e agenda atualizada');
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao marcar como removido');
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      linkChamado: item.linkChamado,
      responsavel: item.responsavel || user?.name || '',
      espacoAtual: item.espacoAtual,
      espacoAdicional: item.espacoAdicional,
      dataRemocao: toISOInputDate(item.dataRemocao),
      situacao: item.situacao || 'Liberado',
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ ...initialForm });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setLoading(true);
      const res = await fetch('/api/excecao-dados/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criadoEm: editing.criadoEm,
          original: {
            linkChamado: editing.linkChamado,
            responsavel: editing.responsavel,
            dataRemocao: editing.dataRemocao,
          },
          updated: { ...form },
        }),
      });
      if (!res.ok) throw new Error('Falha ao editar');
      toast.success('Registro atualizado');
      setEditing(null);
      setForm({ ...initialForm });
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Exceção de Dados</title>
      </Head>
      <Toaster position="bottom-right" />
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Exceção de Dados</h1>
            <p className={styles.subtitle}>Registre liberações temporárias de armazenamento e acompanhe o histórico.</p>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardBody}>
            <form onSubmit={editing ? submitEdit : onSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Link do chamado</label>
                  <input className={styles.input} name="linkChamado" value={form.linkChamado} onChange={handleChange} placeholder="https://..." required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Responsável</label>
                  <input className={styles.input} name="responsavel" value={form.responsavel} onChange={handleChange} required />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Espaço atual</label>
                  <input className={styles.input} name="espacoAtual" value={form.espacoAtual} onChange={handleChange} placeholder="Ex.: 15 GB" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Espaço adicional</label>
                  <input className={styles.input} name="espacoAdicional" value={form.espacoAdicional} onChange={handleChange} placeholder="Ex.: +10 GB" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Data que será removido</label>
                  <input className={styles.date} type="date" name="dataRemocao" value={form.dataRemocao} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Situação</label>
                  <select className={styles.select} name="situacao" value={form.situacao} onChange={handleChange}>
                    <option value="Liberado">Liberado</option>
                    <option value="Removido">Removido</option>
                  </select>
                </div>
              </div>

              <div className={styles.actions}>
                {editing && (
                  <button type="button" className={styles.submit} onClick={cancelEdit} disabled={loading}>Cancelar</button>
                )}
                <button className={styles.submit} type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className={styles.card} style={{ marginTop: 20 }}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Histórico</h3>
          </div>
          <div className={styles.tableWrapper}>
            {listLoading ? (
              <div className={styles.empty}>Carregando...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Criado em</th>
                    <th>Link</th>
                    <th>Responsável</th>
                    <th>Espaço atual</th>
                    <th>Espaço adicional</th>
                    <th>Remover em</th>
                    <th>Situação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td className={styles.empty} colSpan={8}>Nenhum registro</td></tr>
                  ) : items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.criadoEm}</td>
                      <td>
                        {it.linkChamado?.startsWith('http') ? (
                          <a className={styles.link} href={it.linkChamado} target="_blank" rel="noreferrer">Chamado</a>
                        ) : (
                          it.linkChamado
                        )}
                      </td>
                      <td>{it.responsavel}</td>
                      <td>{it.espacoAtual}</td>
                      <td>{it.espacoAdicional}</td>
                      <td>{it.dataRemocao}</td>
                      <td>{it.situacao}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className={styles.submit} onClick={() => handleMarkRemoved(it)} disabled={it.situacao === 'Removido'}>
                            Marcar removido
                          </button>
                          <button className={styles.submit} onClick={() => startEdit(it)}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || (session.role !== 'analyst' && session.role !== 'tax')) {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        admin: userData?.admin || false,
        profile: userData?.profile,
        can_ticket: userData?.can_ticket || false,
        can_phone: userData?.can_phone || false,
        can_chat: userData?.can_chat || false,
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
}


