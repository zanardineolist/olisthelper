import React from 'react';
import { motion } from 'framer-motion';
import { FaGlobe, FaUser, FaHeart } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import styles from '../../styles/SharedMessages.module.css';

const MessageTabs = () => {
  const { currentTab, handleTabChange, totalMessages } = useMessageContext();

  const tabs = [
    { id: 0, label: 'Todas as Mensagens', icon: <FaGlobe /> },
    { id: 1, label: 'Minhas Mensagens', icon: <FaUser /> },
    { id: 2, label: 'Favoritas', icon: <FaHeart /> }
  ];

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        <nav className={styles.tabs} role="tablist" aria-label="Categorias de mensagens">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              role="tab"
              aria-selected={currentTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`${styles.tabButton} ${currentTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(tab.id)}
              whileHover={{ backgroundColor: "var(--color-primary-hover)" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
              
              {/* Contador de mensagens */}
              {currentTab === tab.id && totalMessages > 0 && (
                <motion.span 
                  className={styles.tabCounter}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {totalMessages}
                </motion.span>
              )}
            </motion.button>
          ))}
        </nav>
        
        {/* Animação da barra indicadora da tab ativa */}
        <div className={styles.tabIndicatorContainer}>
          <motion.div 
            className={styles.tabIndicator}
            initial={false}
            animate={{ 
              left: `${(100 / tabs.length) * currentTab}%`,
              width: `${100 / tabs.length}%`
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageTabs;