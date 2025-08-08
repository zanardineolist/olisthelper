// pages/excecao-dados.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/Tools.module.css';
import Swal from 'sweetalert2';

export default function ExcecaoDadosPage({ user }) {
  const [form, setForm] = useState({
    linkChamado: '',
    responsavel: user?.name || '',
    espacoAtual: '',
    espacoAdicional: '',
    dataRemocao: '', // yyyy-MM-dd
    situacao: 'Liberado',
  });
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const loadList = async () => {
    try {
      setListLoading(true);
      const res = await fetch('/api/excecao-dados/list');
      if (!res.ok) throw new Error('Falha ao carregar lista');
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.linkChamado || !form.responsavel || !form.dataRemocao || !form.situacao) {
      Swal.fire({ icon: 'error', title: 'Preencha os campos obrigatórios' });
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
      Swal.fire({ icon: 'success', title: 'Registrado com sucesso', timer: 1500, showConfirmButton: false });
      setForm({
        linkChamado: '',
        responsavel: user?.name || '',
        espacoAtual: '',
        espacoAdicional: '',
        dataRemocao: '',
        situacao: 'Liberado',
      });
      loadList();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Erro ao registrar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Exceção de Dados</title>
      </Head>
      <div className={styles.container}>
        <h2>Exceção de Dados</h2>
        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Link do chamado (A)</label>
            <input name="linkChamado" value={form.linkChamado} onChange={handleChange} placeholder="https://..." required />
          </div>
          <div className={styles.formGroup}>
            <label>Responsável (B)</label>
            <input name="responsavel" value={form.responsavel} onChange={handleChange} required />
          </div>
          <div className={styles.formGroupRow}>
            <div className={styles.formGroup}>
              <label>Espaço atual (C)</label>
              <input name="espacoAtual" value={form.espacoAtual} onChange={handleChange} placeholder="Ex.: 15 GB" />
            </div>
            <div className={styles.formGroup}>
              <label>Espaço adicional (D)</label>
              <input name="espacoAdicional" value={form.espacoAdicional} onChange={handleChange} placeholder="Ex.: +10 GB" />
            </div>
          </div>
          <div className={styles.formGroupRow}>
            <div className={styles.formGroup}>
              <label>Data que será removido (E)</label>
              <input type="date" name="dataRemocao" value={form.dataRemocao} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Situação (F)</label>
              <select name="situacao" value={form.situacao} onChange={handleChange}>
                <option value="Liberado">Liberado</option>
                <option value="Removido">Removido</option>
              </select>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>

        <div className={styles.list}>
          <h3>Histórico</h3>
          {listLoading ? (
            <div>Carregando...</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Link</th>
                    <th>Responsável</th>
                    <th>Espaço atual</th>
                    <th>Espaço adicional</th>
                    <th>Remover em</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={6}>Nenhum registro</td></tr>
                  )}
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.linkChamado?.startsWith('http') ? (
                          <a href={it.linkChamado} target="_blank" rel="noreferrer">Chamado</a>
                        ) : (
                          it.linkChamado
                        )}
                      </td>
                      <td>{it.responsavel}</td>
                      <td>{it.espacoAtual}</td>
                      <td>{it.espacoAdicional}</td>
                      <td>{it.dataRemocao}</td>
                      <td>{it.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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


