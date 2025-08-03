import React from 'react';
import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaMagic, FaShare } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import styles from '../../styles/shared-messages/Actions.module.css';

const MessageActions = ({ message }) => {
  const { 
    user,
    handleToggleFavorite, 
    handleCopyMessage, 
    handleEditMessage, 
    handleDeleteMessage, 
    handleGeminiSuggestion,
    handleShareMessage
  } = useMessageContext();

  // Verificar se o usuário atual é o autor da mensagem
  const isAuthor = message.user_id === user.id;

  return (
    <div className={styles.actionButtons} role="toolbar" aria-label="Ações para esta mensagem">
      {/* Botão de Favoritar */}
      <button
        onClick={() => handleToggleFavorite(message.id)}
        className={`${styles.actionButton} ${message.isFavorite ? styles.favoriteActive : ''}`}
        aria-label={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {message.isFavorite ? (
          <FaHeart />
        ) : (
          <FaRegHeart />
        )}
      </button>

      {/* Botão de Copiar */}
      <button
        onClick={() => handleCopyMessage(message.content, message.id)}
        className={styles.actionButton}
        aria-label="Copiar conteúdo"
        title="Copiar conteúdo"
      >
        <FaCopy />
        {message.copy_count > 0 && (
          <span className={styles.actionCount}>{message.copy_count}</span>
        )}
      </button>

      {/* Botão de Compartilhar - apenas para mensagens públicas */}
      {message.is_public && (
        <button
          onClick={() => handleShareMessage(message)}
          className={styles.actionButton}
          aria-label="Compartilhar mensagem"
          title="Compartilhar mensagem"
        >
          <FaShare />
        </button>
      )}

      {/* Ações exclusivas do autor */}
      {isAuthor && (
        <>
          {/* Botão de Editar */}
          <button
            onClick={() => handleEditMessage(message)}
            className={styles.actionButton}
            aria-label="Editar mensagem"
            title="Editar mensagem"
          >
            <FaEdit />
          </button>

          {/* Botão de Excluir */}
          <button
            onClick={() => handleDeleteMessage(message.id)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            aria-label="Excluir mensagem"
            title="Excluir mensagem"
          >
            <FaTrash />
          </button>

          {/* Botão de Melhorar com IA */}
          <button
            onClick={() => handleGeminiSuggestion(message.id, message.content)}
            className={`${styles.actionButton} ${styles.geminiButton}`}
            aria-label="Melhorar com IA"
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