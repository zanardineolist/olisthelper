import React, { useContext } from 'react';
import MessageContext from './MessageContext';
import MessageCard from './MessageCard';
import Pagination from '../ui/Pagination';
import styles from '../../styles/SharedMessages.module.css';

const MessageList = () => {
  const { 
    messages, 
    separateMessages, 
    currentPage, 
    totalPages, 
    setCurrentPage 
  } = useContext(MessageContext);

  const { popular, regular } = separateMessages(messages);

  return (
    <div className={styles.messageListContainer}>
      {/* Seção de Mensagens Populares */}
      {popular.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.popularBadge}>⭐</span>
            Mensagens Populares
          </h2>
          <div className={styles.messageGrid}>
            {popular.map(message => (
              <MessageCard key={message.id} message={message} isPopular={true} />
            ))}
          </div>
        </div>
      )}

      {/* Seção de Mensagens Regulares */}
      <div className={styles.section}>
        {popular.length > 0 && <h2 className={styles.sectionTitle}>Todas as Mensagens</h2>}
        <div className={styles.messageGrid}>
          {regular.map(message => (
            <MessageCard key={message.id} message={message} isPopular={false} />
          ))}
        </div>
      </div>

      {/* Paginação */}
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onChangePage={setCurrentPage}
      />
    </div>
  );
};

export default MessageList;