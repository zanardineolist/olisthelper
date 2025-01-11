import MessageCard from './MessageCard';
import styles from '../../styles/MessageList.module.css';

export default function MessageList({ messages, user, onMessageDeleted, onMessageLiked, onMessageEdit }) {
  if (!messages || messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma mensagem encontrada</p>
        <span className={styles.emptyStateSubtext}>
          Comece compartilhando uma nova mensagem!
        </span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            user={user}
            onDeleted={() => onMessageDeleted(message.id)}
            onMessageLiked={() => onMessageLiked(message.id)}
            onEdit={() => onMessageEdit(message)}
          />
        ))}
      </div>
    </div>
  );
}