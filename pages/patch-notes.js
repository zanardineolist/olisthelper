// pages/patch-notes.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaFileAlt, FaCalendarAlt, FaUser, FaTags, FaSpinner } from 'react-icons/fa';
import Layout from '../components/Layout';
import styles from '../styles/PatchNotes.module.css';

export default function PatchNotesPage({ user }) {
  const [patchNotes, setPatchNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatchNotes();
  }, []);

  const fetchPatchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patch-notes`);
      
      if (response.ok) {
        const data = await response.json();
        setPatchNotes(data.patchNotes || []);
      } else {
        setError('Erro ao carregar atualizações do sistema');
      }
    } catch (error) {
      console.error('Erro ao buscar patch notes:', error);
      setError('Erro ao carregar atualizações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTimeAgo = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const getStyleColor = (style) => {
    return style === 'informacao' ? 'var(--color-info)' : 'var(--color-warning)';
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Patch Notes - Atualizações do Sistema</title>
        <meta name="description" content="Acompanhe as últimas atualizações e melhorias do OlistHelper" />
      </Head>

      <main className={styles.mainContent}>
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <div className={styles.headerIcon}>
              <FaFileAlt />
            </div>
            <div className={styles.headerText}>
              <h1 className={styles.pageTitle}>Patch Notes</h1>
              <p className={styles.pageDescription}>
                Acompanhe as últimas atualizações, melhorias e novidades do OlistHelper
              </p>
            </div>
          </header>

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <FaSpinner className={styles.spinnerIcon} />
                <p>Carregando atualizações...</p>
              </div>
            ) : error ? (
              <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <button 
                  onClick={fetchPatchNotes}
                  className={styles.retryButton}
                >
                  Tentar novamente
                </button>
              </div>
            ) : patchNotes.length === 0 ? (
              <div className={styles.emptyContainer}>
                <FaFileAlt className={styles.emptyIcon} />
                <h3>Nenhuma atualização encontrada</h3>
                <p>Ainda não há atualizações do sistema para exibir.</p>
              </div>
            ) : (
              <div className={styles.patchNotesList}>
                {patchNotes.map((note, index) => (
                  <article key={note.id || index} className={styles.patchNoteCard}>
                    <header className={styles.noteHeader}>
                      <div className={styles.noteTitleContainer}>
                        <h2 className={styles.noteTitle}>{note.title}</h2>
                        {note.version && (
                          <span 
                            className={styles.noteType}
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            {note.version}
                          </span>
                        )}
                        {note.featured && (
                          <span 
                            className={styles.featuredBadge}
                          >
                            ⭐ Destaque
                          </span>
                        )}
                      </div>
                      <div className={styles.noteMeta}>
                        <div className={styles.metaItem}>
                          <FaCalendarAlt className={styles.metaIcon} />
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.timeAgo}>
                            {getTimeAgo(note.created_at)}
                          </span>
                        </div>
                      </div>
                    </header>

                    {/* Resumo */}
                    {note.summary && (
                      <div className={styles.noteSummary}>
                        <p>{note.summary}</p>
                      </div>
                    )}

                    {/* Conteúdo principal */}
                    <div className={styles.noteContent}>
                      <div 
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    </div>

                    {/* Informações adicionais */}
                    <footer className={styles.noteFooter}>
                      <div className={styles.authorInfo}>
                        <FaUser className={styles.authorIcon} />
                        <span>Por: {note.creator_name || 'Sistema'}</span>
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
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

  // Buscar dados completos do usuário
  const { getUserWithPermissions } = await import('../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);

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