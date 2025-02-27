import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import MessageCard from './MessageCard';
import MessageRow from './MessageRow';
import Pagination from '../ui/Pagination';
import styles from '../../styles/shared-messages/Layout.module.css';

const MessageList = () => {
  const { 
    messages, 
    separateMessages, 
    currentPage, 
    totalPages, 
    setCurrentPage,
    viewMode,
    POPULAR_THRESHOLD,
    totalMessages
  } = useMessageContext();

  const { popular, regular } = separateMessages(messages);

  // Animações para transição entre seções
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
        when: "beforeChildren"
      }
    },
    exit: { 
      opacity: 0,
      transition: { staggerChildren: 0.05, staggerDirection: -1 }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className={styles.messageListContainer}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Seção de Mensagens Populares */}
      {popular.length > 0 && (
        <motion.div 
          className={styles.section}
          variants={sectionVariants}
        >
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <FaStar className={styles.sectionIcon} />
              <span>Mensagens Populares</span>
              <span className={styles.sectionCounter}>({popular.length})</span>
            </h2>
            <div className={styles.sectionDescription}>
              Mensagens com pelo menos {POPULAR_THRESHOLD} favoritos
            </div>
          </div>

          <div className={viewMode === 'grid' ? styles.messageGrid : styles.messageList}>
            <AnimatePresence>
              {popular.map(message => (
                viewMode === 'grid' ? (
                  <MessageCard key={message.id} message={message} isPopular={true} />
                ) : (
                  <MessageRow key={message.id} message={message} isPopular={true} />
                )
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Seção de Mensagens Regulares */}
      <motion.div 
        className={styles.section}
        variants={sectionVariants}
      >
        {popular.length > 0 && (
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>Todas as Mensagens</span>
              <span className={styles.sectionCounter}>({regular.length})</span>
            </h2>
          </div>
        )}

        <div className={viewMode === 'grid' ? styles.messageGrid : styles.messageList}>
          <AnimatePresence>
            {regular.map(message => (
              viewMode === 'grid' ? (
                <MessageCard key={message.id} message={message} isPopular={false} />
              ) : (
                <MessageRow key={message.id} message={message} isPopular={false} />
              )
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Informações de Paginação */}
      {totalMessages > 0 && (
        <div className={styles.paginationInfo}>
          <span>
            Mostrando {messages.length} de {totalMessages} mensagens
          </span>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onChangePage={setCurrentPage}
        />
      )}
    </motion.div>
  );
};

export default MessageList;