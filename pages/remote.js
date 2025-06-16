import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { useLoading } from '../components/LoadingIndicator';
import RegisterAccess from '../components/RegisterAccess';
import MyAccessRecords from '../components/MyAccessRecords';
import AllAccessRecords from '../components/AllAccessRecords';
import styles from '../styles/Remote.module.css';

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const { loading: routerLoading } = useLoading();

  // Definir tabs baseadas no role do usuário
  const getTabs = () => {
    if (user.role === 'support+') {
      return [
        { id: 'register', label: 'Registrar Acesso', icon: 'fa-plus-circle' },
        { id: 'my-records', label: 'Meus Registros', icon: 'fa-list-alt' }
      ];
    } else if (user.role === 'super') {
      return [
        { id: 'all-records', label: 'Todos os Registros', icon: 'fa-database' }
      ];
    }
    return [];
  };

  const tabs = getTabs();

  const handleTabChange = (tabIndex) => {
    setCurrentTab(tabIndex);
  };

  const renderTabContent = () => {
    if (user.role === 'support+') {
      switch (currentTab) {
        case 0:
          return <RegisterAccess user={user} />;
        case 1:
          return <MyAccessRecords user={user} />;
        default:
          return <RegisterAccess user={user} />;
      }
    } else if (user.role === 'super') {
      return <AllAccessRecords user={user} currentTab={currentTab} />;
    }
    return null;
  };

  return (
    <Layout user={user}>
      <Head>
        <title>Acesso Remoto - Olist Helper</title>
        <meta name="description" content="Gestão de acessos remotos" />
      </Head>

      <div className={`${styles.container} ${routerLoading ? styles.blurred : ''}`}>
        <main className={styles.main}>
          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <nav className={styles.tabsNav}>
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${currentTab === index ? styles.active : ''}`}
                  onClick={() => handleTabChange(index)}
                >
                  <i className={`fa-solid ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {renderTabContent()}
          </div>
        </main>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !['support+', 'super'].includes(session.role)) {
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
        email: session.user.email,
      },
    },
  };
}
