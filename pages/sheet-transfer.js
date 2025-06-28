// pages/sheet-transfer.js
import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/SheetTransfer.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function SheetTransfer({ user }) {
  const [novaPlanilhaId, setNovaPlanilhaId] = useState('');
  const [abaDestino, setAbaDestino] = useState('Dados Importados');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!novaPlanilhaId) {
      setErro('O ID da nova planilha é obrigatório');
      return;
    }
    
    setLoading(true);
    setErro(null);
    setResultado(null);
    
    try {
      const response = await fetch('/api/transfer-sheet-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          novaPlanilhaId,
          abaDestino
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao transferir dados');
      }
      
      setResultado(data);
    } catch (error) {
      console.error('Erro:', error);
      setErro(error.message || 'Ocorreu um erro ao transferir os dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Transferência de Planilha</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Transferir Dados da Planilha</h1>
          
          <div className={styles.infoBox}>
            <h3>Instruções:</h3>
            <p>Esta ferramenta transfere dados da aba "remoto" da planilha original para uma nova planilha Google Sheets.</p>
            <ol>
              <li>Crie uma nova planilha no Google Sheets</li>
              <li>Copie o ID da planilha da URL (a parte entre /d/ e /edit)</li>
              <li>Compartilhe a planilha com o email de serviço associado ao projeto (permissão de edição)</li>
              <li>Cole o ID abaixo e clique em "Transferir Dados"</li>
            </ol>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="novaPlanilhaId">ID da Nova Planilha:</label>
              <input
                type="text"
                id="novaPlanilhaId"
                value={novaPlanilhaId}
                onChange={(e) => setNovaPlanilhaId(e.target.value)}
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className={styles.input}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="abaDestino">Nome da Aba de Destino:</label>
              <input
                type="text"
                id="abaDestino"
                value={abaDestino}
                onChange={(e) => setAbaDestino(e.target.value)}
                placeholder="Ex: Dados Importados"
                className={styles.input}
              />
            </div>
            
            <button 
              type="submit" 
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Transferindo...' : 'Transferir Dados'}
            </button>
          </form>
          
          {erro && (
            <div className={styles.errorBox}>
              <h3>Erro:</h3>
              <p>{erro}</p>
            </div>
          )}
          
          {resultado && (
            <div className={styles.successBox}>
              <h3>Sucesso!</h3>
              <p>{resultado.message}</p>
              <p>Total de linhas transferidas: {resultado.totalLinhas}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const { getSession } = await import('next-auth/react');
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