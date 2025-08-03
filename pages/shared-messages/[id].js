import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Paper, Chip, IconButton, Snackbar, Alert, Box } from '@mui/material';
import { FaUser, FaClock, FaGlobe, FaTag, FaHeart, FaCopy, FaShare, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import LoadingIndicator from '../../components/ui/LoadingIndicator';

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

export default function MessagePage() {
  const router = useRouter();
  const { id } = router.query;
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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
      
      setSnackbarMessage('Conteúdo copiado para a área de transferência!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      setSnackbarMessage('Erro ao copiar conteúdo');
      setSnackbarOpen(true);
    }
  };

  const handleShareMessage = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setSnackbarMessage('Link da mensagem copiado!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      setSnackbarMessage('Erro ao copiar link');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <LoadingIndicator />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Link href="/tools" passHref>
            <a style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
              ← Voltar para ferramentas
            </a>
          </Link>
        </Paper>
      </Container>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <Container maxWidth="md" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        {/* Cabeçalho com navegação */}
        <Box mb={3}>
          <Link href="/tools" passHref>
            <a style={{ 
              color: 'var(--color-primary)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <FaArrowLeft size={14} />
              Voltar para ferramentas
            </a>
          </Link>
        </Box>

        <Paper elevation={3} style={{ padding: '2rem' }}>
          {/* Cabeçalho da mensagem */}
          <Box mb={3}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <Typography variant="h4" component="h1" style={{ color: 'var(--title-color)', flexGrow: 1 }}>
                {message.title}
              </Typography>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Chip
                  icon={<FaGlobe />}
                  label="Pública"
                  variant="outlined"
                  size="small"
                  style={{
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)'
                  }}
                />
              </div>
            </div>

            {/* Meta informações */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', color: 'var(--text-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaUser />
                <span>{message.author_name}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaClock />
                <span title={formatDateTimeBR(message.created_at)}>
                  {formatRelativeTime(message.created_at)}
                </span>
                {message.updated_at !== message.created_at && (
                  <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    (editado em {formatDateTimeBR(message.updated_at)})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaHeart style={{ color: 'var(--color-accent1)' }} />
                <span>{message.favorites_count || 0} favoritos</span>
              </div>
            </div>

            {/* Tags */}
            {message.tags && message.tags.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {message.tags.map((tag) => (
                    <Chip
                      key={tag}
                      icon={<FaTag />}
                      label={tag}
                      variant="outlined"
                      size="small"
                      style={{
                        color: 'var(--text-color)',
                        borderColor: 'var(--color-border)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </Box>

          {/* Conteúdo da mensagem */}
          <Box mb={3}>
            <Typography 
              variant="body1" 
              style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.6,
                color: 'var(--text-color)',
                backgroundColor: 'var(--box-color2)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              {message.content}
            </Typography>
          </Box>

          {/* Ações */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <div style={{ display: 'flex', gap: '1rem' }}>
              <IconButton
                onClick={handleCopyContent}
                style={{ color: 'var(--color-primary)' }}
                title="Copiar conteúdo"
              >
                <FaCopy />
              </IconButton>
              
              <IconButton
                onClick={handleShareMessage}
                style={{ color: 'var(--color-primary)' }}
                title="Compartilhar mensagem"
              >
                <FaShare />
              </IconButton>
            </div>

            {message.copy_count > 0 && (
              <Typography variant="caption" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                Copiado {message.copy_count} {message.copy_count === 1 ? 'vez' : 'vezes'}
              </Typography>
            )}
          </Box>
        </Paper>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success">
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
  );
}