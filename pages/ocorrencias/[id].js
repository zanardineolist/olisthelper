import React, { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import styles from '../../styles/OcorrenciaIndividual.module.css';
import { 
  Container,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  ContentCopy as ContentCopyIcon,
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';

// Função para formatar data do formato brasileiro para DD/MM/AA HH:MM
const formatBrazilianDate = (dateString) => {
  if (!dateString || dateString.trim() === '') return '';
  
  try {
    // Mapeamento de meses em português para números
    const monthMap = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
      'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    
    // Regex melhorado para capturar diferentes formatos
    // Formato: "24 de jul., 2025 21h39min57s" ou "1° de jan., 2025 10h15min30s"
    const regex = /(\d{1,2})[°]?\s+de\s+(\w{3})\.?,?\s+(\d{4})\s+(\d{1,2})h(\d{1,2})min(\d{1,2})?s?/i;
    const match = dateString.match(regex);
    
    if (!match) {
      return dateString;
    }
    
    const [, day, monthStr, year, hour, minute] = match;
    
    // Converter mês para número
    const month = monthMap[monthStr.toLowerCase()];
    if (!month) {
      return dateString;
    }
    
    // Formatar componentes
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month;
    const formattedYear = year.slice(-2); // Pegar últimos 2 dígitos do ano
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    
    return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
  } catch (error) {
    console.warn('Erro ao formatar data:', dateString, error);
    return dateString; // Retorna original em caso de erro
  }
};

// Função para gerar cor baseada no status
const getColorForStatus = (status) => {
  if (!status) return { 
    main: 'var(--neutral-color)', 
    bg: 'var(--neutral-bg)', 
    border: 'var(--neutral-color)'
  };
  
  switch (status.toLowerCase()) {
    case 'corrigido':
      return { 
        main: 'var(--excellent-color)', 
        bg: 'var(--excellent-bg)', 
        border: 'var(--excellent-color)'
      };
    case 'novo':
      return { 
        main: 'var(--warning-color)', 
        bg: 'var(--warning-bg)', 
        border: 'var(--warning-color)'
      };
    default:
      return { 
        main: 'var(--primary-color)', 
        bg: 'var(--primary-bg)', 
        border: 'var(--primary-color)'
      };
  }
};

// Função para gerar cor baseada em hash da string (para marcadores)
const getColorForMarcador = (marcador) => {
  if (!marcador) return { 
    main: 'var(--neutral-color)', 
    bg: 'var(--neutral-bg)', 
    border: 'var(--neutral-color)'
  };
  
  // Hash simples
  let hash = 0;
  for (let i = 0; i < marcador.length; i++) {
    hash = marcador.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Lista de cores usando variáveis do globals.css
  const colors = [
    { main: 'var(--primary-color)', bg: 'var(--primary-bg)', border: 'var(--primary-color)' },
    { main: 'var(--poor-color)', bg: 'var(--poor-bg)', border: 'var(--poor-color)' },
    { main: 'var(--excellent-color)', bg: 'var(--excellent-bg)', border: 'var(--excellent-color)' },
    { main: 'var(--good-color)', bg: 'var(--good-bg)', border: 'var(--good-color)' },
    { main: 'var(--warning-color)', bg: 'var(--warning-bg)', border: 'var(--warning-color)' },
    { main: 'var(--neutral-color)', bg: 'var(--neutral-bg)', border: 'var(--neutral-color)' },
    { main: 'var(--first-color)', bg: 'var(--first-bg)', border: 'var(--first-color)' },
    { main: 'var(--second-color)', bg: 'var(--second-bg)', border: 'var(--second-color)' },
    { main: 'var(--third-color)', bg: 'var(--third-bg)', border: 'var(--third-color)' }
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Função para renderizar múltiplos marcadores
const renderMarcadores = (marcadoresString) => {
  if (!marcadoresString || marcadoresString.trim() === '') return null;
  
  const marcadoresList = marcadoresString
    .split(/[\s\n,;]+/)
    .map(m => m.trim())
    .filter(m => m !== '');
  
  return marcadoresList.map((marcador, index) => {
    const marcadorColor = getColorForMarcador(marcador);
    return (
      <Chip 
        key={index}
        label={marcador} 
        variant="outlined" 
        className={styles.marcadorChip}
        size="small"
        style={{
          color: marcadorColor.main,
          borderColor: marcadorColor.border,
          backgroundColor: marcadorColor.bg,
          margin: '2px'
        }}
      />
    );
  });
};

export default function OcorrenciaPage({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [ocorrencia, setOcorrencia] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchOcorrencia();
    }
  }, [id]);

  const fetchOcorrencia = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/ocorrencias/${id}`);
      
      if (response.data && response.data.ocorrencia) {
        setOcorrencia(response.data.ocorrencia);
      } else {
        setError('Ocorrência não encontrada');
      }
    } catch (error) {
      console.error('Erro ao buscar ocorrência:', error);
      
      if (error.response?.status === 404) {
        setError('Ocorrência não encontrada');
      } else {
        setError('Erro ao carregar a ocorrência');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success('Informação copiada para a área de transferência!');
      },
      (err) => {
        console.error('Não foi possível copiar: ', err);
        toast.error('Falha ao copiar texto!');
      }
    );
  };

  const handleShareLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(
      () => {
        toast.success('🔗 Link da ocorrência copiado! Agora você pode compartilhar com sua equipe.');
      },
      (err) => {
        console.error('Não foi possível copiar link: ', err);
        toast.error('❌ Falha ao copiar o link. Tente novamente.');
      }
    );
  };

  const handleGoBack = () => {
    // Verificar se o referrer é da mesma origem e contém '/tools'
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    if (referrer && referrer.startsWith(currentOrigin) && referrer.includes('/tools')) {
      // Se veio de /tools, volta para lá com a âncora das ocorrências
      router.push('/tools#Ocorrencias');
    } else if (window.history.length > 1) {
      // Se há histórico de navegação, volta para a página anterior
      router.back();
    } else {
      // Fallback: vai para /tools com âncora das ocorrências
      router.push('/tools#Ocorrencias');
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <Head>
          <title>Carregando Ocorrência - Olist Helper</title>
        </Head>
        <Container maxWidth="lg" className={styles.container}>
          <div className={styles.loadingContainer}>
            <CircularProgress />
            <Typography variant="h6" style={{ marginTop: '1rem' }}>
              Carregando ocorrência...
            </Typography>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user}>
        <Head>
          <title>Erro - Olist Helper</title>
        </Head>
        <Container maxWidth="lg" className={styles.container}>
          <Alert severity="error" style={{ marginTop: '2rem' }}>
            {error}
          </Alert>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            style={{ marginTop: '1rem' }}
          >
            Voltar
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!ocorrencia) {
    return (
      <Layout user={user}>
        <Head>
          <title>Ocorrência não encontrada - Olist Helper</title>
        </Head>
        <Container maxWidth="lg" className={styles.container}>
          <Alert severity="warning" style={{ marginTop: '2rem' }}>
            Ocorrência não encontrada
          </Alert>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            style={{ marginTop: '1rem' }}
          >
            Voltar
          </Button>
        </Container>
      </Layout>
    );
  }

  const statusColor = getColorForStatus(ocorrencia.Status);

  return (
    <Layout user={user}>
      <Head>
        <title>{`Ocorrência ${id} - ${ocorrencia.Problema} - Olist Helper`}</title>
        <meta name="description" content={`Detalhes da ocorrência: ${ocorrencia.Problema}`} />
      </Head>
      
      <Container 
        maxWidth="lg" 
        className={styles.container}
        sx={{
          backgroundColor: 'var(--background-color)',
          color: 'var(--text-color)',
          minHeight: '100vh',
          paddingTop: '2rem',
          paddingBottom: '2rem'
        }}
      >
        {/* Header com navegação */}
        <div className={styles.pageHeader}>
          <div className={styles.navigationContainer}>
            <Button 
              variant="outlined" 
              onClick={handleGoBack}
              startIcon={<ArrowBackIcon />}
              size="small"
              className={styles.backButton}
            >
              Voltar
            </Button>
            
            <Tooltip title="Compartilhar link desta ocorrência">
              <Button
                variant="contained"
                onClick={handleShareLink}
                startIcon={<ShareIcon />}
                size="small"
                className={styles.shareButton}
              >
                Compartilhar
              </Button>
            </Tooltip>
          </div>

          <Typography 
            variant="h4" 
            component="h1" 
            className={styles.pageTitle}
          >
            {ocorrencia.Problema}
          </Typography>
          
          <Typography 
            variant="body2" 
            className={styles.pageDescription}
          >
            <strong>ID da Ocorrência:</strong> {id}
          </Typography>
        </div>

        {/* Conteúdo da ocorrência */}
        <Paper 
          className={styles.contentPaper} 
          elevation={2} 
        >
          {/* Header da ocorrência */}
          <div className={styles.modalHeader}>
            <div className={styles.creationChipContainer}>
              <Chip 
                icon={<ScheduleIcon fontSize="small" />}
                label={`Criado em: ${formatBrazilianDate(ocorrencia.DataHora)}`} 
                size="medium"
                className={styles.creationChip}
              />
            </div>
            
            <div className={styles.modalChips}>
              <div className={styles.marcadoresContainer}>
                {renderMarcadores(ocorrencia.Marcadores)}
              </div>
              {ocorrencia.Modulo && (
                <Chip 
                  label={ocorrencia.Modulo} 
                  size="small"
                  className={styles.modalChip}
                />
              )}
              <Chip 
                label={ocorrencia.Status || 'Novo'} 
                variant="outlined" 
                size="small"
                style={{
                  color: statusColor.main,
                  borderColor: statusColor.border,
                  backgroundColor: statusColor.bg
                }}
              />
              {ocorrencia.Status === 'Corrigido' && ocorrencia.DataCorrecao && (
                <Chip 
                  icon={<CheckCircleIcon fontSize="small" />}
                  label={`Corrigido em: ${formatBrazilianDate(ocorrencia.DataCorrecao)}`} 
                  size="small"
                  className={styles.correctionChip}
                />
              )}
            </div>
          </div>

          {/* Resumo */}
          {ocorrencia.Resumo && ocorrencia.Resumo.trim() !== '' && (
            <div className={styles.resumoBox}>
              <div className={styles.solutionHeader}>
                <div className={styles.sectionTitleWrapper}>
                  <DescriptionIcon className={styles.sectionIcon} />
                  <Typography variant="h6" component="h3" className={styles.sectionTitle}>
                    Resumo do Problema
                  </Typography>
                </div>
                <Tooltip title="Copiar resumo">
                  <IconButton 
                    onClick={() => handleCopyToClipboard(ocorrencia.Resumo)}
                    size="small"
                    className={styles.copyButton}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <Box className={styles.solutionScrollbox}>
                <Typography variant="body1" className={styles.solutionText}>
                  {ocorrencia.Resumo}
                </Typography>
              </Box>
            </div>
          )}

          {/* Classificação */}
          {(ocorrencia.Modulo && ocorrencia.Modulo.trim() !== '') || (ocorrencia.Motivo && ocorrencia.Motivo.trim() !== '') ? (
            <Box className={styles.observationBox}>
              <div className={styles.sectionTitleWrapper}>
                <InfoIcon className={styles.sectionIcon} />
                <Typography variant="h6" component="h3" className={styles.sectionTitle}>
                  Classificação dos casos
                </Typography>
              </div>
              {ocorrencia.Modulo && ocorrencia.Modulo.trim() !== '' && (
                <Typography variant="body1" className={styles.observationText}>
                  <strong>Módulo:</strong> {ocorrencia.Modulo}
                </Typography>
              )}
              {ocorrencia.Motivo && ocorrencia.Motivo.trim() !== '' && (
                <Typography variant="body1" className={styles.observationText}>
                  <strong>Motivo:</strong> {ocorrencia.Motivo}
                </Typography>
              )}
            </Box>
          ) : null}
        </Paper>
      </Container>
      
      {/* Toast notifications */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--box-color)',
            color: 'var(--text-color)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: 'var(--excellent-color)',
              secondary: 'var(--box-color)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--poor-color)',
              secondary: 'var(--box-color)',
            },
          },
        }}
      />
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
        // Incluir outros campos importantes se necessário
        profile: userData?.profile,
        can_ticket: userData?.can_ticket,
        can_phone: userData?.can_phone,
        can_chat: userData?.can_chat,
        // NOVAS PERMISSÕES MODULARES
        can_register_help: userData?.can_register_help || false,
        can_remote_access: userData?.can_remote_access || false,
      },
    },
  };
}