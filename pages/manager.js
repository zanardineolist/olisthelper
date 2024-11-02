import Head from 'next/head';
import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { Tabs, Tab } from '@mui/material';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import ManageRecords from '../components/ManageRecords';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/Manager.module.css';

export default function ManagerPage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Head>
        <title>Gerenciamento Geral</title>
      </Head>

      <Navbar user={user} />

      <main className={styles.main}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Gerenciar Usuários" />
          <Tab label="Gerenciar Categorias" />
          {(user.role === 'analyst' || user.role === 'tax') && (
            <Tab label="Gerenciar Registros" />
          )}
        </Tabs>

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
