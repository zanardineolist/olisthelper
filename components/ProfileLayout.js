import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from '../styles/ProfileAnalyst.module.css';

// Componente de Layout reutilizável para páginas de perfil
const ProfileLayout = ({ 
  children, 
  user, 
  title = "Perfil", 
  subtitle = "", 
  greeting = "",
  className = ""
}) => {
  const firstName = user?.name?.split(' ')[0] || '';
  
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Sistema de perfil e métricas de usuário" />
      </Head>

      <Navbar user={user} />

      <main className={`${styles.container} ${className}`}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>
            {greeting || `Olá, ${firstName}!`}
          </h1>
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </header>

        {/* Conteúdo dinâmico */}
        {children}
      </main>

      <Footer />
    </>
  );
};

// Componente para Card genérico
export const Card = ({ 
  title, 
  children, 
  className = "", 
  hover = true,
  onClick 
}) => {
  const cardClass = `${styles.profileCard} ${className} ${hover ? styles.hover : ''}`;
  
  return (
    <div className={cardClass} onClick={onClick}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      {children}
    </div>
  );
};

// Componente para Grid de métricas
export const MetricsGrid = ({ metrics, columns = 2 }) => {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`
  };

  return (
    <div className={styles.metricsGrid} style={gridStyle}>
      {metrics.map((metric, index) => (
        <div key={index} className={styles.metricCard}>
          <span className={styles.metricLabel}>{metric.label}</span>
          <span className={styles.metricValue}>{metric.value}</span>
          {metric.subtext && (
            <span className={styles.metricSubtext}>{metric.subtext}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// Componente para Sidebar
export const Sidebar = ({ children, className = "" }) => {
  return (
    <aside className={`${styles.sidebar} ${className}`}>
      {children}
    </aside>
  );
};

// Componente para Conteúdo Principal
export const MainContent = ({ children, className = "" }) => {
  return (
    <div className={`${styles.mainContent} ${className}`}>
      {children}
    </div>
  );
};

// Componente para Grid Principal
export const MainGrid = ({ children, className = "" }) => {
  return (
    <div className={`${styles.mainGrid} ${className}`}>
      {children}
    </div>
  );
};

// Componente para Loading
export const LoadingContainer = ({ children }) => {
  return (
    <div className={styles.loadingContainer}>
      {children || <div className="standardBoxLoader"></div>}
    </div>
  );
};

// Componente para estados vazios
export const EmptyState = ({ message, icon, action }) => {
  return (
    <div className={styles.noData}>
      {icon && <i className={icon} style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>}
      <p>{message}</p>
      {action && action}
    </div>
  );
};

export default ProfileLayout; 