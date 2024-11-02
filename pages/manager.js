import Head from 'next/head';
import { getSession } from 'next-auth/react';
import { useState } from 'react';
import { Tabs, Tab } from '@material-ui/core';
import ManageUsers from '../components/ManageUsers';
import ManageCategories from '../components/ManageCategories';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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

      <main>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Gerenciar Usuários" />
          <Tab label="Gerenciar Categorias" />
        </Tabs>

        <div style={{ marginTop: '20px' }}>
          {currentTab === 0 && <ManageUsers />}
          {currentTab === 1 && <ManageCategories />}
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
  return {
    props: {
      user: {
        ...session.user,
        role: session.role,
        id: session.id,
      },
    },
  };
}
