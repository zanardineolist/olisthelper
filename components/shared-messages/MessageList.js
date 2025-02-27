import React from 'react';
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

  return (
    <div className={styles.messageListContainer}>
      {/* Seção de Mensagens Populares */}
      {popular.length > 0 && (
        <div className={styles.section}>
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
            {popular.map(message => (
              viewMode === 'grid' ? (
                <MessageCard key={message.id} message={message} isPopular={true} />
              ) : (
                <MessageRow key={message.id} message={message} isPopular={true} />
              )
            ))}
          </div>
        </div>
      )}

      {/* Seção de Mensagens Regulares */}
      <div className={styles.section}>
        {popular.length > 0 && (
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>Todas as Mensagens</span>
              <span className={styles.sectionCounter}>({regular.length})</span>
            </h2>
          </div>
        )}

        <div className={viewMode === 'grid' ? styles.messageGrid : styles.messageList}>
          {regular.map(message => (
            viewMode === 'grid' ? (
              <MessageCard key={message.id} message={message} isPopular={false} />
            ) : (
              <MessageRow key={message.id} message={message} isPopular={false} />
            )
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default MessageList;