// pages/cep-ibge.js
import Head from 'next/head';
import { getSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CepIbgeValidator from '../components/CepIbgeValidator';
import styles from '../styles/Tools.module.css';

export default function CepIbgePage({ user }) {
  return (
    <>
      <Head>
        <title>Validador CEP x IBGE | Olist Helper</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
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
          <ul>
            <li>Digite o CEP no campo de busca e clique em "Consultar"</li>
            <li>O sistema irá consultar a cidade nos Correios e também a nomenclatura oficial no IBGE</li>
            <li>Se houver divergência, use o nome oficial do IBGE para emissão da NF-e</li>
            <li>Você pode copiar o nome da cidade clicando no botão "Copiar" ao lado do nome</li>
          </ul>
          
          <h2>Por que isso é importante?</h2>
          <p>
            Ao emitir uma Nota Fiscal Eletrônica (NF-e), os dados do destinatário são validados pela SEFAZ, que 
            utiliza a nomenclatura oficial do IBGE para os municípios brasileiros. Se o nome da cidade na NF-e 
            não corresponder exatamente à nomenclatura oficial, a nota pode ser rejeitada com erro de validação.
          </p>
          <p>
            Por exemplo, a cidade conhecida como "Feira de Santana" nos Correios pode ser "Feira de Santana" 
            (sem o "de") no IBGE, e esta diferença sutil pode causar a rejeição da nota fiscal.
          </p>
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