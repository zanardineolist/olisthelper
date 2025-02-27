import React from 'react';
import { motion } from 'framer-motion';
import { FaGlobe, FaUser, FaHeart } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import styles from '../../styles/shared-messages/Tabs.module.css';

const MessageTabs = () => {
  const { currentTab, handleTabChange, totalMessages } = useMessageContext();

  const tabs = [
    { id: 0, label: 'Todas as Mensagens', icon: <FaGlobe /> },
    { id: 1, label: 'Minhas Mensagens', icon: <FaUser /> },
    { id: 2, label: 'Favoritas', icon: <FaHeart /> }
  ];

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabs} role="tablist" aria-label="Categorias de mensagens">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={currentTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`${styles.tabButton} ${currentTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => handleTabChange(tab.id)}
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
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MessageTabs;