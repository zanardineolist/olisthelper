import MessageCard from './MessageCard';
import styles from '../../styles/MessageList.module.css';

export default function MessageList({ messages, user, onMessageDeleted, onMessageLiked }) {
  if (!messages.length) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma mensagem encontrada</p>
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
            onDeleted={onMessageDeleted}
            onLiked={onMessageLiked}
          />
        ))}
      </div>
    </div>
  );
}