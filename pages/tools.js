// pages/tools.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { Tabs, Tab, ThemeProvider, createTheme } from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TicketCounter from '../components/TicketCounter';
import SharedMessages from '../components/SharedMessages';
import CepIbgeValidator from '../components/CepIbgeValidator';
import ErrosComuns from '../components/ErrosComuns';
import SheetSplitter from '../components/SheetSplitter';
import styles from '../styles/Tools.module.css';
import Image from 'next/image';

const theme = createTheme({
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--tab-menu-bg)',
          borderRadius: '5px',
          marginBottom: '20px',
          marginTop: '20px',
        },
        indicator: {
          backgroundColor: 'var(--tab-menu-indicator)',
          height: '4px',
          borderRadius: '5px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--text-color)',
          fontSize: '16px',
          textTransform: 'none',
          transition: 'color 0.3s ease, background-color 0.3s ease',
          '&.Mui-selected': {
            color: 'var(--color-white)',
            backgroundColor: 'var(--color-primary)',
          },
        },
      },
    },
  },
});

export default function ToolsPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Verifica se o usuário tem acesso ao contador de chamados
  const hasTicketCounterAccess = ['support', 'support+', 'analyst', 'super', 'tax'].includes(user.role);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const hash = window.location.hash;
      
      // Ajuste da lógica para determinar a aba correta baseada no hash e permissões
      if (hash === '#TicketCounter' && hasTicketCounterAccess) {
        setCurrentTab(0);
      } else if (hash === '#SharedMessages') {
        setCurrentTab(hasTicketCounterAccess ? 1 : 0);
      } else if (hash === '#CepIbgeValidator') {
        setCurrentTab(hasTicketCounterAccess ? 2 : 1);
      } else if (hash === '#ErrosComuns') {
        setCurrentTab(hasTicketCounterAccess ? 3 : 2);
      } else if (hash === '#SheetSplitter') {
        setCurrentTab(hasTicketCounterAccess ? 4 : 3);
      } else {
        // Se não tiver hash ou o hash for inválido, mostra a primeira aba disponível para o usuário
        setCurrentTab(0);
      }
      setLoading(false);
    }, 500);
  }, [hasTicketCounterAccess]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    let hash = '';
    
    // Ajuste dos índices baseado no acesso ao contador de chamados
    if (hasTicketCounterAccess) {
      switch (newValue) {
        case 0:
          hash = '#TicketCounter';
          break;
        case 1:
          hash = '#SharedMessages';
          break;
        case 2:
          hash = '#CepIbgeValidator';
          break;
        case 3:
          hash = '#ErrosComuns';
          break;
        case 4:
          hash = '#SheetSplitter';
          break;
        default:
          break;
      }
    } else {
      switch (newValue) {
        case 0:
          hash = '#SharedMessages';
          break;
        case 1:
          hash = '#CepIbgeValidator';
          break;
        case 2:
          hash = '#ErrosComuns';
          break;
        case 3:
          hash = '#SheetSplitter';
          break;
        default:
          break;
      }
    }
    
    router.push(`${window.location.pathname}${hash}`, undefined, { shallow: true });
  };

  if (loading) {
    return (
      <div className="loaderOverlay">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ferramentas</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <ThemeProvider theme={theme}>
          <div className={styles.tabsContainer}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              {hasTicketCounterAccess && (
                <Tab label="Contador de Chamados" />
              )}
              <Tab label="Respostas Compartilhadas" />
              <Tab label="Validador CEP x IBGE" />
              <Tab label="Base de Erros" />
              <Tab label="Divisor de Planilhas" />
            </Tabs>
          </div>
        </ThemeProvider>

        <div className={styles.tabContent}>
          {currentTab === 0 && hasTicketCounterAccess && (
            <TicketCounter />
          )}
          {((currentTab === 1 && hasTicketCounterAccess) || (currentTab === 0 && !hasTicketCounterAccess)) && (
            <SharedMessages user={user} />
          )}
          {((currentTab === 2 && hasTicketCounterAccess) || (currentTab === 1 && !hasTicketCounterAccess)) && (
            <>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Validador CEP x IBGE</h1>
                <p className={styles.pageDescription}>
                  Ferramenta para verificar a correspondência entre a cidade retornada pelos Correios e a nomenclatura 
                  oficial do IBGE que é utilizada pela SEFAZ para validação de notas fiscais.
                </p>
              </div>
              <CepIbgeValidator />
              <div className={styles.infoCard}>
                <h2>Como utilizar</h2>
                <div className={styles.stepsList}>
                  <div className={styles.step}>
                    <span className={styles.stepNumber}>1</span>
                    <div className={styles.stepContent}>
                      <h3>Identifique o erro da SEFAZ</h3>
                      <p>
                        Quando o Seller tenta autorizar uma nota fiscal com nome de cidade incorreto, 
                        a SEFAZ retorna um erro como este:
                      </p>
                      <div className={styles.errorImageContainer}>
                        <img 
                          src="https://i.imgur.com/xWxipTb.jpeg" 
                          alt="Exemplo de erro da SEFAZ sobre nomenclatura de município" 
                          className={styles.errorImage}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.step}>
                    <span className={styles.stepNumber}>2</span>
                    <div className={styles.stepContent}>
                      <h3>Consulte o CEP</h3>
                      <p>
                        Copie o CEP utilizado na NF-e e cole no campo de busca da ferramenta. 
                        Clique em "Consultar" para obter a nomenclatura correta da cidade.
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.step}>
                    <span className={styles.stepNumber}>3</span>
                    <div className={styles.stepContent}>
                      <h3>Copie o nome oficial da cidade</h3>
                      <p>
                        Clique no botão "Copiar" ao lado do nome da cidade retornado pelo IBGE 
                        (destacado em azul na seção de resultados).
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.step}>
                    <span className={styles.stepNumber}>4</span>
                    <div className={styles.stepContent}>
                      <h3>Corrija na NF-e</h3>
                      <p>
                        No sistema Olist ERP, selecione a nomenclatura correta do IBGE no campo "Município" 
                        da NF-e e salve as alterações.
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.step}>
                    <span className={styles.stepNumber}>5</span>
                    <div className={styles.stepContent}>
                      <h3>Tente autorizar novamente</h3>
                      <p>
                        Após fazer as correções, tente autorizar a NF-e novamente.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.importantAlert}>
                  <h3>⚠️ Importante!</h3>
                  <p>
                    Caso o pedido de venda esteja preenchido com o endereço do cliente e um endereço de 
                    cobrança com o mesmo CEP, é necessário ajustar o município no pedido original e 
                    gerar uma nova NF-e. Caso contrário, o erro continuará ocorrendo.
                  </p>
                </div>
                
                <h2>Por que isso é importante?</h2>
                <p>
                  Ao emitir uma Nota Fiscal Eletrônica (NF-e), os dados do destinatário são validados pela SEFAZ, que 
                  utiliza a nomenclatura oficial do IBGE para os municípios brasileiros. Se o nome da cidade na NF-e 
                  não corresponder exatamente à nomenclatura oficial, a nota será rejeitada com o erro mostrado acima.
                </p>
                <p>
                  Divergências comuns incluem acentuação, artigos (do/da), abreviações e nomes históricos que 
                  foram alterados oficialmente.
                </p>
              </div>
            </>
          )}
          {((currentTab === 3 && hasTicketCounterAccess) || (currentTab === 2 && !hasTicketCounterAccess)) && (
            <ErrosComuns user={user} />
          )}
          {((currentTab === 4 && hasTicketCounterAccess) || (currentTab === 3 && !hasTicketCounterAccess)) && (
              <SheetSplitter />
          )}
        </div>
      </main>

      <Footer />
    </>
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

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: session.user.name,
      },
    },
  };
}