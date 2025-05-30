import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaMagic } from 'react-icons/fa';
import styles from '../styles/SharedMessages.module.css';

const MessageActions = ({ message, user, onToggleFavorite, onCopy, onEdit, onDelete, onGeminiSuggestion }) => {
  const isAuthor = message.user_id === user.id;

  return (
    <div className={styles.actions}>
      {/* Botão de Favoritar */}
      <button
        onClick={() => onToggleFavorite(message.id)}
        className={styles.favoriteButton}
        title="Favoritar"
      >
        {message.isFavorite ? (
          <FaHeart className={styles.favoriteIcon} />
        ) : (
          <FaRegHeart />
        )}
        {message.favorites_count > 0 && (
          <span className={styles.favoriteCount}>{message.favorites_count}</span>
        )}
      </button>

      {/* Botão de Copiar */}
      <button
        onClick={() => onCopy(message.content, message.id)}
        className={styles.copyButton}
        title="Copiar"
      >
        <FaCopy />
        {message.copy_count > 0 && (
          <span className={styles.copyCount}>{message.copy_count}</span>
        )}
      </button>

      {/* Ações exclusivas do autor */}
      {isAuthor && (
        <>
          {/* Botão de Editar */}
          <button
            onClick={() => onEdit(message)}
            className={styles.editButton}
            title="Editar"
          >
            <FaEdit />
          </button>

          {/* Botão de Excluir */}
          <button
            onClick={() => onDelete(message.id)}
            className={styles.deleteButton}
            title="Excluir"
          >
            <FaTrash />
          </button>

          {/* Botão de Melhorar com IA */}
          <button
            onClick={() => onGeminiSuggestion(message.id, message.content)}
            className={styles.geminiButton} 
            title="Melhorar com IA"
          >
            <FaMagic />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageActions;
