import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { useLoading } from '../components/LoadingIndicator';
import RegisterAccess from '../components/RegisterAccess';
import MyAccessRecords from '../components/MyAccessRecords';
import AllAccessRecords from '../components/AllAccessRecords';
import { getUserPermissions } from '../utils/supabase/supabaseClient';
import styles from '../styles/Remote.module.css';

export default function RemotePage({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const { loading: routerLoading } = useLoading();

  // Definir tabs baseadas nas permissões do usuário (SISTEMA MODULAR)
  const getTabs = () => {
    const tabs = [];
    
    // Supervisores têm acesso a todas as funcionalidades
    if (user.role === 'super') {
      tabs.push(
        { id: 'register', label: 'Registrar Acesso', icon: 'fa-plus-circle' },
        { id: 'my-records', label: 'Meus Registros', icon: 'fa-list-alt' },
        { id: 'all-records', label: 'Todos os Registros', icon: 'fa-database' }
      );
    }
    // Usuários com permissão específica podem registrar e ver seus registros
    else if (user.can_remote_access) {
      tabs.push(
        { id: 'register', label: 'Registrar Acesso', icon: 'fa-plus-circle' },
        { id: 'my-records', label: 'Meus Registros', icon: 'fa-list-alt' }
      );
    }
    
    return tabs;
  };

  const tabs = getTabs();

  const handleTabChange = (tabIndex) => {
    setCurrentTab(tabIndex);
  };

  const renderTabContent = () => {
    const tab = tabs[currentTab];
    if (!tab) return null;

    switch (tab.id) {
      case 'register':
        return <RegisterAccess user={user} />;
      case 'my-records':
        return <MyAccessRecords user={user} />;
      case 'all-records':
        return <AllAccessRecords user={user} currentTab={currentTab} />;
      default:
        return <RegisterAccess user={user} />;
    }
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
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Buscar permissões atualizadas do usuário (SISTEMA MODULAR)
  const userPermissions = await getUserPermissions(session.id);
  if (!userPermissions) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // Verificar se tem permissão de acesso remoto OU é supervisor
  if (!userPermissions.can_remote_access && userPermissions.profile !== 'super') {
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
        ...userPermissions,
        id: session.id,
        name: session.user.name,
        email: session.user.email,
        // Garantir que role seja definido corretamente para o Sidebar
        role: userPermissions.profile || userPermissions.role || 'support',
      },
    },
  };
}
