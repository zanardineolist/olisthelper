import Head from 'next/head';
import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { Tabs, Tab } from '@mui/material';
import { styled } from '@mui/system';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import ManageRecords from '../components/ManageRecords';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Manager.module.css';

// Componentes personalizados usando styled() para estilizar Tabs e Tab
const StyledTabs = styled(Tabs)({
  backgroundColor: '#333',
  borderRadius: '5px',
  marginBottom: '20px',
  marginTop: '20px', // Adicionando o margin-top desejado
  '& .MuiTabs-indicator': {
    backgroundColor: '#F0A028',
    height: '4px',
    borderRadius: '5px',
  },
});

const StyledTab = styled(Tab)({
  color: '#8b8b8b',
  fontSize: '16px',
  textTransform: 'none',
  transition: 'color 0.3s ease, background-color 0.3s ease',
  '&.Mui-selected': {
    color: '#F0A028',
    backgroundColor: '#444',
  },
});

export default function ManagerPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Head>
        <title>Gerenciar Dados</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <StyledTabs
          value={currentTab}
          onChange={handleTabChange}
          centered
        >
          <StyledTab label="Gerenciar Usuários" />
          <StyledTab label="Gerenciar Categorias" />
          {(user.role === 'analyst' || user.role === 'tax') && (
            <StyledTab label="Gerenciar Registros" />
          )}
        </StyledTabs>

        <div className={styles.tabContent}>
          {currentTab === 0 && <ManageUsers user={user} />}
          {currentTab === 1 && <ManageCategories user={user} />}
          {currentTab === 2 && (user.role === 'analyst' || user.role === 'tax') && (
            <ManageRecords user={user} />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['analyst', 'super', 'tax'].includes(session.role)) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const name = session.user?.name ?? 'Unknown';

  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
        name: name,
      },
    },
  };
}
