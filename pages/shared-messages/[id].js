import React, { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Typography, Button, Paper } from '@mui/material';
import { FaUser, FaClock, FaGlobe, FaTag, FaHeart, FaCopy, FaShare } from 'react-icons/fa';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import Layout from '../../components/Layout';
import LoadingIndicator from '../../components/ui/LoadingIndicator';
import styles from '../../styles/SharedMessage.module.css';

// Formatação de data completa no fuso horário brasileiro
function formatDateTimeBR(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Formatação relativa de tempo
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff} segundos atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutos atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} horas atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} dias atrás`;

  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function MessagePage({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchMessage();
    }
  }, [id]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shared-messages/public/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Mensagem não encontrada ou não é pública');
        } else {
          setError('Erro ao carregar mensagem');
        }
        return;
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Erro ao buscar mensagem:', error);
      setError('Erro ao carregar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      
      // Incrementar contador de cópias
      await fetch(`/api/shared-messages/${message.id}/copy`, {
        method: 'POST'
      });
      
      toast.success('Conteúdo copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('❌ Falha ao copiar o conteúdo. Tente novamente.');
    }
  };

  const handleShareMessage = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link da mensagem copiado!');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('❌ Falha ao copiar o link. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <Head>
          <title>Carregando Mensagem | Olist Helper</title>
        </Head>
        <Container maxWidth="md" style={{ marginTop: '2rem' }}>
          <LoadingIndicator />
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user}>
        <Head>
          <title>Erro | Olist Helper</title>
        </Head>
        <Container maxWidth="md" style={{ marginTop: '2rem' }}>
          <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>
              {error}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/tools#SharedMessages')}
              style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >
              Voltar para ferramentas
            </Button>
          </Paper>
        </Container>
      </Layout>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <Layout user={user}>
      <Head>
        <title>{message.title} | Olist Helper</title>
      </Head>
      
      <div className={styles.container}>
        {/* Cabeçalho da página */}
        <div className={styles.pageHeader}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/tools#SharedMessages')}
            style={{ 
              color: 'var(--color-primary)', 
              borderColor: 'var(--color-primary)',
              marginBottom: '1rem'
            }}
          >
            Voltar para ferramentas
          </Button>
          
          <Typography variant="h4" component="h1" style={{ color: 'var(--title-color)', marginBottom: '0.5rem' }}>
            {message.title}
          </Typography>
          
          <Typography variant="body2" style={{ color: 'var(--text-color)', opacity: 0.8 }}>
            <strong>ID da Mensagem:</strong> {id}
          </Typography>
        </div>

        <div className={styles.contentContainer}>
          <div className={styles.messageCard}>
            {/* Badge de mensagem pública */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div className={styles.publicBadge}>
                <FaGlobe />
                <span>Mensagem Pública</span>
              </div>
            </div>

            {/* Meta informações */}
            <div className={styles.metaInfo}>
              <div className={styles.metaItem}>
                <FaUser className={styles.metaIcon} />
                <span>{message.author_name}</span>
              </div>
              
              <div className={styles.metaItem}>
                <FaClock className={styles.metaIcon} />
                <span title={formatDateTimeBR(message.created_at)}>
                  {formatRelativeTime(message.created_at)}
                </span>
                {message.updated_at !== message.created_at && (
                  <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    (editado em {formatDateTimeBR(message.updated_at)})
                  </span>
                )}
              </div>

              <div className={styles.metaItem}>
                <FaHeart className={styles.metaIcon} style={{ color: 'var(--color-accent1)' }} />
                <span>{message.favorites_count || 0} favoritos</span>
              </div>
            </div>

            {/* Tags */}
            {message.tags && message.tags.length > 0 && (
              <div className={styles.tagsSection}>
                <div className={styles.tagsList}>
                  {message.tags.map((tag) => (
                    <div key={tag} className={styles.tag}>
                      <FaTag />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conteúdo da mensagem */}
            <div className={styles.contentSection}>
              <div className={styles.messageContent}>
                {message.content}
              </div>
            </div>

            {/* Ações */}
            <div className={styles.actions}>
              <div className={styles.actionButtons}>
                <button
                  onClick={handleCopyContent}
                  className={styles.actionButton}
                  title="Copiar conteúdo"
                >
                  <FaCopy />
                  <span>Copiar</span>
                </button>
                
                <button
                  onClick={handleShareMessage}
                  className={styles.actionButton}
                  title="Compartilhar mensagem"
                >
                  <FaShare />
                  <span>Compartilhar</span>
                </button>
              </div>

              {message.copy_count > 0 && (
                <div className={styles.copyCount}>
                  Copiado {message.copy_count} {message.copy_count === 1 ? 'vez' : 'vezes'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Autenticação e dados do usuário
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

  // Buscar dados completos do usuário incluindo permissões
  const { getUserWithPermissions } = await import('../../utils/supabase/supabaseClient');
  const userData = await getUserWithPermissions(session.id);
  
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        admin: userData?.admin || false,
        profile: userData?.profile,
        can_ticket: userData?.can_ticket,
        can_phone: userData?.can_phone,
        can_chat: userData?.can_chat,
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
}